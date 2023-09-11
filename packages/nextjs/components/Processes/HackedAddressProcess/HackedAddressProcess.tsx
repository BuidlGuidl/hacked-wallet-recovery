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
  onSubmit: (address: string) => void;
}
export const HackedAddressProcess = ({ isVisible, onSubmit }: IProps) => {
  const [hackedAddress, setHackedAddressCore] = useState<string>("");
  const setHackedAddress = (hackedAddress: string) => {

    setHackedAddressCore(hackedAddress);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={styles.container}
        >
          <h1 className={styles.title}>Welcome to <br/>Hacked Wallet Recovery</h1>
          <Image
            className={styles.illustration}
            src={IllustrationSvg}
            alt="An ethereum icon with nfts and tokens around"
          />
           <div className="mt-4" />
          <h2 className={`${styles.text} text-secondary-content`}>
            Let's search what assets can we recover
          </h2>
          <h2 className={`${styles.text} text-secondary-content`}>
            Introduce your hacked address
          </h2>
          <AddressInput
            name="addressInput"
            value={hackedAddress}
            placeholder={"0xcc0700000000000000000000000000001481a7"}
            onChange={setHackedAddress}
          />
          <div className="mt-4" />
          <CustomButton
            type="btn-primary"
            text={"Discover"}
            disabled={!isAddress(hackedAddress)}
            onClick={() => {
              onSubmit(hackedAddress);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
