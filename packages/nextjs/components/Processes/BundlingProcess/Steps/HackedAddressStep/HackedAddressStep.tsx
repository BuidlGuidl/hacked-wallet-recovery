import { useState } from "react";
import styles from "./hackedAddressStep.module.css";
import { isAddress } from "ethers/lib/utils";
import { motion } from "framer-motion";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { AddressInput } from "~~/components/scaffold-eth";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";

interface IProps {
  isVisible: boolean;
  safeAddress: string;
  onSubmit: (address: string) => void;
}
export const HackedAddressStep = ({ isVisible, safeAddress, onSubmit }: IProps) => {
  const { showError } = useShowError();
  const [hackedAddress, setHackedAddressCore] = useState<string>("");
  const setHackedAddress = (hackedAddress: string) => {
    if (safeAddress == hackedAddress) {
      showError("The secure and the hacked address can't be the same");
      setHackedAddressCore("");
      return;
    }
    setHackedAddressCore(hackedAddress);
  };

  if (!isVisible) {
    return <></>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.container}>
      <label className={styles.label} htmlFor="addressInput">
        Hacked address
      </label>
      <AddressInput
        name="addressInput"
        value={hackedAddress}
        placeholder={"0xcEBD023e3a...F7fa035bbf52e6"}
        onChange={setHackedAddress}
      />
      <div className="m2" />
      <CustomButton
        type="btn-primary"
        text={"Continue"}
        onClick={() => {
          if (!isAddress(hackedAddress)) {
            showError("Given hacked address is not a valid address");
            return;
          }
          onSubmit(hackedAddress);
        }}
      />
    </motion.div>
  );
};
