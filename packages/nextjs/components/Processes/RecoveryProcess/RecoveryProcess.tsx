import React, { useState } from "react";
import Image from "next/image";
import styles from "./recoveryProcess.module.css";
import { BigNumber, ethers } from "ethers";
import { useAccount } from "wagmi";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { CustomConnectButton } from "~~/components/CustomConnectButton/CustomConnectButton";
import { CustomPortal } from "~~/components/CustomPortal/CustomPortal";
import { InputBase } from "~~/components/scaffold-eth";
import { useGasEstimation } from "~~/hooks/flashbotRecoveryBundle/useGasEstimation";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import { useAccountBalance } from "~~/hooks/scaffold-eth";
import ClockSvg from "~~/public/assets/flashbotRecovery/clock.svg";
import ErrorSvg from "~~/public/assets/flashbotRecovery/error.svg";
import HackedWalletSvg from "~~/public/assets/flashbotRecovery/hacked.svg";
import MultiSignSvg from "~~/public/assets/flashbotRecovery/multiple-sign-illustration.svg";
import SwitchNetworkSvg from "~~/public/assets/flashbotRecovery/network-change.svg";
import SafeWalletSvg from "~~/public/assets/flashbotRecovery/safe.svg";
import SignSvg from "~~/public/assets/flashbotRecovery/sign-illustration.svg";
import SuccessSvg from "~~/public/assets/flashbotRecovery/success.svg";
import TelegramSvg from "~~/public/assets/flashbotRecovery/telegram.svg";
import TipsSvg from "~~/public/assets/flashbotRecovery/tips.svg";
import TwitterSvg from "~~/public/assets/flashbotRecovery/twitter.svg";
import { RecoveryProcessStatus } from "~~/types/enums";
import { getTargetNetwork } from "~~/utils/scaffold-eth";

interface IProps {
  recoveryStatus: RecoveryProcessStatus;
  startSigning: () => void;
  finishProcess: () => void;
  showTipsModal: () => void;
  startProcess: (arg: string) => void;
  connectedAddress: string | undefined;
  safeAddress: string;
  hackedAddress: string;
  donationValue: string;
  setDonationValue: (amt: string) => void;
  blockCountdown: number;
  isDonationLoading: boolean;
  totalGasEstimate: BigNumber;
}

