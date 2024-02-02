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
import { ERC721Tx } from "~~/types/business";
import { ERC721_ABI } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const erc721Interface = new ethers.utils.Interface(ERC721_ABI);

export const ERC721Form = ({ hackedAddress, safeAddress, addAsset, close }: ITokenForm) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [tokenId, setTokenId] = useState<string>("");
  const publicClient = usePublicClient({ chainId: getTargetNetwork().id });
  const { showError } = useShowError();
  const addErc721TxToBasket = async () => {
    if (!isAddress(contractAddress) || !tokenId) {
      showError("Provide a contract and a token ID");
      return;
    }

    let ownerOfGivenTokenId;
    try {
      ownerOfGivenTokenId = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: "ownerOf",
        args: [BigNumber.from(tokenId)],
      });
    } catch (e) {
      console.error(e);
    }

    if (!ownerOfGivenTokenId || ownerOfGivenTokenId.toString() != hackedAddress) {
      showError(`Couldn't verify hacked account's ownership. Cannot add to the basket...`);
      return;
    }

    let symbol = "???";
    try {
      symbol = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC721_ABI,
        functionName: "symbol",
      })) as string;
    } catch (err) {
      console.log(err);
    }

    const newErc721Tx: ERC721Tx = {
      type: "erc721",
      info: `ERC721 - ${symbol} #${tokenId}`,
      symbol,
      tokenId: tokenId,
      toEstimate: {
        from: hackedAddress as `0x${string}`,
        to: contractAddress as `0x${string}`,
        data: erc721Interface.encodeFunctionData("transferFrom", [
          hackedAddress,
          safeAddress,
          BigNumber.from(tokenId),
        ]) as `0x${string}`,
      },
    };
    addAsset({ tx: newErc721Tx });
  };
  return (
    <div className={styles.containerBasic}>
      <Image src={BackSvg} alt={""} className={styles.back} onClick={() => close()} />
      <h3 className={`${styles.title}`}>{"ERC721"}</h3>
      <div className="mt-8"></div>
      <label className={styles.label} htmlFor="addressInput">
        Contract Address
      </label>
      <AddressInput
        name="addressInput"
        value={contractAddress}
        placeholder={"0xcEBD023e3a...F7fa035bbf52e6"}
        onChange={e => setContractAddress(e)}
      />
      <div className="mt-6"></div>
      <label className={styles.label} htmlFor="tokenId">
        Token Id
      </label>
      <InputBase name="tokenId" value={tokenId} onChange={e => setTokenId(e)} />
      <div className={styles.bottom}></div>
      <CustomButton type="btn-primary" text={"Add"} onClick={() => addErc721TxToBasket()} />
    </div>
  );
};
