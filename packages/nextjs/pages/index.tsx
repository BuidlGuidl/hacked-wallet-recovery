import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BigNumber } from "ethers";
import { NextPage } from "next";
import { useLocalStorage } from "usehooks-ts";
import { useAccount, usePrepareSendTransaction, useSendTransaction } from "wagmi";
import { CustomPortal } from "~~/components/CustomPortal/CustomPortal";
import { MetaHeader } from "~~/components/MetaHeader";
import { BundlingProcess } from "~~/components/Processes/BundlingProcess/BundlingProcess";
import { HackedAddressProcess } from "~~/components/Processes/HackedAddressProcess/HackedAddressProcess";
import { RecoveryProcess } from "~~/components/Processes/RecoveryProcess/RecoveryProcess";
import { useRecoveryProcess } from "~~/hooks/flashbotRecoveryBundle/useRecoveryProcess";
import { useShowError } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import GasSvg from "~~/public/assets/flashbotRecovery/gas-illustration.svg";
import ErrorSvg from "~~/public/assets/flashbotRecovery/error.svg";
import { BundlingSteps, RecoveryProcessStatus } from "~~/types/enums";
import { CONTRACT_ADDRESS, DUMMY_ADDRESS } from "~~/utils/constants";
import { parseEther } from "viem";

const Home: NextPage = () => {
  const { isConnected: walletConnected, address: connectedAddress } = useAccount();
  const [safeAddress, setSafeAddress] = useState(DUMMY_ADDRESS);
  const [hackedAddress, setHackedAddress] = useLocalStorage<string>("hackedAddress", "");
  const [totalGasEstimate, setTotalGasEstimate] = useState<BigNumber>(BigNumber.from("0"));
  const [isOnBasket, setIsOnBasket] = useState(false);
  const [currentBundleId, setCurrentBundleId] = useLocalStorage<string>("bundleUuid", "");
  const { error, resetError,isFinalProcessError} = useShowError();
  const [donationValue, setDonationValue] = useState<string>("");
  const {
    data: processStatus,
    startRecoveryProcess,
    signRecoveryTransactions,
    blockCountdown,
    showTipsModal,
    unsignedTxs,
    generateCorrectTransactions,
    setUnsignedTxs,
    validateBundleIsReady,
  } = useRecoveryProcess();
 

  const { config } = usePrepareSendTransaction({
    to: CONTRACT_ADDRESS,
    value: undefined,
  })
  const { data, isLoading:isDonationLoading, isSuccess:isDonationSuccess, sendTransaction } =
    useSendTransaction(config)

  
  const startSigning = (address:string) => {
    const transformedTransactions = generateCorrectTransactions({ transactions:unsignedTxs, safeAddress:address, hackedAddress });
    setUnsignedTxs(transformedTransactions);
    signRecoveryTransactions(hackedAddress, unsignedTxs, currentBundleId, false);
  };
  const startRecovery = (safe: string) => {
    setSafeAddress(safe);
    const transformedTransactions = generateCorrectTransactions({ transactions:unsignedTxs, safeAddress:safe, hackedAddress });
    setUnsignedTxs(transformedTransactions);
    startRecoveryProcess({
      safeAddress: safe,
      modifyBundleId: setCurrentBundleId,
      totalGas: totalGasEstimate,
      hackedAddress,
      currentBundleId,
      transactions: transformedTransactions,
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
  }
  const finishProcess = () => {
    if(!donationValue){
      cleanApp()
      return;
    }
    if(parseEther(donationValue)>0){
      sendTransaction?.({...config, value:parseEther(donationValue)})
    }
 
  };

  useEffect(() => {

    if(isDonationSuccess){
      cleanApp()
    }

  },[isDonationSuccess])

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
        <HackedAddressProcess isVisible={!hackedAddress} onSubmit={newAddress => setHackedAddress(newAddress)} />

        <BundlingProcess
          isVisible={!!hackedAddress}
          activeStep={getActiveStep()}
          hackedAddress={hackedAddress}
          safeAddress={safeAddress}
          totalGasEstimate={totalGasEstimate}
          unsignedTxs={unsignedTxs}
          setHackedAddress={setHackedAddress}
          setUnsignedTxs={setUnsignedTxs}
          setIsOnBasket={setIsOnBasket}
          setTotalGasEstimate={setTotalGasEstimate}
          startRecovery={() => validateBundleIsReady("")}
        />

        <RecoveryProcess
          recoveryStatus={processStatus}
          donationValue={donationValue}
          setDonationValue={(atm) => setDonationValue(atm)}
          isDonationLoading={isDonationLoading}
          finishProcess={() => finishProcess()}
          startSigning={(address) =>startSigning(address)}
          totalGasEstimate={totalGasEstimate}
          showTipsModal={showTipsModal}
          startProcess={add => startRecovery(add)}
          blockCountdown={blockCountdown}
          connectedAddress={connectedAddress}
          safeAddress={safeAddress}
          hackedAddress={hackedAddress}
        />
        
        {isFinalProcessError && error != "" ? (
          <CustomPortal
            close={() => resetError()}
            title={"Something wrong has happend"}
            description={error}
            image={GasSvg}
          />
        ) : error != "" ? (
          <CustomPortal
            close={() => resetError()}
            title={"Something wrong has happend"}
            description={error}
            image={isFinalProcessError ? GasSvg:ErrorSvg}
          />
        ):<></>}
      </div>
    </>
  );
};

export default dynamic(() => Promise.resolve(Home), {
  ssr: false,
});
