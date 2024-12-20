import { useEffect, useState } from "react";
import { useShowError } from "./useShowError";
import { AlchemyProvider, JsonRpcProvider } from "@ethersproject/providers";
import { FlashbotsBundleProvider } from "@flashbots/ethers-provider-bundle";
import { BigNumber, ethers } from "ethers";
import { useLocalStorage } from "usehooks-ts";
import { v4 } from "uuid";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import * as chains from "wagmi/chains";
import scaffoldConfig from "~~/scaffold.config";
import { ERC20Tx, ERC721Tx, ERC1155Tx, RecoveryTx } from "~~/types/business";
import { RecoveryProcessStatus } from "~~/types/enums";
import { ERC20_ABI, ERC721_ABI, ERC1155_ABI } from "~~/utils/constants";
import { getNetworkConfig, getTargetNetwork } from "~~/utils/scaffold-eth";

const erc721Interface = new ethers.utils.Interface(ERC721_ABI);
const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);
const erc20Interface = new ethers.utils.Interface(ERC20_ABI);

interface IStartProcessProps {
  safeAddress: string;
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
  const networkConfig = getNetworkConfig(targetNetwork);
  const [flashbotsProvider, setFlashbotsProvider] = useState<FlashbotsBundleProvider>();
  const [mainnetProvider, setMainnetProvider] = useState<AlchemyProvider | JsonRpcProvider>();
  const [gasCovered, setGasCovered] = useState<boolean>(false);
  const [sentTxHash, setSentTxHash] = useLocalStorage<string>("sentTxHash", "");
  const [sentBlock, setSentBlock] = useLocalStorage<number>("sentBlock", 0);
  const [attemptedBlock, setAttemptedBlock] = useLocalStorage<number>("attemptedBlock", 0);
  const { showError } = useShowError();

  const [stepActive, setStepActive] = useState<RecoveryProcessStatus>(RecoveryProcessStatus.INITIAL);
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const { address } = useAccount();

  const { data: walletClient } = useWalletClient();

  const [unsignedTxs, setUnsignedTxs] = useLocalStorage<RecoveryTx[]>("unsignedTxs", []);
  useEffect(() => {
    (async () => {
      if (!targetNetwork || !targetNetwork.blockExplorers) return;

      // Create provider based on network
      const provider =
        targetNetwork.id === chains.sepolia.id
          ? new ethers.providers.JsonRpcProvider(
              `https://eth-sepolia.g.alchemy.com/v2/${scaffoldConfig.alchemyApiKey2 || scaffoldConfig.alchemyApiKey}`,
            )
          : new ethers.providers.AlchemyProvider(
              targetNetwork.id,
              scaffoldConfig.alchemyApiKey2 || scaffoldConfig.alchemyApiKey,
            );

      setMainnetProvider(provider);
      setFlashbotsProvider(
        await FlashbotsBundleProvider.create(
          provider,
          flashbotSigner,
          networkConfig.relayUrl,
          targetNetwork.id === chains.sepolia.id ? "sepolia" : undefined,
        ),
      );
    })();
  }, []);

  const resetStatus = () => {
    setStepActive(RecoveryProcessStatus.INITIAL);
  };
  const validateBundleIsReady = () => {
    if (gasCovered) {
      setStepActive(RecoveryProcessStatus.GAS_PAID);
      return false;
    }

    ////////// Enforce switching to the safe address
    if (!address) {
      setStepActive(RecoveryProcessStatus.NO_CONNECTED_ACCOUNT);
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
    const block = await mainnetProvider?.getBlock("latest");
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

  const payTheGas = async (transactions: RecoveryTx[], hackedAddress: string) => {
    // Add up all the fees and multiply by the gas cost to get the total fee
    let totalFeePerGas = BigInt(0);
    let totalGas = BigInt(0);
    for (const tx of transactions) {
      if (tx.toSign) {
        totalFeePerGas += BigInt(tx.toSign?.maxFeePerGas || 0);
        totalGas += BigInt(tx.toSign?.gas || 0);
      }
    }
    // Add one percent for good measure
    const totalFee = (totalFeePerGas * totalGas * BigInt(101)) / BigInt(100);
    console.log("DEBUG: totalFee", totalFee);
    const { maxBaseFeeInFutureBlock, priorityFee } = await getEstimatedTxFees();
    await walletClient?.sendTransaction({
      to: hackedAddress as `0x${string}`,
      value: totalFee,
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
        await fetch(`${networkConfig.bundleCacheApiUrl}/bundle?id=${currentBundleId}`, {
          cache: "no-store",
        })
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
          const response = await fetch(currentUrl + `api/relay`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-network-id": targetNetwork.id.toString(),
            },
            body: JSON.stringify({
              txs,
            }),
            cache: "no-store",
          });

          const parsedResponse = await response.json();
          // Success
          if (parsedResponse.success) {
            setStepActive(RecoveryProcessStatus.SUCCESS);
            break;
          }
          // Error
          if (!parsedResponse.success && parsedResponse.response.includes("Bundle reverted with error")) {
            showError(
              `${parsedResponse.message}.\n The recovery has failed. To solve this issue, remove all "Hacked Wallet Recovery RPC" and clear activity data. Check this <a href="https://youtu.be/G4dg74m_Bmc" target="_blank" rel="noopener noreferrer">video</a>`,
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
    const result: RecoveryTx[] = [];
    for (const item of transactions) {
      let newTX: RecoveryTx = { ...item };
      if (item.type === "erc20") {
        const data = item as ERC20Tx;
        newTX = {
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
      }

      if (item.type === "erc721") {
        const data = item as ERC721Tx;
        newTX = {
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
      }

      if (item.type === "erc1155") {
        const data = item as ERC1155Tx;
        newTX = {
          type: data.type,
          info: data.info,
          //@ts-ignore
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
      }
      result.push(newTX);
    }
    return result;
  };

  const startRecoveryProcess = async ({
    currentBundleId,
    hackedAddress,
    transactions,
    modifyBundleId,
    setRpcParams,
  }: IStartProcessProps & IChangeRPCProps) => {
    const isValid = validateBundleIsReady();
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
      await signTransactionsStep({ currentBundleId, hackedAddress, transactions });
    }
  };

  const signTransactionsStep = async ({
    currentBundleId,
    hackedAddress,
    transactions,
  }: Pick<IStartProcessProps, "currentBundleId" | "hackedAddress" | "transactions">) => {
    setStepActive(RecoveryProcessStatus.PAY_GAS);
    try {
      // ////////// Cover the envisioned total gas fee from safe account
      await payTheGas(transactions, hackedAddress);
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
      chainId: `0x${targetNetwork.network == "sepolia" ? "aa36a7" : "1"}`,
      chainName: "Hacked Wallet Recovery RPC",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: [`${networkConfig.bundleCacheApiUrl}?bundle=${bundleUuid}`],
      blockExplorerUrls: [`${networkConfig.blockExplorerUrl}`],
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
