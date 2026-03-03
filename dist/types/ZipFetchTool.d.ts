/**
 * 分段压缩资源获取工具
 * @description 向服务器发送准备请求资源请求。当服务器响应一个URL可以获取ZIP分段时，即可下载ZIP并解压得到资源
 * @author 郭泓毅
 */
import { ScratchSendRequest } from './Tool';
import JSZip from 'jszip';
import { ScratchStorage } from './ScratchStorage';
type StorageRequest = Request & {
    storage: ScratchStorage;
    asset: string;
};
type ZipSendList = Map<JSZip, string[]>;
declare class ZipFetchTool {
    private currentZipList;
    private assetsToZipList;
    private zipCache;
    private isFetchingZipList;
    private zipSendGenerator;
    private zipUploader;
    private zipListFetcher;
    private zipUploadingEvents;
    private zipUploadedAssets;
    private readonly storage;
    constructor(parent: ScratchStorage);
    get isGetSupported(): boolean;
    private get assetURL();
    private get getZipListGeneratorUrl();
    private getZipListFromAssets;
    private getAssetData;
    get({ asset, ...options }: StorageRequest): Promise<Uint8Array>;
    /**
     * 将AssetData转换为Uint8Array
     * @param {AssetData | undefined} value AssetData数据
     * @returns {Uint8Array} 转换后的数据
     */
    private static toUint8Array;
    /**
     * 根据给入的要上传的资源列表，生成Zip发送列表的具体实现
     * <p>
     * 和生成Zip获取列表一样，如果已经开始生成资源列表，其它再次执行将比对，如果要上传的资源和之前生成时的资源列表一致，这次执行将使用上次
     * 的生成的Promise，如果是第一次执行或上传新资源，则遍历各个资源（再ScratchStorage中肯定已加载），读取其数据，并计算大小，然后把当前
     * 数据加入一个缓存列表。如果这个缓存列表的所有资源数据大小超过一个闸值（目前是3MB），则将这些数据压缩为一个ZIP，使用JSZip工具，每个资源
     * 的文件名使用资源列表assets中数据值对应的资源名（其中包含扩展名），然后在已提前创建的返回值变量（类型为ZipSendList）中把JSZip对象的
     * 值设置为该ZIP中所压缩进的资源名称列表。然后清空缓存列表，继续重复向缓存列表添加数据、压缩进ZIP步骤，直至遍历完要上传的资源列表
     * ，最后在Promise中返回生成好的ZipSendList。
     * @param {Array<AssetInfo | string>} assets 要上传的资源列表
     * @returns {Promise<ZipSendList>} 生成的Zip发送列表
     */
    private _getSendZipListFromAssets;
    /**
     * 根据给入的要上传的资源列表，生成Zip发送列表。此方法将调用_getSendZipListFromAssets，但对于相同资源的多次调用，仅会执行
     * _getSendZipListFromAssets方法依次。
     * @param {Array<AssetInfo | string>} assets 要上传的资源列表
     * @returns {Promise<ZipSendList>} 生成的Zip发送列表
     */
    private getSendZipListFromAssets;
    get getZipUploaderUrl(): string;
    _upload(zipSendList: ZipSendList): Promise<void>;
    /**
     * 开启上传ZIP分段（如果未上传）并等待当前资源所在ZIP上传完毕。注意：不会等待所有ZIP分段上传完毕！
     * @param {zipSendList} zipSendList 要上传的ZIP列表
     * @param {string} asset 当前等待的资源名（文件名）
     * @returns {Promise<string>} 等待资源所在ZIP上传完毕
     */
    private uploadAndWait;
    get isSendSupported(): boolean;
    send({ asset, ...options }: ScratchSendRequest): Promise<string>;
}
export { ZipFetchTool as default };
