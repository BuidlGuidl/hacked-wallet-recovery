import { Dispatch, SetStateAction } from "react";
import styles from "./bundlingProcess.module.css";
import { BigNumber } from "ethers";
import { motion } from "framer-motion";
import { useLocalStorage } from "usehooks-ts";
import { SideBar } from "~~/components/Processes/BundlingProcess/SideBar/SideBar";
import { AssetSelectionStep } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/AssetSelectionStep";
import { TransactionBundleStep } from "~~/components/Processes/BundlingProcess/Steps/TransactionBundleStep/TransactionBundleStep";
import { IWrappedRecoveryTx } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";
import { RecoveryTx } from "~~/types/business";
import { BundlingSteps } from "~~/types/enums";

interface IProps {
  isVisible: boolean;
  activeStep: BundlingSteps;
  safeAddress: string;
  hackedAddress: string;
  totalGasEstimate: BigNumber;
  unsignedTxs: RecoveryTx[];
  setHackedAddress: Dispatch<SetStateAction<string>>;
  setUnsignedTxs: Dispatch<SetStateAction<RecoveryTx[]>>;
  setIsOnBasket: Dispatch<SetStateAction<boolean>>;
  setTotalGasEstimate: Dispatch<SetStateAction<BigNumber>>;
  startRecovery: () => void;
}
export const BundlingProcess = ({
  isVisible,
  activeStep,
  hackedAddress,
  safeAddress,
  totalGasEstimate,
  unsignedTxs,
  setHackedAddress,
  setTotalGasEstimate,
  setIsOnBasket,
  setUnsignedTxs,
  startRecovery,
}: IProps) => {
  const [accountAssets, setAccountAssets] = useLocalStorage<IWrappedRecoveryTx[]>(`${hackedAddress}-accountAssets`, []);
  const [selectedAssetIndices, setSelectedAssetIndices] = useLocalStorage<number[]>(
    `${hackedAddress}-selectedAssetIndices`,
    [],
  );

  const stateTransitionFunctions = {
    fromAssetSelectionToHackedAddressInput: () => {
      setIsOnBasket(false);
      setSelectedAssetIndices([]);
      setUnsignedTxs([]);
      setHackedAddress("");
      localStorage.clear();
    },
    fromAssetSelectionToBundling: (txsToAdd: RecoveryTx[]) => {
      setUnsignedTxs(txsToAdd);
      setIsOnBasket(false);
    },
    fromBundlingToAssetSelection: (clearUnsignedTxs = false) => {
      let selectedIndices: number[] = [];
      if (clearUnsignedTxs) {
        setUnsignedTxs([]);
      } else {
        selectedIndices = unsignedTxs.map(tx =>
          accountAssets.findIndex(asset => asset.tx.toEstimate.data == tx.toEstimate.data),
        );
      }
      setSelectedAssetIndices(selectedIndices);
      setIsOnBasket(true);
    },
    fromBundlingToRecoveryPhase: startRecovery,
  };

  if (!isVisible) {
    return <></>;
  }

  return (
    <motion.div className={styles.bundling} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <SideBar activeStep={activeStep} hackedAddress={hackedAddress}/>
      <div className={`${styles.content} bg-base-300`}>
        <AssetSelectionStep
          isVisible={activeStep === BundlingSteps.ASSET_SELECTION}
          hackedAddress={hackedAddress}
          safeAddress={safeAddress}
          accountAssets={accountAssets}
          setAccountAssets={setAccountAssets}
          setSelectedAssetIndices={setSelectedAssetIndices}
          selectedAssetIndices={selectedAssetIndices}
          onBack={stateTransitionFunctions.fromAssetSelectionToHackedAddressInput}
          onSubmit={stateTransitionFunctions.fromAssetSelectionToBundling}
        />
        <TransactionBundleStep
          isVisible={activeStep === BundlingSteps.TX_BUNDLE}
          setTotalGasEstimate={setTotalGasEstimate}
          totalGasEstimate={totalGasEstimate}
          transactions={unsignedTxs}
          modifyTransactions={setUnsignedTxs}
          clear={() => stateTransitionFunctions.fromBundlingToAssetSelection(true)}
          onBack={stateTransitionFunctions.fromBundlingToAssetSelection}
          onSubmit={stateTransitionFunctions.fromBundlingToRecoveryPhase}
        />
      </div>
    </motion.div>
  );
};
