import ERC20Svg from "../../../../../../public/assets/flashbotRecovery/coin.svg";
import EmptySvg from "../../../../../../public/assets/flashbotRecovery/empty.svg";
import TransactionsSvg from "../../../../../../public/assets/flashbotRecovery/transactions.svg";
import styles from "./autoDetectedAssets.module.css";
import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { RecoveryTx } from "~~/types/business";
import { extractAbiNinjaCallDetails, formatCalldataString } from "~~/utils/abiNinjaFlowUtils";

interface IAssetProps {
  onClick: () => void;
  image?: string;
  isSelected: boolean;
  tx?: RecoveryTx;
  isLoading: boolean;
  format?: string;
}
export const AutoDetectedAssetItem = ({ onClick, isSelected, tx, isLoading, image, format }: IAssetProps) => {
  const getSubtitleTitle = (): JSX.Element => {
    if (!tx) {
      return <></>;
    }
    let subtitleContent = "";
    if (tx.type === "erc721") {
      // @ts-ignore
      subtitleContent = `Token ID: ${tx.tokenId}`;
    } else if (tx.type === "erc1155") {
      // @ts-ignore
      subtitleContent = `Token IDs: ${tx.tokenIds.map(hexId => BigInt(hexId).toString()).join(", ")}`;
    } else if (tx.type === "erc20") {
      // @ts-ignore
      const formattedAmount = formatUnits(tx.amount, tx.decimals);
      subtitleContent = formattedAmount;
    } else if (tx.type === "custom") {
      subtitleContent = tx.info.split(" to ")[1];
    } else if (tx.type === "custom-abininja") {
      const { data } = extractAbiNinjaCallDetails(tx.info);
      return (
        <div className="flex gap-2">
          <p className="m-0">With data :</p>
          <div
            className="tooltip tooltip-bottom before:break-all before:whitespace-pre-wrap before:content-[attr(data-tip)]"
            data-tip={data}
          >
            <p className="m-0">{formatCalldataString(data)}</p>
          </div>
        </div>
      );
    }
    return <span>{subtitleContent}</span>;
  };

  const getTitle = () => {
    if (!tx) {
      return <></>;
    }
    let titleContent = "";
    if (tx.type === "erc20") {
      // @ts-ignore
      titleContent = tx.symbol;
    } else if (tx.type === "custom") {
      titleContent = tx.info.split(" to ")[0];
    } else if (tx.type === "custom-abininja") {
      const { contractAddress } = extractAbiNinjaCallDetails(tx.info);
      return (
        <div className="flex gap-2">
          <p className="m-0">Custom call to :</p>
          <Address size="sm" address={contractAddress} />
        </div>
      );
    } else {
      // @ts-ignore
      titleContent = tx.info;
    }
    return <h4>{titleContent}</h4>;
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className={`${isSelected ? "bg-base-200" : ""} ${styles.assetItem}  ${isLoading ? styles.loading : ""}`}
    >
      <div className={`${styles.logoContainer}`}>
        {format === "mp4" ? (
          <video
            className={styles.logo}
            width={60}
            height={60}
            autoPlay
            loop
            muted
            src={
              image
                ? image.includes("ipfs://")
                  ? image.replace("ipfs://", "https://ipfs.io/ipfs/")
                  : image
                : undefined
            }
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.logo}
            width={60}
            height={60}
            src={
              image
                ? image.includes("ipfs://")
                  ? image.replace("ipfs://", "https://ipfs.io/ipfs/")
                  : image
                : tx?.type === "erc20"
                ? ERC20Svg.src
                : tx?.type === "custom" || tx?.type === "custom-abininja"
                ? TransactionsSvg.src
                : EmptySvg.src
            }
            alt=""
          />
        )}
        {tx?.type === "erc20" ? <span className={styles.coinTitle}>ERC20</span> : ""}
      </div>

      <div className={`${styles.data} truncate max-w-[300px]`}>
        <h3 className="truncate">{getTitle()}</h3>
        <span className="truncate block">{getSubtitleTitle()}</span>
      </div>
    </motion.div>
  );
};
