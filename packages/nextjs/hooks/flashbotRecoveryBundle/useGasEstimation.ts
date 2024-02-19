import { useState } from "react";
import { useShowError } from "./useShowError";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { Alchemy, DebugTransaction, Network } from "alchemy-sdk";
import { BigNumber } from "ethers";
import { parseEther } from "viem";
import { usePublicClient } from "wagmi";
import { CoreTxToSign, RecoveryTx } from "~~/types/business";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const useGasEstimation = () => {
  const targetNetwork = getTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [alchemy] = useState<Alchemy>(
    new Alchemy({
      apiKey: alchemyApiKey,
      network: targetNetwork.network == "goerli" ? Network.ETH_GOERLI : Network.ETH_MAINNET,
    }),
  );
  const { showError } = useShowError();
  const estimateTotalGasPrice = async (
    txs: RecoveryTx[],
    deleteTransaction: (id: number) => void,
    modifyTransactions: (txs: RecoveryTx[]) => void,
  ) => {
    try {
      let estimates: BigNumber[] = [];
      if (txs.length <= 3 && targetNetwork.network != "goerli") {
        // Try to estimate the gas for the entire bundle
        const bundle = [...txs.map(tx => tx.toEstimate)];
        // TODO: Add catching so that if the bundle hasn't changed we don't need to call Alchemy again
        const simulation = await alchemy.transact.simulateExecutionBundle(bundle as DebugTransaction[]);
        estimates = simulation.map((result, index) => {
          if (result.calls[0].error) {
            console.warn(
              `Following tx will fail when bundle is submitted, so it's removed from the bundle right now. The contract might be a hacky one, and you can try further manipulation via crafting a custom call.`,
            );
            console.warn(index, result);
            deleteTransaction(index);
            return BigNumber.from("0");
          }
          return BigNumber.from(result.calls[0].gasUsed);
        });
      } else {
        // Estimate each transaction individually
        estimates = await Promise.all(
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
      }
      const maxBaseFeeInFuture = await maxBaseFeeInFutureBlock();
      // Priority fee is 3 gwei
      const priorityFee = BigNumber.from(3).mul(1e9);
      const txsWithGas: RecoveryTx[] = estimates.map((gas, index) => {
        const mainTx = txs[index] as RecoveryTx;
        // If the tx doesn't exist, skip adding gas properties
        if (!mainTx) return mainTx;
        const tx = Object.assign({}, mainTx.toEstimate) as CoreTxToSign;
        // Buffer the gas limit by 15%
        tx.gas = gas.mul(115).div(100).toString();
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
        .mul(115)
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
    // Get the max base fee in 3 blocks to reduce the amount of eth spent on the transaction (possible to get priced out if blocks are full but unlikely)
    return FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(BigNumber.from(block.baseFeePerGas), 3);
  };

  return {
    estimateTotalGasPrice,
  };
};
