import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BigNumber } from "ethers";
import { NextPage } from "next";
import { useDebounce, useLocalStorage } from "usehooks-ts";
import { useAccount, useNetwork, usePrepareSendTransaction, useSendTransaction, useSwitchNetwork, useWaitForTransaction } from "wagmi";
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
import { CONTRACT_ADDRESS } from "~~/utils/constants";
import { parseEther } from "viem";
import { NETWORKS_EXTRA_DATA, getTargetNetwork } from "~~/utils/scaffold-eth";

const Home: NextPage = () => {
  const { isConnected: walletConnected, address: connectedAddress } = useAccount();
  const [safeAddress, setSafeAddress] = useLocalStorage<string>("toAddress", "");
  const [hackedAddress, setHackedAddress] = useLocalStorage<string>("hackedAddress", "");
  const [unsignedTxs, setUnsignedTxs] = useLocalStorage<RecoveryTx[]>("unsignedTxs", []);
  const [totalGasEstimate, setTotalGasEstimate] = useState<BigNumber>(BigNumber.from("0"));
  const [isOnBasket, setIsOnBasket] = useState(false);
  const [currentBundleId, setCurrentBundleId] = useLocalStorage<string>("bundleUuid", "");
  const { error, resetError,isFinalProcessError} = useShowError();
  const [donationValue, setDonationValue] = useState<string>("");
  const targetNetwork = getTargetNetwork();
  const { chain } = useNetwork()
  const { chains, isLoading, pendingChainId, switchNetworkAsync } =
    useSwitchNetwork()
  const {
    data: processStatus,
    startRecoveryProcess,
    signRecoveryTransactions,
    blockCountdown,
    showTipsModal,
  } = useRecoveryProcess();

  const [debouncedAmount] = useDebounce(donationValue, 500)
 
  const { config } = usePrepareSendTransaction({
    to: CONTRACT_ADDRESS,
    value: debouncedAmount ? parseEther(debouncedAmount) : undefined,
  })
  const { data, sendTransaction } = useSendTransaction(config)
 
  const { isLoading:isDonationLoading, isSuccess:isDonationSuccess } = useWaitForTransaction({
    hash: data?.hash,
  })


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

  const cleanApp = () => {
    localStorage.clear();
    window.location.reload();
  }
  const finishProcess = () => {
    if(parseEther(donationValue) > 0 && !!sendTransaction){
      //TODO HELP HERE GET OUT OF THE RPC
      // switchNetworkAsync?.(5);
      // sendTransaction({...config,
      //   chainId:targetNetwork.id,
      //   value:donationValue ? parseEther(donationValue) : undefined})
      return
    }
    cleanApp()
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
          donationValue={donationValue}
          setDonationValue={(atm) => setDonationValue(atm)}
          isDonationLoading={isDonationLoading}
          finishProcess={() => finishProcess()}
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
