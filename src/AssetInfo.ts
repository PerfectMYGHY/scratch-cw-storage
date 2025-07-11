import {AssetType} from './AssetType';
import {AssetData, AssetId} from './Asset';
import {DataFormat} from './DataFormat';


type AssetInfo = {
    assetType: AssetType,
    assetId: AssetId,
    dataFormat: DataFormat,
    data?: AssetData
    assetName: string
};

export default AssetInfo;
