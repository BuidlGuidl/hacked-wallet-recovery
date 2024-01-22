import { useState } from "react";
import Image from "next/image";
import BackSvg from "../../../../../../../public/assets/flashbotRecovery/back.svg";
import styles from "../manualAssetSelection.module.css";
import { BigNumber, ethers } from "ethers";
import { isAddress } from "viem";
import { usePublicClient } from "wagmi";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { ITokenForm } from "~~/components/Processes/BundlingProcess/Steps/AssetSelectionStep/ManualAssetSelection/BasicFlow/types";
import { AddressInput } from "~~/components/scaffold-eth";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import { ERC20Tx } from "~~/types/business";
import { ERC20_ABI } from "~~/utils/constants";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

const erc20Interface = new ethers.utils.Interface(ERC20_ABI);

export const ERC20Form = ({ hackedAddress, safeAddress, addAsset, close }: ITokenForm) => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const { showError } = useShowError();

  const publicClient = usePublicClient({ chainId: getTargetNetwork().id });

  const addErc20TxToBasket = async () => {
    if (!isAddress(contractAddress)) {
      showError("Provide a contract first");
      return;
    }

    let balance = 0;
    try {
      balance = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [hackedAddress],
      })) as number;
    } catch (err) {
      console.log(err);
    }

    if (balance == 0) {
      showError("Hacked account has no balance in given erc20 contract");
      return;
    }

    let symbol = "ERC20";
    try {
      symbol = (await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "symbol",
      })) as string;
    } catch (err) {
      console.log(err);
    }

    const newErc20tx: ERC20Tx = {
      type: "erc20",
      info: "changeme",
      symbol,
      amount: balance.toString(),
      toEstimate: {
        from: hackedAddress as `0x${string}`,
        to: contractAddress as `0x${string}`,
        data: erc20Interface.encodeFunctionData("transfer", [
          safeAddress,
          BigNumber.from(balance.toString()),
        ]) as `0x${string}`,
      },
    };
    addAsset({ tx: newErc20tx });
  };

  return (
    <div className={styles.containerBasic}>
      <Image src={BackSvg} alt={""} className={styles.back} onClick={close} />
      <h3 className={`${styles.title}`}>{"ERC20"}</h3>
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
      <div className={styles.bottom}></div>
      <CustomButton type="btn-primary" text={"Add"} onClick={() => addErc20TxToBasket()} />
    </div>
  );
};
