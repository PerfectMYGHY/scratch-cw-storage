/**
 * 分段压缩资源获取工具
 * @description 向服务器发送准备请求资源请求。当服务器响应一个URL可以获取ZIP分段时，即可下载ZIP并解压得到资源
 * @author PerfectMYGHY
 */
import {ScratchSendRequest} from './Tool';

const isNullResponse = response => (
    // can't access, eg. due to expired/missing project token
    response.status === 403 ||

    // assets does not exist
    // assets.scratch.mit.edu also returns 503 for missing assets
    response.status === 404 ||
    response.status === 503
);
import JSZip from 'jszip';
import {isEqual} from 'lodash';
import {ScratchStorage} from './ScratchStorage';
import createEventEmitter, {EventEmitter} from './EventEmitter';
import {scratchFetch} from './scratchFetch';
import {AssetData} from './Asset';
import AssetInfo from './AssetInfo';

type StorageRequest = Request & { storage: ScratchStorage; asset: string; };
type ZipList = {
    string: [string];
};
// 定义类型
type ErrorMap = Map<string, Error>;
type ZipSendList = Map<JSZip, string[]>;

global.ScratchStorage_onZipFetchToolError = createEventEmitter();

class ZipFetchTool {
    private currentZipList: ZipList | null;
    private assetsToZipList: (string | AssetInfo)[];
    private zipCache: Map<string, JSZip | Promise<Response>>;
    private isFetchingZipList: boolean;
    private zipSendGenerator: Promise<ZipSendList> | null;
    private zipUploader: Promise<void> | null;
    private zipListFetcher: Promise<ZipList> | null;
    private zipUploadingEvents: EventEmitter;
    private zipUploadedAssets: string[];
    private readonly storage: ScratchStorage;

    constructor (parent: ScratchStorage) {
        this.currentZipList = null;
        this.assetsToZipList = [];
        this.zipCache = new Map();
        this.isFetchingZipList = false;
        this.zipListFetcher = null;
        this.zipSendGenerator = null;
        this.zipUploader = null;
        this.zipUploadingEvents = createEventEmitter();
        this.zipUploadedAssets = [];
        this.storage = parent;
    }

    get isGetSupported (): boolean {
        return false;
    }

    private get assetURL (): string {
        return this.storage.assetHost;
    }

    private get getZipListGeneratorUrl (): string {
        return `${this.assetURL}/zip/list/generator/`;
    }

