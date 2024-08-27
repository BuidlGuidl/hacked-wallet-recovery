import { useState } from "react";
import React from "react";
import Image from "next/image";
import IllustrationSvg from "../../../public/assets/flashbotRecovery/logo.svg";
import styles from "./hackedAddressProcess.module.css";
import { isAddress } from "ethers/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { AddressInput } from "~~/components/scaffold-eth";

interface IProps {
  isVisible: boolean;
  onSubmit: (hacked: string, safe: string) => void;
}
export const HackedAddressProcess = ({ isVisible, onSubmit }: IProps) => {
  const [hackedAddress, setHackedAddressCore] = useState<string>("");
  const [safeAddress, setSafeAddressCore] = useState<string>("");
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.container}
        >
          <h1 className={styles.title}>
            Welcome to <br />
            Hacked Wallet Recovery
          </h1>
          <Image
            className={styles.illustration}
            src={IllustrationSvg}
            alt="An ethereum icon with nfts and tokens around"
          />
          <h2 className={`${styles.text} text-secondary-content`}>
            This app can help you move assets on Ethereum mainnet that are stuck in a wallet that has been hacked. As
            you probably have found out, it is common practice for hackers to sweep any funds going to or from your
            wallet. Using Flashbots we can get around their tactics and recover assets that are still in your wallet.
          </h2>
          <div className="mt-4" />

          <label className={`w-full`}>Your hacked wallet address</label>
          <AddressInput
            name="addressInput"
            value={hackedAddress}
            placeholder={"0xcc0700000000000000000000000000001481a7"}
            onChange={(val: string) => setHackedAddressCore(val)}
          />
          <div className="mt-4" />
          <label className={`w-full`}>Where do you want to send the assets?</label>
          <AddressInput
            name="addressInput"
            value={safeAddress}
            placeholder={"0xcc0700000000000000000000000000001481a7"}
            onChange={(val: string) => setSafeAddressCore(val)}
          />
          <div className="mt-4" />
          <CustomButton
            type="btn-primary"
            text={"Discover"}
            disabled={!isAddress(hackedAddress) || !isAddress(safeAddress)}
            onClick={() => {
              onSubmit(hackedAddress, safeAddress);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
