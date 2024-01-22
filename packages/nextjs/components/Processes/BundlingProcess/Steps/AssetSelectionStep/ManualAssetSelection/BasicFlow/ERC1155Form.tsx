import { useState } from "react";
import Image from "next/image";
import BackSvg from "../../../../../../../public/assets/flashbotRecovery/back.svg";
import styles from "../manualAssetSelection.module.css";
import { BigNumber, ethers } from "ethers";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { ITokenForm } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/ManualAssetSelection/BasicFlow/types";
import { AddressInput, InputBase } from "~~/components/scaffold-eth";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import { ERC1155Tx } from "~~/types/business";
import { ERC1155_ABI } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);

export const ERC1155Form = ({ hackedAddress, safeAddress, addAsset, close }: ITokenForm) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenIds, setTokenIds] = useState<string>("");
  const publicClient = usePublicClient({ chainId: getTargetNetwork().id });
  const { showError } = useShowError();
  const addErc1155TxToBasket = async () => {
    if (!isAddress(contractAddress) || !tokenIds) {
      showError("Provide an ERC1155 contract and token IDs");
      return;
    }

    try {
      const currentIds = tokenIds
        .split(",")
        .map((a: any) => a)
        .map((a: any) => BigNumber.from(a));
      const balances = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC1155_ABI,
        functionName: "balanceOfBatch",
        args: [Array(tokenIds.length).fill(hackedAddress), currentIds],
      })) as BigNumber[];

      const tokenIdsWithInvalidBalances: BigNumber[] = [];
      for (let i = 0; i < tokenIds.length; i++) {
        if (!balances[i] || balances[i].toString() == "0") {
          tokenIdsWithInvalidBalances.push(currentIds[i]);
        }
      }
      if (tokenIdsWithInvalidBalances.length > 0) {
        showError(
          `Remove following tokenIds as hacked account does not own them: ${tokenIdsWithInvalidBalances.toString()}`,
        );
        return;
      }
      const erc1155TokenIds = currentIds.map(t => t.toString());
      const erc1155TokenBalances = balances.map(t => t.toString());

      let symbol = "???";
      try {
        symbol = (await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ERC1155_ABI,
          functionName: "symbol",
        })) as string;
      } catch (err) {
        console.log(err);
      }

      const newErc1155Tx: ERC1155Tx = {
        type: "erc1155",
        info: `ERC1155 - ${symbol}`,
        symbol,
        tokenIds: erc1155TokenIds,
        amounts: erc1155TokenBalances,
        toEstimate: {
          from: hackedAddress as `0x${string}`,
          to: contractAddress as `0x${string}`,
          data: erc1155Interface.encodeFunctionData("safeBatchTransferFrom", [
            hackedAddress,
            safeAddress,
            erc1155TokenIds,
            erc1155TokenBalances,
            ethers.constants.HashZero,
          ]) as `0x${string}`,
        },
      };
      addAsset({ tx: newErc1155Tx });
    } catch (e) {
      console.error(e);
      showError(`Couldn't read the contract. See the console for the error.`);
      return;
    }
  };
  return (
    <div className={styles.containerBasic}>
      <Image src={BackSvg} alt={""} className={styles.back} onClick={close} />
      <h3 className={`${styles.title}`}>{"ERC1155"}</h3>
      <div className="mt-8"></div>
      <label className={styles.label} htmlFor="addressInput">
        Contract Address
      </label>
      <AddressInput
        name="addressInput"
        value={contractAddress}
        placeholder={"0xcEBD023e3a...F7fa035bbf52e6"}
        onChange={setContractAddress}
      />
      <div className="mt-6"></div>
      <label className={styles.label} htmlFor="tokenId">
        Comma-separated Token Ids
      </label>
      <InputBase name="tokenId" placeholder="e.g. 1,2,3" value={tokenIds} onChange={setTokenIds} />
      <div className={styles.bottom}></div>
      <CustomButton type="btn-primary" text={"Add"} onClick={addErc1155TxToBasket} />
    </div>
  );
};