export const RecoveryProcess = ({
  recoveryStatus,
  startSigning,
  startProcess,
  finishProcess,
  showTipsModal,
  blockCountdown,
  donationValue,
  setDonationValue,
  connectedAddress,
  isDonationLoading,
  hackedAddress,
  totalGasEstimate,
}: IProps) => {
  const { showError } = useShowError();
  const {address} =useAccount()
  const { balance } = useAccountBalance(address);
  const networkName = getTargetNetwork().name;
  const hasEnoughtEth = !!balance ? balance > parseFloat(donationValue) : false;
 
  if (recoveryStatus == RecoveryProcessStatus.INITIAL) {
    return <></>;
  }

  if (recoveryStatus == RecoveryProcessStatus.GAS_PAID) {
    showError(
      "It appears that gas costs have been covered for this action. If you're encountering any confusion, consider clearing your cookies and refreshing the page.",
    );
    //TODO provide clear data mechanism title "Gas Covered Already"
    return;
  }

  if (recoveryStatus == RecoveryProcessStatus.CLEAR_ACTIVITY_DATA) {
    return (
      <CustomPortal
        title={"Clear cache"}
        description={`We've encountered an issue due to outdated cached data. To solve this error clean your wallet, remove all "Hacked Wallet Recovery RPC" and clear activity data`}
        image={ErrorSvg}
      />
    );
    //TODO provide clear data mechanism title "Gas Covered Already"
  }

  if (
    recoveryStatus == RecoveryProcessStatus.NO_SAFE_ACCOUNT ||
    recoveryStatus == RecoveryProcessStatus.NO_CONNECTED_ACCOUNT
  ) {
    return (
      <CustomPortal
        title={"Connect to a safe address"}
        description={
          "To ensure a secure asset transfer, switch to your safe wallet. This step guarantees the safe retrieval of your assets without any further risks."
        }
        image={SafeWalletSvg}
      >
        <ConnectSafeStep
          hackedAddress={hackedAddress}
          startProcess={add => startProcess(add)}
          totalGasEstimate={totalGasEstimate}
        />
      </CustomPortal>
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.SWITCH_RPC_AND_PAY_GAS) {
    return (
      <CustomPortal
        title={"Switching Network"}
        description={"Allow us to create and switch to your personal RPC network to prepare the transaction bundle"}
        image={SwitchNetworkSvg}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.INCREASE_PRIORITY_FEE) {
    return (
      <CustomPortal
        title={"The Funding Transaction"}
        description={
          "Sign the transaction to found the hacked account with enought founds to send all the transactions in the recovery process, in this way your founds will be the minimun time posible in the hacked account."
        }
        image={SignSvg}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.SWITCH_TO_HACKED_ACCOUNT) {
    return (
      <CustomPortal
        title={"Switch to Hacked Address"}
        description={
          "To proceed with asset recovery, switch to the compromised wallet. This step is essential to verify ownership and continue with the recovery process."
        }
        buttons={[
          {
            text: "Continue",
            disabled: connectedAddress !== hackedAddress,
            action: () => startSigning(),
          },
        ]}
        image={HackedWalletSvg}
      />
    );
  }

  if (
    recoveryStatus == RecoveryProcessStatus.SIGN_RECOVERY_TXS ||
    recoveryStatus == RecoveryProcessStatus.RECOVERY_TXS_SIGNED ||
    recoveryStatus == RecoveryProcessStatus.SEND_BUNDLE
  ) {
    return (
      <CustomPortal
        title={"Sign each transaction"}
        description={
          "Each bundled transaction requires your individual signature to verify and complete the asset recovery process. Please sign each transaction as they appear."
        }
        image={MultiSignSvg}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.LISTEN_BUNDLE) {
    return (
      <CustomPortal
        title={"Stay Patient, Stay Secure"}
        description={
          "Your asset recovery is in progress. To ensure a successful retrieval and accurate transaction completion stay on the page."
        }
        image={ClockSvg}
        indicator={blockCountdown}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.SUCCESS) {
    return (
      <CustomPortal
        title={"Your assets have been recovered!"}
        description={
          "Check your safe wallet for your retrieved assets. Share your journey and consider to support us with a tip to continue serving the crypto community."
        }
        buttons={[
          {
            text: "Donate",
            isSecondary: true,
            disabled: false,
            action: () => showTipsModal(),
          },
          {
            text: "Finish",
            disabled: false,
            isSecondary: false,
            action: () => finishProcess(),
          },
        ]}
        image={SuccessSvg}
      >
        <div className={styles.shareButtons}>
          <a
            href="https://twitter.com/intent/tweet?url=https://hackedwalletrecovery.com&text=I%20have%20been%20helped%20to%20recover%20my%20assets%20with%20this%20amazing%20tool"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image width={40} src={TwitterSvg} alt={""} />
          </a>
          <a
            href="https://t.me/share/url?url=https://hackedwalletrecovery.com&text=I%20have%20been%20helped%20to%20recover%20my%20assets%20with%20this%20amazing%20tool"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image width={40} src={TelegramSvg} alt={""} />
          </a>
        </div>
      </CustomPortal>
    );
  }
  if (recoveryStatus === RecoveryProcessStatus.DONATE) {
    return(
      <CustomPortal
      title={"Support Our Mission"}
      description={
        "Your contribution can significantly impact our mission to provide safe and free tools that empower the community."
      }
      buttons={[
        {
          text: isDonationLoading ? "Sending..." : "Donate",
          disabled: isDonationLoading || !hasEnoughtEth || !address ,
          action: () => finishProcess(),
        },
      ]}
      image={TipsSvg}
    >
     
      <>
      <div className={styles.inputContainer}>
        <label className={styles.label} htmlFor="tip">
          Tip
        </label>
        <div className="mt-2" />
        <InputBase name="tip" placeholder="0.0" value={donationValue} onChange={setDonationValue} />
        <span className={`${styles.eth} text-base-100`}>ETH</span>
      </div>
      <p className={`text-secondary-content`}>Please change the network first to <b>{networkName}</b></p>
      </>
    </CustomPortal>
    )
  }

  return <></>;
};

interface IConnectSafeStepProps {
  startProcess: (arg: string) => void;
  hackedAddress: string;
  totalGasEstimate: BigNumber;
}
export const ConnectSafeStep = ({ hackedAddress, startProcess, totalGasEstimate }: IConnectSafeStepProps) => {
  const { address } = useAccount();
  const { balance } = useAccountBalance(address);
  const hasEnoughtEth = !!balance && balance > parseFloat(ethers.utils.formatEther(totalGasEstimate.toString()));
  const isConfirmBlocked = !address || address == hackedAddress || !hasEnoughtEth;
  return (
    <div className={styles.buttonContainer}>
      <CustomConnectButton />
      <div className="mt-4"></div>
      {!!address ? (
        <>
          {!hasEnoughtEth ? (
            <p className={`text-center text-secondary-content ${styles.warning}`}>
              This wallet doesn't have enough ETH to pay for the transactions.
            </p>
          ) : (
            <></>
          )}

          <CustomButton
            type="btn-primary"
            disabled={isConfirmBlocked}
            text={"Confirm"}
            onClick={() => {
              if (isConfirmBlocked) {
                return;
              }

              startProcess(address);
            }}
          />
        </>
      ) : (
        <></>
      )}
    </div>
  );
};
