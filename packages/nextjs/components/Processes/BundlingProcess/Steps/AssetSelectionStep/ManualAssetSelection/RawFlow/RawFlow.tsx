import { useState } from "react";
import styles from "../manualAssetSelection.module.css";
import { parseTransaction } from "viem";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { InputBase } from "~~/components/scaffold-eth";
import { IWrappedRecoveryTx } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";
import { CustomTx } from "~~/types/business";

interface IRawFlowProps {
  hackedAddress: string;
  addAsset: (asset: IWrappedRecoveryTx) => void;
}
export const RawFlow = ({ hackedAddress, addAsset }: IRawFlowProps) => {
  const [rawTx, setRawTx] = useState<string>("");
  const addRawTxToBasket = () => {
    const parsedTx = parseTransaction(rawTx as `0x${string}`);
    console.log(parsedTx);
    const { to, value, data = "0x" } = parsedTx;
    const customTx: CustomTx = {
      type: "custom",
      info: `Raw Transaction ${rawTx.substring(0, 40)}...`,
      toEstimate: {
        from: hackedAddress as `0x${string}`,
        to: to as `0x${string}`,
        value: value ? value.toString() : "0",
        data: (data as `0x${string}`) || "0x",
      },
    };
    addAsset({ tx: customTx });
  };

  const checkValid = () => {
    try {
      const parsed = parseTransaction(rawTx as `0x${string}`);
      if (parsed) {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  };
  return (
    <>
      <div className="mt-10" />
      <div className={styles.containerCustom}>
        <div className="mt-6" />
        <label className={styles.label} htmlFor="rawTx">
          Raw Transaction
        </label>
        <InputBase name="rawTx" value={rawTx as `0x{string}`} placeholder="0x02ef01820..." onChange={setRawTx} />
        <div className="mt-6" />
        <CustomButton type="btn-primary" text={"Add"} disabled={!checkValid()} onClick={() => addRawTxToBasket()} />
      </div>
    </>
  );
};
