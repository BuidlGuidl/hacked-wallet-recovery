import { ConnectButton } from "@rainbow-me/rainbowkit";
import {BlockieAvatar } from "~~/components/scaffold-eth";
/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const CustomConnectButton = () => {

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button className="btn btn-primary btn-sm" onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }


              return (
                <div className="px-2 flex justify-end items-center">
                  <div className="flex justify-center items-center">
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="pl-0 pr-2"
                    >
                      <BlockieAvatar address={account.address} size={24}  ensImage={account.ensAvatar} />
                      <span className="ml-2 mr-1">{account.address}</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
