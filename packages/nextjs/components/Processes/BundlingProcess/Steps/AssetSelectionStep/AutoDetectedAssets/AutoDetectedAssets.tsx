import styles from "./autoDetectedAssets.module.css";
import { AutoDetectedAssetItem } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/AutoDetectedAssets/AutoDetectedAssetItem";
import { IWrappedRecoveryTx } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";

interface IProps {
  isLoading: boolean;
  selectedAssets: number[];
  accountAssets: IWrappedRecoveryTx[];
  selectAsset: (index: number) => void;
}
export const AutoDetectedAssets = ({ isLoading, selectedAssets, selectAsset, accountAssets }: IProps) => {
  if (!isLoading && accountAssets.length === 0) {
    return (
      <div className={styles.assetList}>
        <span className={`${styles.noAssets} text-secondary-content`}>
          We can&apos;t find any assets in this wallet. Try manually adding them if you are certain they exist.
        </span>
      </div>
    );
  }
  return (
    <div className={styles.assetList}>
      {isLoading &&
        [1, 2, 3].map((_, i) => (
          <AutoDetectedAssetItem
            isLoading={true}
            isSelected={selectedAssets.indexOf(i) != -1}
            key={i}
            onClick={() => selectAsset(i)}
          />
        ))}
      {!isLoading &&
        accountAssets.map((item, i) => (
          <AutoDetectedAssetItem
            tx={item.tx}
            image={item.image}
            isLoading={false}
            isSelected={selectedAssets.indexOf(i) != -1}
            key={i}
            onClick={() => selectAsset(i)}
          />
        ))}
    </div>
  );
};
