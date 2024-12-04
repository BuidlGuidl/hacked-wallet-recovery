import Image from "next/image";
import CloseSvg from "../../../../../../public/assets/flashbotRecovery/close.svg";
import { AbiNinjaFlow } from "./AbiNinjaFlow/AbiNinjaFlow";
import { BasicFlow } from "./BasicFlow/BasicFlow";
import { CustomFlow } from "./CustomFlow/CustomFlow";
import { RawFlow } from "./RawFlow/RawFlow";
import styles from "./manualAssetSelection.module.css";
import { ImpersonatorIframeProvider } from "@impersonator/iframe";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Tabs } from "~~/components/tabs/Tabs";
import { IWrappedRecoveryTx } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";

interface IProps {
  isVisible: boolean;
  close: () => void;
  hackedAddress: string;
  safeAddress: string;
  addAsset: (asset: IWrappedRecoveryTx) => void;
}
export const ManualAssetSelection = ({ isVisible, close, safeAddress, addAsset, hackedAddress }: IProps) => {
  const portalSelector = document.querySelector("#myportal");
  if (!portalSelector || !isVisible) {
    return <></>;
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`${styles.modalContainer}`}
    >
      <div className={`${styles.modal} bg-base-300`}>
        <span className={`${styles.close}`}>
          {" "}
          {!!close ? <Image src={CloseSvg} alt={""} onClick={() => close()} /> : <></>}
        </span>
        <div className={`${styles.modalContent}`}>
          <h3 className={`${styles.title}`}>{"Add assets manually"}</h3>
          <Tabs tabTitles={["Basic", "Custom", "Raw", "ABI Ninja"]}>
            {active => {
              const isBasic = active == 0;
              if (isBasic) {
                return <BasicFlow safeAddress={safeAddress} hackedAddress={hackedAddress} addAsset={addAsset} />;
              } else if (active == 1) {
                return <CustomFlow hackedAddress={hackedAddress} addAsset={item => addAsset(item)} />;
              } else if (active == 2) {
                return <RawFlow hackedAddress={hackedAddress} addAsset={item => addAsset(item)} />;
              }

              return (
                // Adding the provider here instead of _app.tsx so that it resets the states on each render
                // because @impersonator/iframe uses react context and does not give api to reset the state
                <ImpersonatorIframeProvider>
                  <AbiNinjaFlow addUnsignedTx={item => addAsset(item)} />
                </ImpersonatorIframeProvider>
              );
            }}
          </Tabs>
        </div>
      </div>
    </motion.div>,
    portalSelector,
  );
};