    private getZipListFromAssets (assets: string[]): Promise<ZipList> {
        if (isEqual(this.assetsToZipList, assets) && this.currentZipList !== null) {
            return new Promise(resolve => resolve(this.currentZipList as ZipList));
        }
        if (this.isFetchingZipList && this.zipListFetcher) {
            return this.zipListFetcher;
        }
        this.isFetchingZipList = true;
        return (this.zipListFetcher = scratchFetch(
            this.getZipListGeneratorUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(
                    {
                        assets
                    }
                )
            }
        )
            .then(result => {
                if (result.ok) return result;
                if (isNullResponse(result)) return Promise.reject(new Error('ZIP生成器响应空！'));
                return Promise.reject(result.status);
            })
            .then(response => response.json())
            .then(zipList => ((this.assetsToZipList = assets) && (this.currentZipList = zipList)))
            .then(zipList => {
                this.isFetchingZipList = false;
                return zipList;
            }));
    }

    private async getAssetData (zipList: ZipList, asset: string): Promise<Uint8Array> {
        let zipUrl: string | null = null;
        for (const [url, assets] of Object.entries(zipList)) {
            if (assets.includes(asset)) {
                zipUrl = url;
                break;
            }
        }

        if (!zipUrl) {
            return Promise.reject(new Error(`未找到资源所在的ZIP：${asset}`));
        }

        if (this.zipCache.has(zipUrl)) {
            if (this.zipCache.get(zipUrl) instanceof Promise) {
                await this.zipCache.get(zipUrl);
            }
            const waiter: Promise<null> = new Promise(resolve => {
                if (this.zipCache.get(zipUrl as string) instanceof JSZip) {
                    resolve(null);
                }
                setInterval(() => {
                    if (this.zipCache.get(zipUrl as string) instanceof JSZip) {
                        resolve(null);
                    }
                }, 10);
            });
            await waiter;
            const zip: JSZip = this.zipCache.get(zipUrl) as JSZip;
            const file = zip.file(asset);
            if (file) {
                return file.async('uint8array');
            }
            return Promise.reject(new Error(`在ZIP中未找到资源：${asset}`));

        }

        try {
            const _response = scratchFetch(`${this.assetURL}${zipUrl}`, {method: 'GET'});
            this.zipCache.set(zipUrl, _response);
            const response = await _response;
            if (!response.ok) {
                return Promise.reject(new Error(`下载ZIP失败：${asset}`));
            }
            const arrayBuffer = await response.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            this.zipCache.set(zipUrl, zip);

            const file = zip.file(asset);
            if (file) {
                return file.async('uint8array');
            }
            return Promise.reject(new Error(`在ZIP中未找到资源：${asset}`));

        } catch (error) {
            return Promise.reject(error);
        }
    }

    get ({asset, ...options}: StorageRequest): Promise<Uint8Array> {
        if (options.url && options.url.includes('backpack')) {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool只适合处理项目资源加速加载！不支持背包素材！'));
            });
        } else if (!(options.url && options.url.includes('asset'))) {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool只适合处理项目资源加速加载！当前素材类型不支持加载！'));
            });
        }
        if (this.storage === null || asset === null) {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool加载素材时缺少Storage或Asset ID！请使用恰当的Store！'));
            });
        }

        const waitAssetsOK: Promise<null> = new Promise((resolve, reject) => {
            try {
                if (this.storage.getCurrentProjectAssetsIsOK()) {
                    resolve(null);
                    return;
                }
                this.storage.eventEmitter.on('finish', () => {
                    resolve(null);
                });
            } catch (e) {
                reject(e);
            }
        });
        return new Promise((resolve, reject) => {
            waitAssetsOK
                .then(() => this.getZipListFromAssets(this.storage.getCurrentProjectAssets() as string[]))
                .then(zipList => this.getAssetData(zipList, asset))
                .then(data => resolve(data))
                .catch(err => {
                    global.ScratchStorage_onZipFetchToolError.emit('failed');
                    console.error(err);
                    reject(err);
                });
        });
    }

    /**
     * 将AssetData转换为Uint8Array
     * @param {AssetData | undefined} value AssetData数据
     * @returns {Uint8Array} 转换后的数据
     */
    private static toUint8Array (value: AssetData | undefined): Uint8Array {
        // eslint-disable-next-line no-undefined
        if (!value) {
            throw new Error('值未定义！'); // 或者根据你的需求处理错误
        }

        if (typeof value === 'string') {
            // 将字符串转换为 Uint8Array
            const encoder = new TextEncoder();
            return encoder.encode(value);
        }

        // 此时 TypeScript 知道 value 只能是 Uint8Array
        return value;
    }

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
    private _getSendZipListFromAssets (
        assets: Array<AssetInfo | string>
    ): Promise<ZipSendList> {
        const zipSendList: ZipSendList = new Map<JSZip, string[]>();
        const cache: { name: string; data: Uint8Array }[] = [];
        let currentSize = 0;
        const MAX_SIZE = 7.875 * 1024 * 1024; // 7.875 MB

        for (const {data, assetName} of assets as AssetInfo[]) {
            let assetData: Uint8Array;
            try {
                assetData = ZipFetchTool.toUint8Array(data);
            } catch (error) {
                console.error(error);
                continue; // 跳过当前迭代
            }
            const assetSize = assetData.byteLength;

            cache.push({name: assetName, data: assetData});
            currentSize += assetSize;

            if (currentSize > MAX_SIZE) {
                const zip = new JSZip();
                for (const item of cache) {
                    zip.file(item.name, item.data);
                }
                // const zipBlob = await zip.generateAsync({type: 'blob'});
                zipSendList.set(zip, cache.map(item => item.name));
                cache.length = 0;
                currentSize = 0;
            }
        }

        if (cache.length > 0) {
            const zip = new JSZip();
            for (const item of cache) {
                zip.file(item.name, item.data);
            }
            // const zipBlob = await zip.generateAsync({type: 'blob'});
            zipSendList.set(zip, cache.map(item => item.name));
        }

        return new Promise(resolve => resolve(zipSendList));
    }

    /**
     * 根据给入的要上传的资源列表，生成Zip发送列表。此方法将调用_getSendZipListFromAssets，但对于相同资源的多次调用，仅会执行
     * _getSendZipListFromAssets方法依次。
     * @param {Array<AssetInfo | string>} assets 要上传的资源列表
     * @returns {Promise<ZipSendList>} 生成的Zip发送列表
     */
    private getSendZipListFromAssets (
        assets: Array<AssetInfo | string>
    ): Promise<ZipSendList> {
        if (isEqual(this.assetsToZipList, assets) && this.zipSendGenerator) {
            return this.zipSendGenerator;
        }
        this.assetsToZipList = assets;
        this.zipSendGenerator = this._getSendZipListFromAssets(assets);
        return this.zipSendGenerator;
    }

    get getZipUploaderUrl (): string {
        return `${this.assetURL}/zip/uploader/`;
    }

    async _upload (zipSendList: ZipSendList): Promise<void> {
        const errors: ErrorMap = new Map<string, Error>();
        this.zipUploadingEvents.off('uploadedZip');
        for (const [zip, assetNames] of zipSendList.entries()) {
            try {
                const zipBlob = await zip.generateAsync({type: 'blob'});
                const response = await scratchFetch(this.getZipUploaderUrl, {
                    method: 'POST',
                    body: zipBlob
                });

                if (!response.ok) {
                    throw new Error(`上传失败，状态码：${response.status}`);
                }

                const data: {state: string, not_uploaded?: string[]} = await response.json();

                if (data.state === 'successfully') {
                    this.zipUploadedAssets.push(...assetNames);
                    this.zipUploadingEvents.emit('uploadedZip');
                } else if (data.state === 'failed' && data.not_uploaded) {
                    console.error('上传出错！上传失败列表：');
                    console.error(data.not_uploaded);
                    // 1. 将数组b转换为Set
                    const notUploaded: Set<string> = new Set(data.not_uploaded as string[]);
                    // 2. 过滤a中不属于b的元素
                    const updatedAssets = assetNames.filter(item => !notUploaded.has(item));
                    this.zipUploadedAssets.push(...updatedAssets);
                    this.zipUploadingEvents.emit('uploadedZip');
                    console.error('=========上面的数组中的资源将使用默认方法上传，接下来的数据仍使用当前上传器=========');
                    for (const asset of notUploaded) {
                        errors.set(asset, new Error(`上传资源${asset}失败！`));
                    }
                }
            } catch (error) {
                console.error('上传ZIP分段时出错：', error);
                throw error;
            }
        }
        this.zipUploader = null;
        if (errors.size > 0) {
            throw errors;
        }
    }

    /**
     * 开启上传ZIP分段（如果未上传）并等待当前资源所在ZIP上传完毕。注意：不会等待所有ZIP分段上传完毕！
     * @param {zipSendList} zipSendList 要上传的ZIP列表
     * @param {string} asset 当前等待的资源名（文件名）
     * @returns {Promise<string>} 等待资源所在ZIP上传完毕
     */
    private uploadAndWait (zipSendList: ZipSendList, asset: string): Promise<string> {
        if (!this.zipUploader) {
            this.zipUploader = this._upload(zipSendList);
        }
        return this.zipUploader.then(() => JSON.stringify({
            'status': 'ok',
            'content-name': asset
        }));
    }

    get isSendSupported (): boolean {
        return true;
    }

    send ({asset, ...options}: ScratchSendRequest): Promise<string> {
        if ((options.url && options.url.includes('backpack')) || this.storage.currentAssetFrom === 'backpack') {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool只适合处理项目资源加速加载！不支持背包素材！'));
            });
        } else if (!(options.url && options.url.includes('asset')) || this.storage.currentAssetFrom !== 'asset') {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool只适合处理项目资源加速加载！当前素材类型不支持加载！'));
            });
        }
        if (asset === null) {
            return new Promise((resolve, reject) => {
                reject(new Error('ZipFetchTool加载素材时缺少Storage或Asset ID！请使用恰当的Store！'));
            });
        }

        const waitAssetsOK: Promise<null> = new Promise((resolve, reject) => {
            try {
                if (this.storage.getCurrentProjectAssetsIsOK()) {
                    resolve(null);
                    return;
                }
                this.storage.eventEmitter.on('finish', () => {
                    resolve(null);
                });
            } catch (e) {
                reject(e);
            }
        });
        return new Promise((resolve, reject) => {
            waitAssetsOK
                .then(() => this.getSendZipListFromAssets(this.storage.getCurrentProjectAssets()))
                .then(zipSendList => this.uploadAndWait(zipSendList, asset))
                .then(result => resolve(result))
                .catch(err => {
                    global.ScratchStorage_onZipFetchToolError.emit('failed');
                    reject(err);
                });
        });
    }
}

export {
    ZipFetchTool as default
};
