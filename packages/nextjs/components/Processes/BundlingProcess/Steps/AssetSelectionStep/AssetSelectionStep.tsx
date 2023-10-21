import { Dispatch, SetStateAction, useEffect, useState } from "react";
import Image from "next/image";
import styles from "./assetSelectionStep.module.css";
import { motion } from "framer-motion";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { AutoDetectedAssets } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/AutoDetectedAssets/AutoDetectedAssets";
import { ManualAssetSelection } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/ManualAssetSelection/ManualAssetSelection";
import { IWrappedRecoveryTx, useAutodetectAssets } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";
import BackSvg from "~~/public/assets/flashbotRecovery/back.svg";
import RefreshSvg from "~~/public/assets/flashbotRecovery/refresh.svg";
import { RecoveryTx } from "~~/types/business";

interface IProps {
  isVisible: boolean;
  hackedAddress: string;
  safeAddress: string;
  accountAssets: IWrappedRecoveryTx[];
  selectedAssetIndices: number[];
  setSelectedAssetIndices: Dispatch<SetStateAction<number[]>>;
  setAccountAssets: Dispatch<SetStateAction<IWrappedRecoveryTx[]>>;
  onBack: () => void;
  onSubmit: (txs: RecoveryTx[]) => void;
}
export const AssetSelectionStep = ({
  isVisible,
  onSubmit,
  selectedAssetIndices,
  setSelectedAssetIndices,
  setAccountAssets,
  onBack,
  accountAssets,
  hackedAddress,
  safeAddress,
}: IProps) => {
  const [isAddingManually, setIsAddingManually] = useState(false);
  const { getAutodetectedAssets } = useAutodetectAssets();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accountAssets.length > 0 || !isVisible) {
      return;
    }
    init();
  }, [isVisible]);

  const init = async (forceFetch: boolean = false) => {
    setIsLoading(true);
    const result = await getAutodetectedAssets(hackedAddress, safeAddress, forceFetch);
    if (!result) {
      return;
    }
    setAccountAssets(result);
    setIsLoading(false);
  };

  const reloadAssets = () => {
    setSelectedAssetIndices([]);
    init(true);
  };

  const onAddAssetsClick = () => {
    const txsToAdd = accountAssets.filter((_, i) => selectedAssetIndices.indexOf(i) != -1);
    onSubmit(txsToAdd.map(item => item.tx));
  };

  const selectAsset = (index: number) => {
    const currentIndex = selectedAssetIndices.indexOf(index);
    let newAssets: number[] = [];
    if (currentIndex === -1) {
      newAssets.push(index);
      newAssets.push(...selectedAssetIndices);
    } else {
      newAssets = selectedAssetIndices.filter(item => item !== index);
    }
    setSelectedAssetIndices(newAssets);
  };

  const onBackButton = () => {
    setAccountAssets([]);
    onBack();
  };
  if (!isVisible) {
    return <></>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.container}>
      <ManualAssetSelection
        safeAddress={safeAddress}
        hackedAddress={hackedAddress}
        isVisible={isAddingManually}
        close={() => setIsAddingManually(false)}
        addAsset={item => {
          setAccountAssets(current => [...current, item]);
          selectAsset(accountAssets.length);
          setIsAddingManually(false);
        }}
      />

      <div className={`flex items-center justify-space-between ${styles.titleContainer}`}>
        <Image
          src={BackSvg}
          alt={""}
          className="h-5 w-5"
          onClick={onBackButton}
        />
        <h2 className={`${styles.title}`}>Select your assets</h2>
        <Image
          src={RefreshSvg}
          alt={""}
          className="h-5 w-5"
          onClick={reloadAssets}
        />
      </div>

      <AutoDetectedAssets
        isLoading={isLoading}
        selectedAssets={selectedAssetIndices}
        selectAsset={selectAsset}
        accountAssets={accountAssets}
      />

      <CustomButton type="btn-accent" text={"Add Manually"} onClick={() => setIsAddingManually(true)} />
      <div className="m-2" />
      <CustomButton disabled={selectedAssetIndices.length === 0} type="btn-primary" text={"Continue"} onClick={onAddAssetsClick} />
    </motion.div>
  );
};
