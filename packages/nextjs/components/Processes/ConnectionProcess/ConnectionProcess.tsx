import React, { useEffect, useRef } from "react";
import Image from "next/image";
import IllustrationSvg from "../../../public/assets/flashbotRecovery/logo.svg";
import styles from "./connectionProcess.module.css";
import { AnimatePresence, motion } from "framer-motion";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

interface IProps {
  isVisible: boolean;
  safeAddress: string;
  connectedAddress: string | undefined;
  setSafeAddress: (newAdd: string) => void;
}
export const ConnectionProcess = ({ isVisible, safeAddress, connectedAddress, setSafeAddress }: IProps) => {
  const buttonContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!!safeAddress || !connectedAddress) {
      return;
    }
    setSafeAddress(connectedAddress);
    return () => {};
  }, [connectedAddress]);


  useEffect(() => {
    if(buttonContainerRef.current){
      buttonContainerRef.current.children[0].textContent ="Connect Secure Wallet";
    }
  
    return () => {
      
    }
  }, [buttonContainerRef])
  
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
          <h2 className={`${styles.text} text-secondary-content`}>
            Recover your assets in a 'secure wallet' under your control.<br/> Initiate the process by connecting your wallet and follow these steps.
          </h2>
          <div className="my-1"></div>
          <div className={styles.buttonContainer} ref={buttonContainerRef}>
            <RainbowKitCustomConnectButton />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

