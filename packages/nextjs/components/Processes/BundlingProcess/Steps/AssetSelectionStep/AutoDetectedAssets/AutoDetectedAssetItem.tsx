import EmptySvg from "../../../../../../public/assets/flashbotRecovery/empty.svg";
import TransactionsSvg from "../../../../../../public/assets/flashbotRecovery/transactions.svg";

import ERC20Svg from "../../../../../../public/assets/flashbotRecovery/coin.svg";

import styles from "./autoDetectedAssets.module.css";
import { motion } from "framer-motion";
import { RecoveryTx } from "~~/types/business";

interface IAssetProps {
  onClick: () => void;
  image?: string;
  isSelected: boolean;
  tx?: RecoveryTx;
  isLoading: boolean;
}
export const AutoDetectedAssetItem = ({ onClick, isSelected, tx, isLoading, image }: IAssetProps) => {
  const getSubtitleTitle = () => {
    if (!tx) {
      return "";
    }
    if (tx.type == "erc721") {
      //@ts-ignore
      return `Token ID: ${tx.tokenId!}`;
    }
    if (tx.type == "erc1155") {
      //@ts-ignore
      return `Token IDs: ${tx.tokenIds.map(hexId => BigInt(hexId).toString())}`;
    }
    if (tx.type === "erc20") {
      //@ts-ignore
      return tx.amount;
    }
    if (tx.type === "custom") {
      //@ts-ignore
      return tx.info.split(" to ")[1];
    }
    return "";
  };

  const getTitle = () => {
    if (!tx) {
      return "";
    }
    if (tx.type === "erc20") {
      //@ts-ignore
      return tx.symbol;
    }
    if (tx.type === "custom") {
      //@ts-ignore
      return tx.info.split(" to ")[0];
    }
    return tx.info;
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={`${isSelected ? "bg-base-200" : ""} ${styles.assetItem}  ${isLoading ? styles.loading : ""}`}
    >
      <div className={`${styles.logoContainer}`}>
        <img
          className={styles.logo}
          width={60}
          height={60}
          src={image ? image : tx?.type === "erc20" ? ERC20Svg.src : tx?.type ==="custom" ? TransactionsSvg.src :EmptySvg.src}
          alt=""
        />
        {tx?.type === "erc20" ? <span className={styles.coinTitle}>ERC20</span> : ""}
      </div>
      <div className={`${styles.data}`}>
        <h3>{getTitle()}</h3>
        <span>{getSubtitleTitle()}</span>
      </div>
    </motion.div>
  );
};
