import { useState } from "react";
import { useShowError } from "./useShowError";
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from "ethers";
import { useLocalStorage } from "usehooks-ts";
import { ERC20Tx, ERC721Tx, ERC1155Tx, RecoveryTx } from "~~/types/business";
import { ERC20_ABI, ERC721_ABI, ERC1155_ABI } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
const erc721Interface = new ethers.utils.Interface(ERC721_ABI);
const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);

export interface IWrappedRecoveryTx {
  image?: string;
  tx: RecoveryTx;
}

export const useAutodetectAssets = () => {
  const [autoDetectedAssets, setAutoDetectedAssets] = useLocalStorage<{
    [account: string]: IWrappedRecoveryTx[];
  }>("autoDetectedAssets", {});

  const { showError } = useShowError();
  const targetNetwork = getTargetNetwork();
  const [alchemy] = useState<Alchemy>(
    new Alchemy({
      apiKey: "v_x1FpS3QsTUZJK3leVsHJ_ircahJ1nt",
      network: targetNetwork.network == "sepolia" ? Network.ETH_SEPOLIA : Network.ETH_MAINNET,
    }),
  );

  const getAutodetectedAssets = async (
    hackedAddress: string,
    safeAddress = "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF",
    forceFetch = false,
  ): Promise<IWrappedRecoveryTx[] | undefined> => {
    // Return cached results if available and not forcing refresh
    if (autoDetectedAssets[hackedAddress] && autoDetectedAssets[hackedAddress].length > 0 && !forceFetch) {
      console.log("Assets exist in data. Returning from cache.");
      return autoDetectedAssets[hackedAddress];
    }

    if (!ethers.utils.isAddress(hackedAddress)) {
      return;
    }
    if (!alchemy) {
      showError("Seems Alchemy API rate limit has been reached. Contact irbozk@gmail.com");
      return;
    }

    try {
      const recoveryTxs: RecoveryTx[] = [];

      // 1. Get ERC20 token balances and metadata
      const erc20Balances = await alchemy.core.getTokenBalances(hackedAddress);

      for (const token of erc20Balances.tokenBalances) {
        // Convert hex to BigInt and check if it's zero
        const balance = BigInt(token.tokenBalance || "0");
        if (balance === BigInt(0)) continue;

        const metadata = await alchemy.core.getTokenMetadata(token.contractAddress);

        const erc20Tx: ERC20Tx = {
          type: "erc20",
          info: `ERC20 - ${metadata.symbol || metadata.name || token.contractAddress}`,
          symbol: metadata.symbol || "",
          amount: token.tokenBalance || "0",
          decimals: metadata.decimals || 18,
          toEstimate: {
            from: hackedAddress as `0x${string}`,
            to: token.contractAddress as `0x${string}`,
            data: erc20Interface.encodeFunctionData("transfer", [safeAddress, token.tokenBalance]) as `0x${string}`,
          },
        };
        recoveryTxs.push(erc20Tx);
      }

      // 2. Get all NFTs (both ERC721 and ERC1155)
      const nfts = await alchemy.nft.getNftsForOwner(hackedAddress);

      for (const nft of nfts.ownedNfts) {
        if (nft.tokenType === "ERC721") {
          const erc721Tx: ERC721Tx = {
            type: "erc721",
            info: `ERC721 - ${nft.contract.name || nft.contract.symbol || nft.contract.address}`,
            symbol: nft.contract.symbol || "",
            tokenId: nft.tokenId,
            toEstimate: {
              from: hackedAddress as `0x${string}`,
              to: nft.contract.address as `0x${string}`,
              data: erc721Interface.encodeFunctionData("transferFrom", [
                hackedAddress,
                safeAddress,
                nft.tokenId,
              ]) as `0x${string}`,
            },
          };
          recoveryTxs.push(erc721Tx);
        } else if (nft.tokenType === "ERC1155") {
          const erc1155Tx: ERC1155Tx = {
            type: "erc1155",
            info: `ERC1155 - ${nft.contract.name || nft.contract.address}`,
            symbol: nft.contract.symbol || "",
            tokenIds: [nft.tokenId],
            amounts: [nft.balance.toString() || "1"],
            toEstimate: {
              from: hackedAddress as `0x${string}`,
              to: nft.contract.address as `0x${string}`,
              data: erc1155Interface.encodeFunctionData("safeBatchTransferFrom", [
                hackedAddress,
                safeAddress,
                [nft.tokenId],
                [nft.balance || "1"],
                ethers.constants.HashZero,
              ]) as `0x${string}`,
            },
          };
          recoveryTxs.push(erc1155Tx);
        }
      }

      // Wrap the transactions with images where available
      const wrappedTxs: IWrappedRecoveryTx[] = recoveryTxs.map(tx => {
        if (tx.type === "erc721" || tx.type === "erc1155") {
          const nft = nfts.ownedNfts.find(
            n =>
              n.contract.address === tx.toEstimate.to &&
              n.tokenId === (tx.type === "erc721" ? (tx as ERC721Tx).tokenId : (tx as ERC1155Tx).tokenIds[0]),
          );
          return {
            image: nft?.media[0]?.gateway,
            format: nft?.media[0]?.format,
            tx,
          };
        }
        return { tx };
      });

      // Cache the results
      setAutoDetectedAssets(prev => ({
        ...prev,
        [hackedAddress]: wrappedTxs,
      }));

      return wrappedTxs;
    } catch (e) {
      console.error(`Error fetching assets of hacked account: ${e}`);
      return undefined;
    }
  };

  return {
    getAutodetectedAssets,
  };
};
