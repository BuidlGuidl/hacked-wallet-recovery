import { useState } from "react";
import dynamic from "next/dynamic";
import { BigNumber } from "ethers";
import { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { useAccount } from "wagmi";
import { CustomHeader } from "~~/components/CustomHeader/CustomHeader";
import { CustomPortal } from "~~/components/CustomPortal/CustomPortal";
import { MetaHeader } from "~~/components/MetaHeader";
import { BundlingProcess } from "~~/components/Processes/BundlingProcess/BundlingProcess";
import { ConnectionProcess } from "~~/components/Processes/ConnectionProcess/ConnectionProcess";
import { RecoveryProcess } from "~~/components/Processes/RecoveryProcess/RecoveryProcess";
import { useRecoveryProcess } from "~~/hooks/flashbotRecoveryBundle/useRecoveryProcess";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import GasSvg from "~~/public/assets/flashbotRecovery/gas-illustration.svg";

import ErrorSvg from "~~/public/assets/flashbotRecovery/error.svg";
import { BundlingSteps, RecoveryProcessStatus } from "~~/types/enums";
import { RecoveryTx } from "~~/types/business";

const Home: NextPage = () => {
  const { isConnected: walletConnected, address: connectedAddress } = useAccount();
  const [safeAddress, setSafeAddress] = useLocalStorage<string>("toAddress", "");
  const [hackedAddress, setHackedAddress] = useLocalStorage<string>("hackedAddress", "");
  const [unsignedTxs, setUnsignedTxs] = useLocalStorage<RecoveryTx[]>("unsignedTxs", []);
  const [totalGasEstimate, setTotalGasEstimate] = useState<BigNumber>(BigNumber.from("0"));
  const [isOnBasket, setIsOnBasket] = useState(false);
  const [currentBundleId, setCurrentBundleId] = useLocalStorage<string>("bundleUuid", "");
  const { error, resetError,isFinalProcessError} = useShowError();

  const {
    data: processStatus,
    startRecoveryProcess,
    signRecoveryTransactions,
    blockCountdown,
    showTipsModal,
  } = useRecoveryProcess();

  const startSigning = () => {
    signRecoveryTransactions(hackedAddress, unsignedTxs, currentBundleId, false);
  };
  const startRecovery = () => {
    startRecoveryProcess({
      safeAddress,
      modifyBundleId: setCurrentBundleId,
      totalGas: totalGasEstimate,
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
    if (unsignedTxs.length > 0) {
      return BundlingSteps.TX_BUNDLE;
    }
    if (hackedAddress !== "") {
      return BundlingSteps.ASSET_SELECTION;
    }
    return BundlingSteps.HACKED_ADDRESS_INPUT;
  };

  const reload = () => {
    localStorage.clear();
    window.location.reload();
  };

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
        <ConnectionProcess
          isVisible={!walletConnected}
          safeAddress={safeAddress}
          setSafeAddress={setSafeAddress}
          connectedAddress={connectedAddress}
        />

        <BundlingProcess
          isVisible={walletConnected}
          activeStep={getActiveStep()}
          hackedAddress={hackedAddress}
          safeAddress={safeAddress}
          totalGasEstimate={totalGasEstimate}
          unsignedTxs={unsignedTxs}
          setHackedAddress={setHackedAddress}
          setUnsignedTxs={setUnsignedTxs}
          setIsOnBasket={setIsOnBasket}
          setTotalGasEstimate={setTotalGasEstimate}
          startRecovery={startRecovery}
        />

        <RecoveryProcess
          recoveryStatus={processStatus}
          finishProcess={reload}
          startSigning={startSigning}
          showTipsModal={showTipsModal}
          startProcess={startRecovery}
          blockCountdown={blockCountdown}
          connectedAddress={connectedAddress}
          safeAddress={safeAddress}
          hackedAddress={hackedAddress}
        />
        
        {error != "" ? (
          <CustomPortal
            close={() => resetError()}
            title={"Something wrong has happend"}
            description={error}
            image={isFinalProcessError ? GasSvg:ErrorSvg}
          />
        ) : <></>}
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
});
