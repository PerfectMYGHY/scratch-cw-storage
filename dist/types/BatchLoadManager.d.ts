/** 加载器 */
type Fetcher = Promise<Uint8Array | string | null>;
/** 加载器获取器 */
type FetcherGetter = () => Fetcher;
/**
 * 分批加载管理器
 * @author PerfectMYGHY
 * @description 管理分批加载任务
 * @see BatchLoadTask
 */
declare class BatchLoadManager {
    /**
     * 等待执行任务队列
     */
    private queue;
    /**
     * 正在运行任务地图
     */
    private running_tasks;
    /**
     * 批大小
     */
    private batchSize;
    /**
     * 事件触发器
     */
    private eventEmitter;
    /**
     * 分批加载管理器构造函数
     * @param {number} batchSize 批次大小，默认为50
     */
    constructor(batchSize?: number);
    /**
     * 执行步骤
     * @param {FetcherGetter} fetcherGetter 加载器获取器
     */
    private step;
    /**
     * 添加任务
     * @param {FetcherGetter} fetcherGetter 加载器获取器
     * @returns {Promise<Uint8Array | string | null>} 等待器，等待任务完成并返回任务的返回值
     */
    addTask(fetcherGetter: FetcherGetter): Promise<Uint8Array | string | null>;
    /**
     * 等待所有任务完成
     * @returns {Promise<boolean>} 等待器，等待所有任务完成
     */
    waitAllDone(): Promise<boolean>;
}
export default BatchLoadManager;
