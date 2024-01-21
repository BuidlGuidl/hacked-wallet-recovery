import React, { useState } from "react";
import { useShowError } from "./useShowError";
import {
  Alchemy,
  AssetTransfersCategory,
  AssetTransfersResult,
  Network,
  Nft,
  NftMetadataBatchToken,
  NftTokenType,
} from "alchemy-sdk";
import { BigNumber, ethers } from "ethers";
import { useLocalStorage } from "usehooks-ts";
import { usePublicClient } from "wagmi";
import {
  AutoDetectedERC20Info,
  AutoDetectedERC721Info,
  AutoDetectedERC1155Info,
  ERC20Tx,
  ERC721Tx,
  ERC1155Tx,
  RecoveryTx,
} from "~~/types/business";
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
      network: targetNetwork.network == "goerli" ? Network.ETH_GOERLI : Network.ETH_MAINNET,
    }),
  );
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  const fetchAllAssetTransfersOfHackedAccount = async (hackedAddress: string) =>
    (
      await Promise.all([
        alchemy.core.getAssetTransfers({
          fromAddress: hackedAddress,
          excludeZeroValue: true,
          category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.ERC721, AssetTransfersCategory.ERC1155],
        }),
        alchemy.core.getAssetTransfers({
          toAddress: hackedAddress,
          excludeZeroValue: true,
          category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.ERC721, AssetTransfersCategory.ERC1155],
        }),
      ])
    )
      .map(res => res.transfers)
      .flat();

  const getNftMetadata = async (minimalNfts: NftMetadataBatchToken[]) => {
    let result = await alchemy.nft.getNftMetadataBatch(minimalNfts);

    return result.map(item => ({
      contractAddress: item.contract,
      image: item.rawMetadata?.image,
      tokenId: item.tokenId,
      type: item.tokenType,
    }));
  };

  const getAutodetectedAssets = async (
    hackedAddress: string,
    safeAddress: string = "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF",
    forceFetch: boolean = false,
  ): Promise<IWrappedRecoveryTx[] | undefined> => {
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

    const erc20transfers: AssetTransfersResult[] = [],
      erc721transfers: AssetTransfersResult[] = [],
      erc1155transfers: AssetTransfersResult[] = [],
      erc1155Minimal: NftMetadataBatchToken[] = [],
      erc721Minimal: NftMetadataBatchToken[] = []
    try {
      (await fetchAllAssetTransfersOfHackedAccount(hackedAddress)).forEach(tx => {
        if (tx.category == AssetTransfersCategory.ERC20) {
          erc20transfers.push(tx);
        } else if (tx.category == AssetTransfersCategory.ERC721) {
          erc721transfers.push(tx);
        } else if (tx.category == AssetTransfersCategory.ERC1155) {
          erc1155transfers.push(tx);
        }
      });

      // Classify the fetched transfers

      const erc20contracts = Array.from(
        new Set(
          erc20transfers.filter(tx => tx.rawContract.address != null).map(tx => tx.rawContract.address! as string),
        ),
      );

      const erc721contractsAndTokenIds = erc721transfers.reduce(
        (acc, tx) => {
          const assetContractAddress = tx.rawContract.address;
          const assetTokenId = tx.erc721TokenId;

          if (!assetContractAddress || !assetTokenId) {
            return acc;
          }

          if (!(assetContractAddress in acc)) {
            acc[assetContractAddress] = new Set<string>();
          }

          acc[assetContractAddress].add(assetTokenId);
          return acc;
        },
        {} as {
          [address: string]: Set<string>;
        },
      );

      const erc1155contractsAndTokenIds = erc1155transfers.reduce(
        (acc, tx) => {
          const assetContractAddress = tx.rawContract.address;
          const assetMetadata = tx.erc1155Metadata;

          if (!assetContractAddress || !assetMetadata) {
            return acc;
          }

          if (!(assetContractAddress in acc)) {
            acc[assetContractAddress] = new Set<string>();
          }

          assetMetadata.map(meta => meta.tokenId).forEach(tokenId => acc[assetContractAddress].add(tokenId));
          return acc;
        },
        {} as {
          [address: string]: Set<string>;
        },
      );

      // Now get the balances & owned NFTs

      const erc20BalancePromises = erc20contracts.map(async erc20contract => {
        const balance = (await publicClient.readContract({
          address: erc20contract as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [hackedAddress],
        })) as string;
        if (!balance || balance.toString() == "0") {
          return [];
        }
        return [erc20contract, balance.toString()];
      });

      const erc721OwnershipPromises = Object.keys(erc721contractsAndTokenIds).map(async erc721Contract => {
        const ownedTokenIds = await Promise.all(
          Array.from(erc721contractsAndTokenIds[erc721Contract]).map(async tokenId => {
            const ownerOfGivenTokenId = await publicClient.readContract({
              address: erc721Contract as `0x${string}`,
              abi: ERC721_ABI,
              functionName: "ownerOf",
              args: [BigNumber.from(tokenId)],
            });
            if (!ownerOfGivenTokenId || ownerOfGivenTokenId != hackedAddress) {
              return undefined;
            }
            return tokenId;
          }),
        );
        const ownedTokenIdsFiltered = ownedTokenIds.filter(tokenId => tokenId != undefined) as string[];
        if (ownedTokenIdsFiltered.length == 0) {
          return [];
        }
        return [erc721Contract, ownedTokenIdsFiltered];
      });

      const erc1155OwnershipPromises = Object.keys(erc1155contractsAndTokenIds).map(async erc1155Contract => {
        const tokenIdsWithinContract = Array.from(erc1155contractsAndTokenIds[erc1155Contract]);
        const tokenIdBalances = (await publicClient.readContract({
          address: erc1155Contract as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "balanceOfBatch",
          args: [Array(tokenIdsWithinContract.length).fill(hackedAddress), tokenIdsWithinContract],
        })) as bigint[];

        const tokenIdsAndBalances: string[][] = [];
        for (let i = 0; i < tokenIdBalances.length; i++) {
          if (tokenIdBalances[i] == 0n) {
            continue;
          }
          tokenIdsAndBalances.push([tokenIdsWithinContract[i], tokenIdBalances[i].toString()]);
        }
        if (tokenIdsAndBalances.length == 0) {
          return [];
        }

        return [erc1155Contract, Object.fromEntries(tokenIdsAndBalances)];
      });

      // Await all the promises

      const { erc20ContractsAndBalances, erc721ContractsAndOwnedTokens, erc1155ContractsAndTokenIdsWithBalances } =
        await Promise.all([
          (await Promise.all(erc20BalancePromises)).filter(a => a.length > 0),
          (await Promise.all(erc721OwnershipPromises)).filter(a => a.length > 0),
          (await Promise.all(erc1155OwnershipPromises)).filter(a => a.length > 0),
        ]).then(([erc20res, erc721res, erc1155res]) => {
          return {
            erc20ContractsAndBalances: Object.fromEntries(erc20res) as AutoDetectedERC20Info,
            erc721ContractsAndOwnedTokens: Object.fromEntries(erc721res) as AutoDetectedERC721Info,
            erc1155ContractsAndTokenIdsWithBalances: Object.fromEntries(erc1155res) as AutoDetectedERC1155Info,
          };
        });

      // Fetch token symbols and save results

      const autoDetectedErc20Txs: ERC20Tx[] = await Promise.all(
        Object.entries(erc20ContractsAndBalances).map(async ([erc20contract, erc20balance]) => {
          let tokenSymbol = "???";
          try {
            tokenSymbol = (await publicClient.readContract({
              address: erc20contract as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "symbol",
              args: [],
            })) as string;
          } catch (e) {
            /* ignore */
          }

          const newErc20tx: ERC20Tx = {
            type: "erc20",
            info: `ERC20 - ${tokenSymbol != "???" ? `${tokenSymbol}` : `${erc20contract}`}`,
            symbol: tokenSymbol,
            amount: erc20balance,
            toEstimate: {
              from: hackedAddress as `0x${string}`,
              to: erc20contract as `0x${string}`,
              data: erc20Interface.encodeFunctionData("transfer", [
                safeAddress,
                BigNumber.from(erc20balance),
              ]) as `0x${string}`,
            },
          };
          return newErc20tx;
        }),
      );

      const autoDetectedErc721Txs: ERC721Tx[] = (
        await Promise.all(
          Object.entries(erc721ContractsAndOwnedTokens).map(async ([erc721contract, ownedTokenIds]) => {
            let tokenSymbol = "???";
            try {
              tokenSymbol = (await publicClient.readContract({
                address: erc721contract as `0x${string}`,
                abi: ERC721_ABI,
                functionName: "symbol",
                args: [],
              })) as string;
            } catch (e) {
              /* ignore */
            }

            const result: NftMetadataBatchToken[] = ownedTokenIds.map(tokenId => ({
              contractAddress: erc721contract as `0x${string}`,
              tokenId: parseInt(tokenId).toString(),
              tokenType: NftTokenType.ERC721,
            }));
            erc721Minimal.push(...result);

            const newErc721txs: ERC721Tx[] = ownedTokenIds.map(tokenId => {
              const newErc721tx: ERC721Tx = {
                type: "erc721",
                info: `ERC721 - ${tokenSymbol != "???" ? `${tokenSymbol}` : `${erc721contract}`}`,
                symbol: tokenSymbol,
                tokenId: parseInt(tokenId).toString(),
                toEstimate: {
                  from: hackedAddress as `0x${string}`,
                  to: erc721contract as `0x${string}`,
                  data: erc721Interface.encodeFunctionData("transferFrom", [
                    hackedAddress,
                    safeAddress,
                    BigNumber.from(tokenId),
                  ]) as `0x${string}`,
                },
              };
              return newErc721tx;
            });
            return newErc721txs;
          }),
        )
      ).flat();

      const autoDetectedErc1155Txs: ERC1155Tx[] = await Promise.all(
        Object.entries(erc1155ContractsAndTokenIdsWithBalances).map(async ([erc1155contract, tokenIdsAndBalances]) => {
          let uri = "???";
          try {
            uri = (await publicClient.readContract({
              address: erc1155contract as `0x${string}`,
              abi: ERC1155_ABI,
              functionName: "uri",
              args: [0],
            })) as string;
          } catch (e) {
            /* ignore */
          }
          const tokenIds = Object.keys(tokenIdsAndBalances);
          const result: NftMetadataBatchToken[] = tokenIds.map(tokenId => ({
            contractAddress: erc1155contract as `0x${string}`,
            tokenId,
            tokenType: NftTokenType.ERC1155,
          }));
          erc1155Minimal.push(...result);
          const balances: string[] = [];
          for (let i = 0; i < tokenIds.length; i++) {
            balances.push(tokenIdsAndBalances[tokenIds[i]]);
          }

          const newErc1155Tx: ERC1155Tx = {
            type: "erc1155",
            info: `ERC1155 - ${uri != "???" ? `${uri}` : `${erc1155contract}`}`,
            uri: "changeme",
            tokenIds: tokenIds,
            amounts: balances,
            toEstimate: {
              from: hackedAddress as `0x${string}`,
              to: erc1155contract as `0x${string}`,
              data: erc1155Interface.encodeFunctionData("safeBatchTransferFrom", [
                hackedAddress,
                safeAddress,
                tokenIds,
                balances,
                ethers.constants.HashZero,
              ]) as `0x${string}`,
            },
          };
          return newErc1155Tx;
        }),
      );
      const allMinimalNft = [...erc1155Minimal, ...erc721Minimal];
      const allMetadata = allMinimalNft.length > 0 ? await getNftMetadata(allMinimalNft) : [];
      const result: IWrappedRecoveryTx[] = [
        ...autoDetectedErc20Txs,
        ...autoDetectedErc721Txs,
        ...autoDetectedErc1155Txs,
      ].map(tx => {
        if (tx.type === "erc721") {
          let tx721 = tx as ERC721Tx;
          let metadata = allMetadata.find(meta => meta.tokenId === tx721.tokenId);
          return {
            image: metadata?.image,
            tx: tx,
          };
        }
        if (tx.type === "erc1155") {
          let tx1155 = tx as ERC1155Tx;
          let metadata = allMetadata.find(meta => tx1155.tokenIds.includes(meta.tokenId));
          return {
            image: metadata?.image,
            tx: tx,
          };
        }
        return { tx } as IWrappedRecoveryTx;
      });

      setAutoDetectedAssets(prev => {
        prev[hackedAddress] = result;
        return prev;
      });

      return result;
    } catch (e) {
      console.error(`Error fetching assets of hacked account: ${e}`);
    }
  };

  return {
    getAutodetectedAssets,
  };
};
