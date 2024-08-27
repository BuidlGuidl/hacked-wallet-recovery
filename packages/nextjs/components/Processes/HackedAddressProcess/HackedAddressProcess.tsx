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
          <div className="mt-4" />
          <h2 className={`${styles.text} text-secondary-content`}>Let&apos;s search what assets we can recover</h2>
          <div className="mt-4" />

          <label className={`w-full`}>Hacked address</label>
          <AddressInput
            name="addressInput"
            value={hackedAddress}
            placeholder={"0xcc0700000000000000000000000000001481a7"}
            onChange={(val: string) => setHackedAddressCore(val)}
          />
          <div className="mt-4" />
          <label className={`w-full`}>Address to receive your assets</label>
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
