import { ScratchStorage } from './ScratchStorage';
import { AssetType } from './AssetType';
import { AssetId } from './Asset';
import { DataFormat } from './DataFormat';
export type ScratchGetRequest = {
    url: string;
} & RequestInit;
export type ScratchSendRequest = {
    url: string;
    withCredentials?: boolean;
    asset: string;
    storage: ScratchStorage;
    assetType: AssetType;
    assetId: AssetId;
    dataFormat: DataFormat;
} & RequestInit;
export interface Tool {
    get isGetSupported(): boolean;
    get(request: ScratchGetRequest): Promise<Uint8Array | null>;
    get isSendSupported(): boolean;
    send(request: ScratchSendRequest): Promise<string>;
}
