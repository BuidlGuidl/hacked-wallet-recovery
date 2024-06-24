import React, { useState } from "react";
import Image from "next/image";
import styles from "./recoveryProcess.module.css";
import { BigNumber, ethers } from "ethers";
import { useAccount } from "wagmi";
import { CustomButton } from "~~/components/CustomButton/CustomButton";
import { CustomConnectButton } from "~~/components/CustomConnectButton/CustomConnectButton";
import { CustomPortal } from "~~/components/CustomPortal/CustomPortal";
import { InputBase } from "~~/components/scaffold-eth";
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

interface IRPCParams {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

interface IProps {
  recoveryStatus: RecoveryProcessStatus;
  startSigning: (connectedAddress: string) => void;
  finishProcess: () => void;
  signTransactionsStep: () => void;
  showTipsModal: () => void;
  startProcess: (arg: string) => void;
  connectedAddress: string | undefined;
  safeAddress: string;
  hackedAddress: string;
  donationValue: string;
  setDonationValue: (amt: string) => void;
  attemptedBlock: number;
  isDonationLoading: boolean;
  totalGasEstimate: BigNumber;
  rpcParams: IRPCParams | undefined;
}

export const RecoveryProcess = ({
  recoveryStatus,
  startSigning,
  startProcess,
  signTransactionsStep,
  finishProcess,
  showTipsModal,
  attemptedBlock,
  donationValue,
  setDonationValue,
  connectedAddress,
  isDonationLoading,
  hackedAddress,
  totalGasEstimate,
  rpcParams,
}: IProps) => {
  const { showError } = useShowError();
  const { address } = useAccount();
  const { balance } = useAccountBalance(address);
  const networkName = getTargetNetwork().name;
  const hasEnoughEth = !!balance ? balance > parseFloat(donationValue) : false;
  const showDonationsButton = process.env.NEXT_PUBLIC_SHOW_DONATIONS ?? false;
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
        title={"Connect to a safe wallet"}
        description={
          "Connect a wallet that has some funds to pay network fees so you can recover the assets contained in your hacked wallet."
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

  if (recoveryStatus == RecoveryProcessStatus.CHANGE_RPC) {
    // If RPC params are provided, we need to give instructions for switching to the RPC
    if (rpcParams) {
      const { rpcUrls } = rpcParams;
      const url = rpcUrls[0];
      const chainId = Number(rpcParams.chainId);
      return (
        <CustomPortal
          title={"Switch Network"}
          description={
            "Confirm the network has been changed or manually add the following network to your wallet. This is a crucial step to ensure the hacker doesn't see your funds until your recovery is complete."
          }
          buttons={[
            {
              text: "the network has been added",
              disabled: false,
              action: signTransactionsStep,
            },
          ]}
          image={HackedWalletSvg}
        >
          <div className={styles.rpcContainer}>
            <div className={styles.rpc}>
              <p className={styles.rpcTitle}>Network Name</p>
              <p className="">Hacked Wallet Recovery RPC</p>
              <p className={styles.rpcTitle}>Network RPC URL</p>
              <p className="">{url}</p>
              <p className={styles.rpcTitle}>Chain ID</p>
              <p className="">{chainId}</p>
              <p className={styles.rpcTitle}>Currency Symbol</p>
              <p className="">ETH</p>
            </div>
          </div>
        </CustomPortal>
      );
    } else {
      return (
        <CustomPortal
          title={"Switching Network"}
          description={
            "Now we will switch to a shielded network to recover your assets without the hacker noticing. Approve the network change in your wallet."
          }
          image={SwitchNetworkSvg}
        />
      );
    }
  }

  if (recoveryStatus == RecoveryProcessStatus.PAY_GAS) {
    return (
      <CustomPortal
        title={"The Funding Transaction"}
        description={"Now we will send a transaction to fund the hacked wallet so it can recover the assets."}
        image={SwitchNetworkSvg}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.SWITCH_TO_HACKED_ACCOUNT) {
    return (
      <CustomPortal
        title={"Switch to Hacked Wallet"}
        description={"To proceed with recovering your assets, switch to the hacked wallet."}
        buttons={[
          {
            text: "Continue",
            disabled: connectedAddress !== hackedAddress,
            action: !!connectedAddress ? () => startSigning(connectedAddress) : () => {},
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
          "Now you will be prompted to sign a transaction for each asset you selected for recovery. Approve each transaction as it appears. Ignore pending transaction warnings."
        }
        image={MultiSignSvg}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.LISTEN_BUNDLE) {
    return (
      <CustomPortal
        title={"Wait for confirmation"}
        description={
          "Your asset recovery is in progress. Stay on this page and wait while we attempt to include your transactions in a block."
        }
        image={ClockSvg}
        indicator={attemptedBlock}
      />
    );
  }

  if (recoveryStatus == RecoveryProcessStatus.SUCCESS) {
    let actions: any[] = [
      {
        text: "Finish",
        disabled: false,
        isSecondary: false,
        action: () => finishProcess(),
      },
    ];
    if (showDonationsButton) {
      actions.unshift({
        text: "Donate",
        isSecondary: true,
        disabled: false,
        action: () => showTipsModal(),
      });
    }
    return (
      <CustomPortal
        title={"Your assets have been recovered!"}
        description={
          "Check the safe wallet for your recovered assets. Share your experience with others and consider supporting this project with a donation so we can continue to offer this service free of charge."
        }
        buttons={actions}
        image={SuccessSvg}
      >
        <div className={styles.shareButtons}>
          <a
            href="https://twitter.com/intent/tweet?url=https://hackedwalletrecovery.com&text=This%20project%20helped%20me%20recover%20my%20assets%20from%20a%20hacked%20wallet.%20I%20highly%20recommend%20it%20to%20anyone%20in%20a%20similar%20situation"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image width={40} src={TwitterSvg} alt={""} />
          </a>
          <a
            href="https://t.me/share/url?url=https://hackedwalletrecovery.com&text=This%20project%20helped%20me%20recover%20my%20assets%20from%20a%20hacked%20wallet.%20I%20highly%20recommend%20it%20to%20anyone%20in%20a%20similar%20situation"
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
    return (
      <CustomPortal
        title={"Support Our Mission"}
        description={
          "Your contribution will help us continue to offer this service free of charge. Thank you for your support!"
        }
        buttons={[
          {
            text: isDonationLoading ? "Sending..." : "Donate",
            disabled: isDonationLoading || !hasEnoughEth || !address,
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
            <InputBase
              name="tip"
              placeholder="0.0"
              value={donationValue}
              onChange={val => setDonationValue(val.replace(",", "."))}
            />
            <span className={`${styles.eth} text-base-100`}>ETH</span>
          </div>
          <p className={`text-secondary-content`}>
            Please change the network first to <b>{networkName}</b>
          </p>
        </>
      </CustomPortal>
    );
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
  const hasEnoughEth = !!balance && balance > parseFloat(ethers.utils.formatEther(totalGasEstimate.toString()));
  const isConfirmBlocked = !address || address == hackedAddress || !hasEnoughEth;
  return (
    <div className={styles.buttonContainer}>
      <CustomConnectButton />
      <div className="mt-4"></div>
      {!!address ? (
        <>
          {!hasEnoughEth ? (
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
