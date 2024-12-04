import { useEffect } from "react";
import { ImpersonatorIframe, useImpersonatorIframe } from "@impersonator/iframe";
import { useReadLocalStorage } from "usehooks-ts";
import { mainnet } from "viem/chains";
import { getParsedError } from "~~/components/scaffold-eth";
import { IWrappedRecoveryTx } from "~~/hooks/flashbotRecoveryBundle/useAutodetectAssets";
import { CustomTx } from "~~/types/business";
import { notification } from "~~/utils/scaffold-eth";

const appUrl = "https://abi.ninja";
const selectedNetwork = mainnet;

export const AbiNinjaFlow = ({ addUnsignedTx }: { addUnsignedTx: (asset: IWrappedRecoveryTx) => void }) => {
  const hackedWalletAddress = useReadLocalStorage<string>("hackedAddress");
  const { latestTransaction } = useImpersonatorIframe();

  const isLatestTransactionPresent = Boolean(latestTransaction);
  useEffect(() => {
    const createCustomTx = async () => {
      try {
        // @ts-expect-error
        const contractAddress = latestTransaction.to;
        // @ts-expect-error
        const data = latestTransaction.data;
        // @ts-expect-error
        const value = latestTransaction.value;

        const customTx: CustomTx = {
          type: "custom-abininja",
          info: `Custom abininja call to ${contractAddress} with data ${data}`,
          toEstimate: {
            from: hackedWalletAddress as `0x${string}`,
            to: contractAddress,
            data: data,
            value: value,
          },
        };

        addUnsignedTx({ tx: customTx });
        notification.success("Custom transaction added to the list");
      } catch (e: any) {
        const message = getParsedError(e);
        notification.error(message);
        console.error(e);
      }
    };

    if (isLatestTransactionPresent) {
      createCustomTx();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLatestTransactionPresent, hackedWalletAddress]);

  return (
    <div className="flex flex-col gap-1">
      {hackedWalletAddress && (
        <div className="flex items-center flex-col flex-grow p-4 rounded-md h-[55vh]">
          <div className="border-2 border-gray-500 rounded-md w-full overflow-auto">
            <div className="w-full rounded-md p-1 h-[650px]">
              <ImpersonatorIframe
                key={selectedNetwork.name + hackedWalletAddress + appUrl}
                height="100%"
                width="100%"
                src={appUrl}
                address={hackedWalletAddress}
                rpcUrl={selectedNetwork.rpcUrls.default.http[0]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
