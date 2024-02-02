import { useShowError } from "./useShowError";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { BigNumber } from "ethers";
import { parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { CoreTxToSign, RecoveryTx } from "~~/types/business";
import { BLOCKS_IN_THE_FUTURE } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

export const useGasEstimation = () => {
  const targetNetwork = getTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { showError } = useShowError();
  const estimateTotalGasPrice = async (
    txs: RecoveryTx[],
    deleteTransaction: (id: number) => void,
    modifyTransactions: (txs: RecoveryTx[]) => void,
  ) => {
    try {
      const estimates = await Promise.all(
        txs
          .filter(a => a)
          .map(async (tx, txId) => {
            const { to, from, data, value = "0" } = tx.toEstimate;
            const estimate = await publicClient
              .estimateGas({ account: from, to, data, value: parseEther(value) })
              .catch(e => {
                console.warn(
                  `Following tx will fail when bundle is submitted, so it's removed from the bundle right now. The contract might be a hacky one, and you can try further manipulation via crafting a custom call.`,
                );
                console.warn(tx);
                console.warn(e);
                deleteTransaction(txId);
                return BigNumber.from("0");
              });
            return BigNumber.from(estimate.toString());
          }),
      );
      const maxBaseFeeInFuture = await maxBaseFeeInFutureBlock();
      const priorityFee = BigNumber.from(10).pow(10);
      const txsWithGas: RecoveryTx[] = estimates.map((gas, index) => {
        const mainTx = txs[index] as RecoveryTx;
        // If the tx doesn't exist, skip adding gas properties
        if (!mainTx) return mainTx;
        const tx = Object.assign({}, mainTx.toEstimate) as CoreTxToSign;
        // Buffer the gas limit by 5%
        tx.gas = gas.mul(105).div(100).toString();
        // Set  type
        tx.type = "eip1559";
        // Set suggested gas properties
        tx.maxFeePerGas = maxBaseFeeInFuture.add(priorityFee).toString();
        tx.maxPriorityFeePerGas = priorityFee.toString();
        mainTx.toSign = tx;
        return mainTx;
      });
      // Set txs to contain gas suggestions
      if (txsWithGas && txsWithGas.length && txsWithGas[0]) {
        modifyTransactions(txsWithGas);
      }
      const totalGasCost = estimates
        .reduce((acc: BigNumber, val: BigNumber) => acc.add(val), BigNumber.from("0"))
        .mul(105)
        .div(100);
      const gasPrice = maxBaseFeeInFuture.add(priorityFee);
      return totalGasCost.mul(gasPrice);
    } catch (e) {
      showError(
        "Error estimating gas prices. Something may be wrong with one of the transactions. Check the console for more information on the problematic transaction.",
      );
      console.error(e);
      return BigNumber.from("0");
    }
  };

  const maxBaseFeeInFutureBlock = async () => {
    const blockNumberNow = await publicClient.getBlockNumber();
    const block = await publicClient.getBlock({ blockNumber: blockNumberNow });
    return FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
      BigNumber.from(block.baseFeePerGas),
      BLOCKS_IN_THE_FUTURE[targetNetwork.id],
    );
  };

  return {
    estimateTotalGasPrice,
  };
};
