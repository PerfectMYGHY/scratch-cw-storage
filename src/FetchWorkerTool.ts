import {Headers, applyMetadata} from './scratchFetch';
import {ScratchGetRequest, Tool} from './Tool';
import {assetHosts, assetFrom} from './AssetsHostInfo';
import BatchLoadManager from './BatchLoadManager';

interface DeferredJob {
    id: string,
    resolve: (buffer: ArrayBuffer) => void;
    reject: (error: unknown) => void;
    assetHostId: number;
    url: string;
    options?: RequestInit;
}

/**
 * Get and send assets with a worker that uses fetch.
 */
class PrivateFetchWorkerTool implements Tool {
    private _workerSupport: {fetch: boolean};
    private _supportError: unknown;
    private worker: Worker | null;
    private jobs: Record<string, DeferredJob | undefined>;
    private assetHosts: string[];
    private assetFrom: string;
    private manager: BatchLoadManager;

    constructor () {
        /**
         * What does the worker support of the APIs we need?
         * @type {{fetch:boolean}}
         */
        this._workerSupport = {
            fetch: typeof fetch !== 'undefined'
        };

        /**
         * A possible error occurred standing up the worker.
         * @type {Error?}
         */
        this._supportError = null;

        /**
         * The worker that runs fetch and returns data for us.
         * @type {Worker?}
         */
        this.worker = null;

        /**
         * A map of ids to fetch job objects.
         * @type {object}
         */
        this.jobs = {};

        /**
         * 资源主机列表
         * @type {string[]}
         */
        this.assetHosts = assetHosts;

        /**
         * 资源原本主机（用于替换）
         * @type {string}
         */
        this.assetFrom = assetFrom;

        /**
         * 分批加载管理器
         * @type {BatchLoadManager}
         */
        this.manager = new BatchLoadManager();

        try {
            if (this.isGetSupported) {
                // Yes, this is a browser API and we've specified `browser: false` in the eslint env,
                // but `isGetSupported` checks for the presence of Worker and uses it only if present.
                // Also see https://webpack.js.org/guides/web-workers/
                // eslint-disable-next-line no-undef
                const worker = new Worker(
                    /* webpackChunkName: 'fetch-worker' */ new URL('./FetchWorkerTool.worker', import.meta.url)
                );

                worker.addEventListener('message', ({data}) => {
                    if (data.support) {
                        this._workerSupport = data.support;
                        return;
                    }
                    for (const message of data) {
                        const job = this.jobs[message.id];
                        if (job) {
                            if (message.error) {
                                if (job.assetHostId < this.assetHosts.length) {
                                    job.assetHostId += 1;
                                    worker.postMessage({
                                        id: job.id,
                                        url: job.url.replace(this.assetFrom, this.assetHosts[job.assetHostId - 1]),
                                        options: {}
                                    });
                                    continue;
                                } else {
                                    job.reject(message.error);
                                }
                            } else {
                                job.resolve(message.buffer);
                            }
                            delete this.jobs[message.id];
                        }
                    }
                });

                this.worker = worker;
            }
        } catch (error) {
            this._supportError = error;
        }
    }

    /**
     * Is get supported?
     *
     * false if the environment does not workers, fetch, or fetch from inside a
     * worker. Finding out the worker supports fetch is asynchronous and will
     * guess that it does if the window does until the worker can inform us.
     * @returns {boolean} Is get supported?
     */
    get isGetSupported (): boolean {
        return (
            typeof Worker !== 'undefined' &&
            this._workerSupport.fetch &&
            !this._supportError
        );
    }

    /**
     * 使用 worker 通过 fetch 向服务器请求数据。
     * @param {{url:string}} reqConfig - 请求配置，包含要获取数据的 URL。
     * @param {{method:string}} options - 配置 fetch 的额外选项。
     * @returns {Promise.<Buffer|Uint8Array|null>} 解析为服务器返回的数据 Buffer。
     */
    get ({url, ...options}: ScratchGetRequest): Promise<Uint8Array | null> {
        const worker = this.worker;

        if (!worker) {
            return Promise.reject(new Error('The worker could not be initialized'));
        }

        return this.manager.addTask(() => new Promise<ArrayBuffer>((resolve, reject) => {
            // TODO: 使用 Scratch 标准的 ID 生成器……
            const id = Math.random().toString(16)
                .substring(2);
            const augmentedOptions = applyMetadata(
                Object.assign({method: 'GET'}, options)
            );
            // Fetch 规范中 options.headers 可以是：
            // 'Headers 对象、对象字面量或成对数组，用于设置请求头'
            // structured clone（postMessage）不支持 Headers 对象
            // 因此将其转换为成对数组，以便完整地传递给 worker
            if (augmentedOptions && augmentedOptions.headers instanceof Headers) {
                augmentedOptions.headers = Array.from(augmentedOptions.headers.entries());
            }

            let assetHostId = 1;
            if (this.jobs[id]) {
                assetHostId = this.jobs[id].assetHostId + 1;
            }

            worker.postMessage({
                id,
                url: url.replace(this.assetFrom, this.assetHosts[assetHostId - 1]),
                options: {}
            });
            this.jobs[id] = {
                id,
                resolve,
                reject,
                assetHostId,
                url,
                options: augmentedOptions
            };
        })
            /* eslint no-confusing-arrow: ['error', {'allowParens': true}] */
            .then(body => (body ? new Uint8Array(body) : null))) as Promise<Uint8Array | null>;
    }

    /**
     * Is sending supported? always false for FetchWorkerTool.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return false;
    }

    /**
     * Send data to a server.
     * @throws {Error} A not implemented error.
     */
    send (): never {
        throw new Error('Not implemented.');
    }

    private static _instance?: PrivateFetchWorkerTool;

    /**
     * Return a static PrivateFetchWorkerTool instance on demand.
     * @returns {PrivateFetchWorkerTool} A static PrivateFetchWorkerTool
     *   instance
     */
    static get instance () {
        if (!this._instance) {
            this._instance = new PrivateFetchWorkerTool();
        }
        return this._instance;
    }
}

/**
 * Get and send assets with a worker that uses fetch.
 */
export default class PublicFetchWorkerTool {
    private inner: PrivateFetchWorkerTool;

    constructor () {
        /**
         * Shared instance of an internal worker. PublicFetchWorkerTool proxies
         * it.
         * @type {PrivateFetchWorkerTool}
         */
        this.inner = PrivateFetchWorkerTool.instance;
    }

    /**
     * Is get supported?
     * @returns {boolean} Is get supported?
     */
    get isGetSupported (): boolean {
        return this.inner.isGetSupported;
    }

    /**
     * Request data from a server with a worker that uses fetch.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Buffer|Uint8Array|null>} Resolve to Buffer of data from server.
     */
    get (reqConfig: ScratchGetRequest): Promise<Uint8Array | null> {
        return this.inner.get(reqConfig);
    }

    /**
     * Is sending supported?
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return false;
    }

    /**
     * Send data to a server with a worker that uses fetch.
     * @throws {Error} A not implemented error.
     */
    send (): never {
        throw new Error('Not implemented.');
    }
}
