import {scratchFetch} from './scratchFetch';
import {ScratchGetRequest, ScratchSendRequest, Tool} from './Tool';
import {assetHosts, assetFrom} from './AssetsHostInfo';
import BatchLoadManager from './BatchLoadManager';

/**
 * @typedef {Request & {withCredentials: boolean}} ScratchSendRequest
 */

/**
 * Get and send assets with the fetch standard web api.
 */
export class FetchTool implements Tool {
    private assetHosts: string[];
    private assetFrom: string;
    private manager: BatchLoadManager;

    constructor () {
        this.assetHosts = assetHosts;
        this.assetFrom = assetFrom;
        this.manager = new BatchLoadManager();
    }

    /**
     * Is get supported?
     * Always true for `FetchTool` because `scratchFetch` ponyfills `fetch` if necessary.
     * @returns {boolean} Is get supported?
     */
    get isGetSupported (): boolean {
        return true;
    }

    /**
     * Request data from a server with fetch.
     * @param {Request} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Uint8Array?>} Resolve to Buffer of data from server.
     */
    get ({url, ...options}: ScratchGetRequest): Promise<Uint8Array | null> {
        const request = (times, resolve, reject): Promise<Uint8Array | null> => scratchFetch(url.replace(
            this.assetFrom, this.assetHosts[times]), Object.assign({method: 'GET'}, options))
            .then((result: Response) => {
                if (result.ok) return resolve(result.arrayBuffer().then(b => new Uint8Array(b)));
                if (result.status === 404) return resolve(null);
                if (times !== this.assetHosts.length - 1) {
                    return request(times + 1, resolve, reject);
                }
                return reject(result.status); // TODO: we should throw a proper error
            })
            .catch(err => {
                console.error('第', times + 1, '次尝试失败：', err);
                if (times !== this.assetHosts.length - 1) {
                    return request(times + 1, resolve, reject);
                }
                return reject(err);
            });
        return new Promise((resolve, reject) => {
            this.manager.addTask(() => new Promise((res, rej) => request(0, res, rej)))
            .then(data => {
                resolve(data);
            })
            .catch(err => {
                reject(err);
            });
        });
    }

    /**
     * Is sending supported?
     * Always true for `FetchTool` because `scratchFetch` ponyfills `fetch` if necessary.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return true;
    }

    /**
     * Send data to a server with fetch.
     * @param {ScratchSendRequest} reqConfig - Request configuration for data to send.
     * @returns {Promise.<string>} Server returned metadata.
     */
    send ({url, withCredentials = false, ...options}: ScratchSendRequest): Promise<string> {
        return scratchFetch(url, Object.assign({
            credentials: withCredentials ? 'include' : 'omit'
        }, options))
            .then(response => {
                if (response.ok) return response.text();
                return Promise.reject(response.status);
            });
    }
}
