import { useEffect, useState } from "react";
import { useShowError } from "./useShowError";
import { InfuraProvider } from "@ethersproject/providers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { BigNumber, ethers } from "ethers";
import { useInterval, useLocalStorage } from "usehooks-ts";
import { v4 } from "uuid";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { ERC20Tx, ERC721Tx, ERC1155Tx, RecoveryTx } from "~~/types/business";
import { RecoveryProcessStatus } from "~~/types/enums";
import { DUMMY_ADDRESS, ERC20_ABI, ERC721_ABI, ERC1155_ABI } from "~~/utils/constants";
import { BLOCKS_IN_THE_FUTURE } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const erc721Interface = new ethers.utils.Interface(ERC721_ABI);
const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);
const erc20Interface = new ethers.utils.Interface(ERC20_ABI);

interface IStartProcessProps {
  safeAddress: string;
  totalGas: BigNumber;
  hackedAddress: string;
  transactions: RecoveryTx[];
  currentBundleId: string;
}

interface IChangeRPCProps {
  modifyBundleId: (bundleId: string) => void;
  setRpcParams: (params: any) => void;
}

const flashbotSigner = ethers.Wallet.createRandom();

export const useRecoveryProcess = () => {
  const targetNetwork = getTargetNetwork();
  const [flashbotsProvider, setFlashbotsProvider] = useState<FlashbotsBundleProvider>();
  const [infuraProvider, setInfuraProvider] = useState<InfuraProvider>();
  const [gasCovered, setGasCovered] = useState<boolean>(false);
  const [sentTxHash, setSentTxHash] = useLocalStorage<string>("sentTxHash", "");
  const [sentBlock, setSentBlock] = useLocalStorage<number>("sentBlock", 0);
  const [attemptedBlock, setAttemptedBlock] = useLocalStorage<number>("attemptedBlock", 0);
  const { showError } = useShowError();

  const [stepActive, setStepActive] = useState<RecoveryProcessStatus>(RecoveryProcessStatus.INITIAL);
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { address } = useAccount();

  const { data: walletClient } = useWalletClient();
  const FLASHBOTS_RELAY_ENDPOINT = `https://relay${targetNetwork.network == "goerli" ? "-goerli" : ""}.flashbots.net/`;
  const [unsignedTxs, setUnsignedTxs] = useLocalStorage<RecoveryTx[]>("unsignedTxs", []);
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
    } else if (address != safeAddress || safeAddress == DUMMY_ADDRESS) {
      setStepActive(RecoveryProcessStatus.NO_SAFE_ACCOUNT);
      return false;
    }
    return true;
  };

  const changeFlashbotNetwork = async ({ modifyBundleId, setRpcParams }: IChangeRPCProps) => {
    const bundleId = v4();
    const { result, params } = await addRelayRPC(bundleId);
    modifyBundleId(bundleId);
    if (!result) {
      setRpcParams(params);
      return false;
    }
    return true;
  };

  const getEstimatedTxFees = async () => {
    const block = await infuraProvider?.getBlock("latest");
    if (block) {
      const maxBaseFeeInFutureBlock = FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(
        block.baseFeePerGas as BigNumber,
        3,
      ).toString();
      const priorityFee = BigNumber.from(3).mul(1e9).toString(); // 3 Gwei
      // Buffer the max base fee by 15%
      const adjustedMaxBaseFeeInFutureBlock = BigNumber.from(maxBaseFeeInFutureBlock).mul(120).div(100).toString();
      return { maxBaseFeeInFutureBlock: adjustedMaxBaseFeeInFutureBlock, priorityFee };
    }
    return { maxBaseFeeInFutureBlock: "0", priorityFee: "0" };
  };

  const payTheGas = async (totalGas: BigNumber, hackedAddress: string) => {
    const { maxBaseFeeInFutureBlock, priorityFee } = await getEstimatedTxFees();
    await walletClient?.sendTransaction({
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
    surpass = false,
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
          await walletClient?.sendTransaction(readyToSignTx);
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
          {
            cache: "no-store",
          },
        )
      ).json();

      if (!finalBundle || !finalBundle.rawTxs) {
        showError("Couldn't fetch latest bundle");
        resetStatus();
        return;
      }

      const txs = finalBundle.rawTxs.reverse();

      try {
        setStepActive(RecoveryProcessStatus.LISTEN_BUNDLE);
        setSentTxHash(ethers.utils.keccak256(txs[0]));
        setSentBlock(parseInt((await publicClient.getBlockNumber()).toString()));

        const currentUrl = window.location.href.replace("?", "");
        while (true) {
          const currentBlock = parseInt((await publicClient.getBlockNumber()).toString());
          setAttemptedBlock(currentBlock + 2);
          const response = await fetch(currentUrl + `api/relay${targetNetwork.network == "goerli" ? "-goerli" : ""}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              txs,
            }),
            cache: "no-store",
          });

          const parsedResponse = await response.json();
          console.log("DEBUG", parsedResponse);
          if (parsedResponse.error) {
            throw new Error(parsedResponse.error);
          }
          // Success
          if (parsedResponse.success) {
            setStepActive(RecoveryProcessStatus.SUCCESS);
            break;
          }
          // Error
          if (parsedResponse.SimulationResponse && (parsedResponse.SimulationResponse as any).error) {
            showError(
              `The recovery has failed. To solve this issue, remove all "Hacked Wallet Recovery RPC" and clear activity data. Check this <a href="https://youtu.be/G4dg74m_Bmc" target="_blank" rel="noopener noreferrer">video</a>`,
              true,
            );
            setSentTxHash("");
            setSentBlock(0);
            resetStatus();
            break;
          }
          // BlockPassedWithoutInclusion - try again
        }
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

  const generateCorrectTransactions = ({
    transactions,
    safeAddress,
    hackedAddress,
  }: {
    transactions: RecoveryTx[];
    safeAddress: string;
    hackedAddress: string;
  }): RecoveryTx[] => {
    return transactions.map(item => {
      if (item.type === "erc20") {
        const data = item as ERC20Tx;
        const newErc20tx: ERC20Tx = {
          type: data.type,
          info: data.info,
          symbol: data.symbol,
          amount: data.amount,
          toEstimate: {
            from: data.toEstimate.from,
            to: data.toEstimate.to,
            data: erc20Interface.encodeFunctionData("transfer", [
              safeAddress,
              BigNumber.from(data.amount),
            ]) as `0x${string}`,
          },
        };
        return newErc20tx;
      }

      if (item.type === "erc721") {
        const data = item as ERC721Tx;
        const newErc721Tx: ERC721Tx = {
          type: data.type,
          info: data.info,
          symbol: data.symbol,
          tokenId: data.tokenId,
          toEstimate: {
            from: data.toEstimate.from,
            to: data.toEstimate.to,
            data: erc721Interface.encodeFunctionData("transferFrom", [
              data.toEstimate.from,
              safeAddress,
              BigNumber.from(data.tokenId),
            ]) as `0x${string}`,
          },
        };
        return newErc721Tx;
      }

      if (item.type === "erc1155") {
        const data = item as ERC1155Tx;
        const newErc1155Tx: ERC1155Tx = {
          type: data.type,
          info: data.info,
          uri: data.uri,
          tokenIds: data.tokenIds,
          amounts: data.amounts,
          toEstimate: {
            from: data.toEstimate.from,
            to: data.toEstimate.to,
            data: erc1155Interface.encodeFunctionData("safeBatchTransferFrom", [
              hackedAddress,
              safeAddress,
              data.tokenIds,
              data.amounts,
              ethers.constants.HashZero,
            ]) as `0x${string}`,
          },
        };
        return newErc1155Tx;
      }

      return item;
    });
  };

  const startRecoveryProcess = async ({
    safeAddress,
    totalGas,
    currentBundleId,
    hackedAddress,
    transactions,
    modifyBundleId,
    setRpcParams,
  }: IStartProcessProps & IChangeRPCProps) => {
    const isValid = validateBundleIsReady(safeAddress);
    if (!isValid) {
      return;
    }
    //////// Enforce switching to flashbots RPC
    setStepActive(RecoveryProcessStatus.CHANGE_RPC);
    const changed = await changeFlashbotNetwork({
      modifyBundleId,
      setRpcParams,
    });
    if (changed) {
      await signTransactionsStep({ totalGas, currentBundleId, hackedAddress, transactions });
    }
  };

  const signTransactionsStep = async ({
    totalGas,
    currentBundleId,
    hackedAddress,
    transactions,
  }: Pick<IStartProcessProps, "totalGas" | "currentBundleId" | "hackedAddress" | "transactions">) => {
    setStepActive(RecoveryProcessStatus.PAY_GAS);
    try {
      // ////////// Cover the envisioned total gas fee from safe account
      await payTheGas(totalGas, hackedAddress);
      signRecoveryTransactions(hackedAddress, transactions, currentBundleId, true);
      return;
    } catch (e) {
      resetStatus();
      showError(`Error while signing the funding transaction with the safe account. Error: ${e}`);
    }
  };

  const addRelayRPC = async (bundleUuid: string) => {
    let result = null;
    const params = {
      chainId: `0x${targetNetwork.network == "goerli" ? 5 : 1}`,
      chainName: "Hacked Wallet Recovery RPC",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: [`https://rpc${targetNetwork.network == "goerli" ? "-goerli" : ""}.flashbots.net?bundle=${bundleUuid}`],
      blockExplorerUrls: [`https://${targetNetwork.network == "goerli" ? "goerli." : ""}etherscan.io`],
    };
    if (!window.ethereum || !window.ethereum.request) {
      console.error("MetaMask Ethereum provider is not available");
      return { result, params };
    }

    try {
      result = await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params, address],
      });
    } catch (error) {
      console.error("Failed to add custom RPC network to wallet automatically, showing rpc details", error);
    }
    return { result, params };
  };

  const showTipsModal = () => {
    setStepActive(RecoveryProcessStatus.DONATE);
  };

  return {
    data: stepActive,
    sentBlock,
    sentTxHash,
    attemptedBlock,
    changeFlashbotNetwork,
    startRecoveryProcess,
    signTransactionsStep,
    validateBundleIsReady,
    signRecoveryTransactions,
    generateCorrectTransactions,
    resetStatus,
    showTipsModal,
    unsignedTxs,
    setUnsignedTxs,
  };
};
