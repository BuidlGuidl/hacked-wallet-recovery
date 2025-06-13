import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BigNumber } from "ethers";
import { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { parseEther } from "viem";
import { useAccount, usePrepareSendTransaction, useSendTransaction } from "wagmi";
import { CustomPortal } from "~~/components/CustomPortal/CustomPortal";
import { MetaHeader } from "~~/components/MetaHeader";
import { BundlingProcess } from "~~/components/Processes/BundlingProcess/BundlingProcess";
import { HackedAddressProcess } from "~~/components/Processes/HackedAddressProcess/HackedAddressProcess";
import { RecoveryProcess } from "~~/components/Processes/RecoveryProcess/RecoveryProcess";
import { useRecoveryProcess } from "~~/hooks/flashbotRecoveryBundle/useRecoveryProcess";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import ErrorSvg from "~~/public/assets/flashbotRecovery/error.svg";
import GasSvg from "~~/public/assets/flashbotRecovery/gas-illustration.svg";
import { BundlingSteps, RecoveryProcessStatus } from "~~/types/enums";
import { CONTRACT_ADDRESS } from "~~/utils/constants";

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

const Home: NextPage = () => {
  const { isConnected: walletConnected, address: connectedAddress } = useAccount();
  const [safeAddress, setSafeAddress] = useLocalStorage<string>("safeAddress", "");
  const [hackedAddress, setHackedAddress] = useLocalStorage<string>("hackedAddress", "");
  const [totalGasEstimate, setTotalGasEstimate] = useState<BigNumber>(BigNumber.from("0"));
  const [rpcParams, setRpcParams] = useState<IRPCParams>();
  const [isOnBasket, setIsOnBasket] = useState(false);
  const [currentBundleId, setCurrentBundleId] = useLocalStorage<string>("bundleUuid", "");
  const { error, resetError, isFinalProcessError } = useShowError();
  const [donationValue, setDonationValue] = useState<string>("");
  const [show7702WarningModal, setShow7702WarningModal] = useState(true);
  const {
    data: processStatus,
    startRecoveryProcess,
    signTransactionsStep,
    signRecoveryTransactions,
    attemptedBlock,
    showTipsModal,
    unsignedTxs,
    generateCorrectTransactions,
    setUnsignedTxs,
    validateBundleIsReady,
  } = useRecoveryProcess();

  const { config } = usePrepareSendTransaction({
    to: CONTRACT_ADDRESS,
    value: undefined,
  });
  const {
    data,
    isLoading: isDonationLoading,
    isSuccess: isDonationSuccess,
    sendTransaction,
  } = useSendTransaction(config);

  const startSigning = (address: string) => {
    const transformedTransactions = generateCorrectTransactions({
      transactions: unsignedTxs,
      safeAddress: address,
      hackedAddress,
    });
    setUnsignedTxs(transformedTransactions);
    signRecoveryTransactions(hackedAddress, unsignedTxs, currentBundleId, false);
  };

  const startRecovery = () => {
    const transformedTransactions = generateCorrectTransactions({
      transactions: unsignedTxs,
      safeAddress,
      hackedAddress,
    });
    setUnsignedTxs(transformedTransactions);
    startRecoveryProcess({
      safeAddress,
      hackedAddress,
      currentBundleId,
      transactions: transformedTransactions,
      modifyBundleId: setCurrentBundleId,
      setRpcParams,
    });
  };

  const signTransactions = async () => {
    await signTransactionsStep({
      hackedAddress,
      currentBundleId,
      transactions: unsignedTxs,
    });
  };
  const getActiveStep = () => {
    if (processStatus === RecoveryProcessStatus.SUCCESS || processStatus === RecoveryProcessStatus.DONATE) {
      return BundlingSteps.SIGN_RECOVERY_TXS;
    }

    if (!!isOnBasket) {
      return BundlingSteps.ASSET_SELECTION;
    }
    if (processStatus !== RecoveryProcessStatus.INITIAL) {
      return BundlingSteps.SIGN_RECOVERY_TXS;
    }
    //TODO review why disappears
    if (unsignedTxs.length > 0) {
      return BundlingSteps.TX_BUNDLE;
    }
    if (hackedAddress !== "") {
      return BundlingSteps.ASSET_SELECTION;
    }
    return BundlingSteps._;
  };

  const cleanApp = () => {
    localStorage.clear();
    window.location.reload();
  };

  const finishProcess = () => {
    if (!donationValue) {
      cleanApp();
      return;
    }
    if (parseEther(donationValue) > 0) {
      sendTransaction?.({ ...config, value: parseEther(donationValue) });
    }
  };

  useEffect(() => {
    if (isDonationSuccess) {
      cleanApp();
    }
  }, [isDonationSuccess]);

  return (
    <>
      <MetaHeader />
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {show7702WarningModal && (
          <CustomPortal
            title="Hackers have been busy..."
            description="After the Pectra upgrade, hackers have started using 7702 authorizations to instantly drain funds sent to leaked wallets. This tool will not be able to help recover assets in a wallet that has these authorizations. If you are a developer you could attempt to recover assets using <a href='https://github.com/pcaversaccio/white-hat-frontrunning'>a script</a>. Otherwise you will need to reach out to a <a href='https://github.com/security-alliance/seal-911'>whitehat hacker</a> to help you with a recovery."
            buttons={[
              {
                text: "Ignore",
                disabled: false,
                isSecondary: true,
                action: () => setShow7702WarningModal(false),
              },
            ]}
            close={() => setShow7702WarningModal(false)}
          />
        )}

        <HackedAddressProcess
          isVisible={!hackedAddress}
          onSubmit={(hacked, safe) => {
            setHackedAddress(hacked);
            setSafeAddress(safe);
          }}
        />

        <BundlingProcess
          isVisible={!!hackedAddress}
          activeStep={getActiveStep()}
          hackedAddress={hackedAddress}
          safeAddress={safeAddress}
          totalGasEstimate={totalGasEstimate}
          unsignedTxs={unsignedTxs}
          setHackedAddress={setHackedAddress}
          setSafeAddress={setSafeAddress}
          setUnsignedTxs={setUnsignedTxs}
          setIsOnBasket={setIsOnBasket}
          setTotalGasEstimate={setTotalGasEstimate}
          startRecovery={() => validateBundleIsReady("")}
        />

        <RecoveryProcess
          recoveryStatus={processStatus}
          donationValue={donationValue}
          signTransactionsStep={signTransactions}
          setDonationValue={atm => setDonationValue(atm)}
          isDonationLoading={isDonationLoading}
          finishProcess={() => finishProcess()}
          startSigning={address => startSigning(address)}
          totalGasEstimate={totalGasEstimate}
          showTipsModal={showTipsModal}
          startProcess={startRecovery}
          attemptedBlock={attemptedBlock}
          connectedAddress={connectedAddress}
          safeAddress={safeAddress}
          hackedAddress={hackedAddress}
          rpcParams={rpcParams}
        />

        {isFinalProcessError && error != "" ? (
          <CustomPortal close={() => resetError()} title={"Something went wrong"} description={error} image={GasSvg} />
        ) : error != "" ? (
          <CustomPortal
            close={() => resetError()}
            title={"Something went wrong"}
            description={error}
            image={isFinalProcessError ? GasSvg : ErrorSvg}
          />
        ) : (
          <></>
        )}
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
});
