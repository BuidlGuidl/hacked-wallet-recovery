import { useCallback, useRef, useState } from "react";
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
      network: targetNetwork.network == "sepolia" ? Network.ETH_SEPOLIA : Network.ETH_MAINNET,
    }),
  );
  const { showError } = useShowError();

  // Cache for gas estimates and bundle hash
  const lastBundleHash = useRef<string>("");
  const lastEstimates = useRef<BigNumber[]>([]);
  const lastBaseFeeTimestamp = useRef<number>(0);
  const lastBaseFee = useRef<BigNumber>(BigNumber.from(0));

  // Function to generate a hash for the transaction bundle
  const getBundleHash = useCallback((txs: RecoveryTx[]): string => {
    return txs.map(tx => tx.toEstimate?.data || "").join("");
  }, []);

  const maxBaseFeeInFutureBlock = async () => {
    const now = Date.now();
    // Cache base fee for 1 block (~12 seconds)
    if (now - lastBaseFeeTimestamp.current < 12000 && !lastBaseFee.current.isZero()) {
      return lastBaseFee.current;
    }

    const block = await publicClient.getBlock();
    const maxBaseFee = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(BigNumber.from(block.baseFeePerGas), 3);

    lastBaseFee.current = maxBaseFee;
    lastBaseFeeTimestamp.current = now;
    return maxBaseFee;
  };

  const estimateTotalGasPrice = async (
    txs: RecoveryTx[],
    deleteTransaction: (id: number) => void,
    modifyTransactions: (txs: RecoveryTx[]) => void,
  ) => {
    try {
      const currentBundleHash = getBundleHash(txs);
      let estimates: BigNumber[] = [];

      // Check if we can use cached estimates
      if (currentBundleHash === lastBundleHash.current && lastEstimates.current.length === txs.length) {
        estimates = lastEstimates.current;
      } else {
        if (txs.length <= 3 && targetNetwork.network != "sepolia") {
          // Try to estimate the gas for the entire bundle
          const bundle = [...txs.map(tx => tx.toEstimate)];
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
        // Cache the new estimates and bundle hash
        lastEstimates.current = estimates;
        lastBundleHash.current = currentBundleHash;
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

  return {
    estimateTotalGasPrice,
  };
};
