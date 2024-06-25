import styles from "./transactionBundleStep.module.css";
import { motion } from "framer-motion";
import { Address } from "~~/components/scaffold-eth";
import { ERC20Tx, ERC721Tx, ERC1155Tx, RecoveryTx } from "~~/types/business";
import { extractAbiNinjaCallDetails, formatCalldataString } from "~~/utils/abiNinjaFlowUtils";

interface ITransactionProps {
  onDelete: () => void;
  tx?: RecoveryTx;
}
export const TransactionItem = ({ onDelete, tx }: ITransactionProps) => {
  const getTitle = () => {
    if (!tx) {
      return <h3></h3>;
    }
    if (tx.type == "erc721") {
      const typedTx = tx as ERC721Tx;
      return <h3>{`${typedTx.symbol} - ${typedTx.tokenId} `}</h3>;
    }
    if (tx.type == "erc1155") {
      const typedTx = tx as ERC1155Tx;
      return <h3>{`${typedTx.info} `}</h3>;
    }
    if (tx.type === "erc20") {
      const typedTx = tx as ERC20Tx;
      return <h3>{`${typedTx.amount} ${typedTx.symbol}`}</h3>;
    }
    if (tx.type === "custom-abininja") {
      const { contractAddress, data } = extractAbiNinjaCallDetails(tx.info);
      return (
        <>
          <div className="flex gap-2">
            <p className="m-0">Custom call to :</p>
            <Address size="sm" address={contractAddress} />
          </div>
          <div className="flex gap-2">
            <p className="m-0">With data :</p>
            <div
              className="tooltip tooltip-bottom before:break-all before:whitespace-pre-wrap before:content-[attr(data-tip)]"
              data-tip={data}
            >
              <p className="m-0">{formatCalldataString(data)}</p>
            </div>
          </div>
        </>
      );
    }

    return <h3>{tx.info}</h3>;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${styles.assetItem} bg-base-200 text-secondary-content`}
    >
      <div className={styles.data}>{getTitle()}</div>
      <div className={`${styles.close}`} onClick={onDelete}>
        X
      </div>
    </motion.div>
  );
};
