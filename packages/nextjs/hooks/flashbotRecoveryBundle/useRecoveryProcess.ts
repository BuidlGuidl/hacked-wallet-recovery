import { useEffect, useState } from "react";
import { useShowError } from "./useShowError";
import { InfuraProvider } from "@ethersproject/providers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { BigNumber, ethers } from "ethers";
import { useInterval, useLocalStorage } from "usehooks-ts";
import { v4 } from "uuid";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { RecoveryTx } from "~~/types/business";
import { RecoveryProcessStatus } from "~~/types/enums";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

interface IStartProcessPops {
  safeAddress: string;
  modifyBundleId: (arg: string) => void;
  totalGas: BigNumber;
  hackedAddress: string;
  transactions: RecoveryTx[];
  currentBundleId: string;
}

const BLOCKS_IN_THE_FUTURE: { [i: number]: number } = {
  1: 7,
  5: 10,
};

const flashbotSigner = ethers.Wallet.createRandom();

export const useRecoveryProcess = () => {
  const targetNetwork = getTargetNetwork();
  const [flashbotsProvider, setFlashbotsProvider] = useState<FlashbotsBundleProvider>();
  const [infuraProvider, setInfuraProvider] = useState<InfuraProvider>();
  const [gasCovered, setGasCovered] = useState<boolean>(false);
  const [sentTxHash, setSentTxHash] = useLocalStorage<string>("sentTxHash", "");
  const [sentBlock, setSentBlock] = useLocalStorage<number>("sentBlock", 0);
  const [blockCountdown, setBlockCountdown] = useLocalStorage<number>("blockCountdown", 0);
  const { showError } = useShowError();

  const [stepActive, setStepActive] = useState<RecoveryProcessStatus>(RecoveryProcessStatus.INITIAL);
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { address } = useAccount();

  const { data: walletClient } = useWalletClient();
  const FLASHBOTS_RELAY_ENDPOINT = `https://relay${targetNetwork.network == "goerli" ? "-goerli" : ""}.flashbots.net/`;

  useEffect(() => {
    (async () => {
      if (!targetNetwork || !targetNetwork.blockExplorers) return;
      const infuraProvider = new ethers.providers.InfuraProvider(targetNetwork.id);
      setInfuraProvider(infuraProvider);
      setFlashbotsProvider(
        await FlashbotsBundleProvider.create(
          infuraProvider,
          flashbotSigner,
          FLASHBOTS_RELAY_ENDPOINT,
          targetNetwork.network == "goerli" ? "goerli" : undefined,
        ),
      );
    })();
  }, [targetNetwork.id]);

  useInterval(async () => {
    const isNotAbleToListenBundle = stepActive != RecoveryProcessStatus.LISTEN_BUNDLE || !sentTxHash || sentBlock == 0;
    try {
      if (isNotAbleToListenBundle) return;
      const finalTargetBlock = sentBlock + BLOCKS_IN_THE_FUTURE[targetNetwork.id];
      const currentBlock = parseInt((await publicClient.getBlockNumber()).toString());
      const blockDelta = finalTargetBlock - currentBlock;
      setBlockCountdown(blockDelta);

      if (blockDelta < 0) {
        showError(
          `The recovery has failed, To solve this error clean your wallet, remove all "Hacked Wallet Recovery RPC" and clear activity data`,
          true,
        );
        setSentBlock(0);
        setSentTxHash("");
        resetStatus();
        return;
      }
      const txReceipt = await publicClient.getTransactionReceipt({
        hash: sentTxHash as `0x${string}`,
      });
      if (txReceipt && txReceipt.blockNumber) {
        setStepActive(RecoveryProcessStatus.SUCCESS);
      }
      //   return;
      console.log("TXs not yet mined");
    } catch (e) {}
  }, 5000);

  const resetStatus = () => {
    setStepActive(RecoveryProcessStatus.INITIAL);
  };
  const validateBundleIsReady = (safeAddress: string) => {
    if (gasCovered) {
      setStepActive(RecoveryProcessStatus.GAS_PAID);
      return false;
    }

    ////////// Enforce switching to the safe address
    if (!address) {
      setStepActive(RecoveryProcessStatus.NO_CONNECTED_ACCOUNT);
      return false;
    } else if (address != safeAddress) {
      setStepActive(RecoveryProcessStatus.NO_SAFE_ACCOUNT);
      return false;
    }
    setStepActive(RecoveryProcessStatus.SWITCH_RPC_AND_PAY_GAS);
    return true;
  };

  const changeFlashbotNetwork = async () => {
    const newBundleUuid = v4();
    await addRelayRPC(newBundleUuid);
    return newBundleUuid;
  };

  const getEstimatedTxFees = async () => {
    const block = await infuraProvider!.getBlock("latest");
    if (block) {
      const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
        block.baseFeePerGas as BigNumber,
        10,
      ).toString();
      const priorityFee = BigNumber.from(10).pow(10).toString(); // 10 Gwei
      return { maxBaseFeeInFutureBlock, priorityFee };
    }
    return { maxBaseFeeInFutureBlock: "0", priorityFee: "0" };
  };

  const payTheGas = async (totalGas: BigNumber, hackedAddress: string) => {
    const { maxBaseFeeInFutureBlock, priorityFee } = await getEstimatedTxFees();
    await walletClient!.sendTransaction({
      to: hackedAddress as `0x${string}`,
      value: BigInt(totalGas.toString()),
      type: "eip1559",
      maxFeePerGas: BigInt(priorityFee) + BigInt(maxBaseFeeInFutureBlock),
      maxPriorityFeePerGas: BigInt(priorityFee),
      gas: 23000n,
    });
    setGasCovered(true);
  };

  const signRecoveryTransactions = async (
    hackedAddress: string,
    transactions: RecoveryTx[],
    currentBundleId: string,
    surpass: boolean = false,
  ) => {
    if (!surpass && !gasCovered) {
      showError("How did you come here without covering the gas fee first??");
      resetStatus();
      return;
    }

    ////////// Enforce switching to the hacked address
    if (address != hackedAddress) {
      setStepActive(RecoveryProcessStatus.SWITCH_TO_HACKED_ACCOUNT);
      return;
    }
    setStepActive(RecoveryProcessStatus.SIGN_RECOVERY_TXS);
    ////////// Sign the transactions in the basket one after another
    try {
      for (const tx of transactions) {
        if (tx.toSign) {
          // Numbers are stored as strings so we need to convert to BigInts
          const { to, from, data, type, maxFeePerGas, maxPriorityFeePerGas, gas } = tx.toSign;
          const readyToSignTx = {
            to,
            from,
            data,
            type,
            maxFeePerGas: BigInt(maxFeePerGas as string),
            maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas as string),
            gas: BigInt(gas as string),
          };
          console.log(readyToSignTx);
          await walletClient!.sendTransaction(readyToSignTx);
        }
      }
      setGasCovered(false);
      await sendBundle(currentBundleId);
    } catch (e) {
      showError(`FAILED TO SIGN TXS Error: ${e}`);
      resetStatus();
    }
  };

  const sendBundle = async (currentBundleId: string) => {
    if (!flashbotsProvider) {
      showError("Flashbot provider not available");
      resetStatus();
      return;
    }
    setStepActive(RecoveryProcessStatus.SEND_BUNDLE);
    try {
      const finalBundle = await (
        await fetch(
          `https://rpc${targetNetwork.network == "goerli" ? "-goerli" : ""}.flashbots.net/bundle?id=${currentBundleId}`,
        )
      ).json();
      if (!finalBundle || !finalBundle.rawTxs) {
        showError("Couldn't fetch latest bundle");
        resetStatus();
        return;
      }

      const txs = finalBundle.rawTxs.reverse();

      try {
        setSentTxHash(ethers.utils.keccak256(txs[0]));
        setSentBlock(parseInt((await publicClient.getBlockNumber()).toString()));

        const currentUrl = window.location.href.replace("?", "");
        const response = await fetch(currentUrl + `api/relay${targetNetwork.network == "goerli" ? "-goerli" : ""}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            txs,
          }),
        });

        await response.json();
        setStepActive(RecoveryProcessStatus.LISTEN_BUNDLE);
      } catch (e) {
        console.error(e);
        setSentTxHash("");
        setSentBlock(0);
        showError("Error submitting bundles. Check console for details.");
        resetStatus();
      }
    } catch (e) {
      console.error(e);
      setSentTxHash("");
      setSentBlock(0);
      showError("Error submitting bundles. Check console for details.");
      resetStatus();
    }
  };

  const startRecoveryProcess = async ({
    safeAddress,
    modifyBundleId,
    totalGas,
    currentBundleId,
    hackedAddress,
    transactions,
  }: IStartProcessPops) => {
    const isValid = validateBundleIsReady(safeAddress);
    if (!isValid) {
      return;
    }
    try {
      ////////// Create new bundle uuid & add corresponding RPC 'subnetwork' to Metamask
      const bundleId = await changeFlashbotNetwork();
      modifyBundleId(bundleId);
      setStepActive(RecoveryProcessStatus.INCREASE_PRIORITY_FEE);
      // ////////// Cover the envisioned total gas fee from safe account
      await payTheGas(totalGas, hackedAddress);
      signRecoveryTransactions(hackedAddress, transactions, currentBundleId, true);
      return;
    } catch (e) {
      resetStatus();
      showError(
        `Error while adding a custom RPC and signing the funding transaction with the safe account. Error: ${e}`,
      );
    }
  };

  const addRelayRPC = async (bundleUuid: string) => {
    if (!window.ethereum || !window.ethereum.request) {
      console.error("MetaMask Ethereum provider is not available");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${targetNetwork.network == "goerli" ? 5 : 1}`,
            chainName: "Hacked Wallet Recovery RPC",
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: [
              `https://rpc${targetNetwork.network == "goerli" ? "-goerli" : ""}.flashbots.net?bundle=${bundleUuid}`,
            ],
            blockExplorerUrls: [`https://${targetNetwork.network == "goerli" ? "goerli." : ""}etherscan.io`],
          },
        ],
      });
    } catch (error) {
      console.error("Failed to add custom RPC network to MetaMask:", error);
    }
  };

  const showTipsModal = () => {
    setStepActive(RecoveryProcessStatus.DONATE);
  };

  return {
    data: stepActive,
    sentBlock,
    sentTxHash,
    blockCountdown,
    startRecoveryProcess,
    signRecoveryTransactions,
    resetStatus,
    showTipsModal,
  };
};
