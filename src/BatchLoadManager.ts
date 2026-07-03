import createEventEmitter, {EventEmitter} from './EventEmitter';

/** 加载器 */
type Fetcher = Promise<Uint8Array | null>;
/** 加载器获取器 */
type FetcherGetter = () => Fetcher;
/** 任务状态 */
type Status = 'pending' | 'running';
/** 等待器解析函数 */
type WaiterResolve = (data: Uint8Array | null) => void;
/** 等待器拒绝函数 */
type WaiterReject = (err: unknown) => void;
/** 等待器 */
type Waiter = (resolve: WaiterResolve, reject: WaiterReject) => void;

/**
 * 分批加载任务对象
 */
interface BatchLoadTask {
    /** 加载器获取器 */
    fetcherGetter: FetcherGetter;
    /** 加载器，若任务未执行，则为undefined */
    fetcher?: Fetcher;
    /** 任务状态 */
    status: Status;
    /** 等待器解析函数 */
    resolve: WaiterResolve;
    /** 等待器拒绝函数 */
    reject: WaiterReject;
}

/**
 * 分批加载管理器
 * @author PerfectMYGHY
 * @description 管理分批加载任务
 * @see BatchLoadTask
 */
class BatchLoadManager {
    /**
     * 等待执行任务队列
     */
    private queue: Array<BatchLoadTask>;

    /**
     * 正在运行任务地图
     */
    private running_tasks: Map<FetcherGetter, BatchLoadTask>;

    /**
     * 批大小
     */
    private batchSize: number;

    /**
     * 事件触发器
     */
    private eventEmitter: EventEmitter;

    /**
     * 分批加载管理器构造函数
     * @param {number} batchSize 批次大小，默认为50
     */
    constructor (batchSize: number = 50) {
        /**
         * 等待执行任务队列
         */
        this.queue = [];

        /**
         * 正在运行任务地图
         */
        this.running_tasks = new Map();

        /**
         * 批大小
         */
        this.batchSize = batchSize;

        /**
         * 事件触发器
         */
        this.eventEmitter = createEventEmitter();
    }

    /**
     * 执行步骤
     * @param {FetcherGetter} fetcherGetter 加载器获取器
     */
    private step (fetcherGetter: FetcherGetter) {
        let task;
        if (this.running_tasks.size !== 0) {
            task = this.running_tasks.get(fetcherGetter);
            if (task) {
                this.running_tasks.delete(fetcherGetter);
            }
        }
        if (this.running_tasks.size < this.batchSize && this.queue.length !== 0) {
            task = this.queue.shift();
            if (task) {
                const {
                    // eslint-disable-next-line no-shadow
                    fetcherGetter,
                    resolve,
                    reject
                } = task;
                this.running_tasks.set(fetcherGetter, {
                    fetcherGetter,
                    status: 'running',
                    fetcher: fetcherGetter().then(data => {
                        this.step(fetcherGetter);
                        return data;
                    })
                        .then(data => {
                            resolve(data);
                            return data;
                        })
                        .catch(err => {
                            reject(err);
                            return null;
                        }),
                    resolve,
                    reject
                });
            }
        }
        this.eventEmitter.emit('queueChange');
    }

    /**
     * 添加任务
     * @param {FetcherGetter} fetcherGetter 加载器获取器
     * @returns {Promise<Uint8Array | null>} 等待器，等待任务完成并返回任务的返回值
     */
    public addTask (fetcherGetter: FetcherGetter): Promise<Uint8Array | null> {
        const waiter: Waiter = (resolve, reject) => {
            if (this.running_tasks.size < this.batchSize) {
                this.running_tasks.set(fetcherGetter, {
                    fetcherGetter,
                    fetcher: fetcherGetter().then(data => {
                        this.step(fetcherGetter);
                        return data;
                    })
                        .then(data => {
                            resolve(data);
                            return data;
                        })
                        .catch(err => {
                            reject(err);
                            return null;
                        }),
                    status: 'running',
                    resolve,
                    reject
                });
            } else {
                this.queue.push({
                    fetcherGetter,
                    status: 'pending',
                    resolve,
                    reject
                });
            }
        };
        return new Promise(waiter);
    }

    /**
     * 等待所有任务完成
     * @returns {Promise<boolean>} 等待器，等待所有任务完成
     */
    waitAllDone (): Promise<boolean> {
        return new Promise(resolve => {
            const callback = () => {
                if (this.queue.length === 0 && this.running_tasks.size === 0) {
                    this.eventEmitter.off('queueChange', callback);
                    resolve(true);
                }
            };
            this.eventEmitter.on('queueChange', callback);
        });
    }
}

export default BatchLoadManager;
