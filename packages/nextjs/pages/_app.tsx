import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import { ImpersonatorIframeProvider } from "@impersonator/iframe";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import NextNProgress from "nextjs-progressbar";
import { Toaster } from "react-hot-toast";
import { useDarkMode } from "usehooks-ts";
import { WagmiConfig } from "wagmi";
import { Footer } from "~~/components/Footer";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ErrorProvider } from "~~/hooks/flashbotRecoveryBundle/useShowError";
import { useNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { useGlobalState } from "~~/services/store/store";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { appChains } from "~~/services/web3/wagmiConnectors";
import "~~/styles/globals.css";

const ScaffoldEthApp = ({ Component, pageProps }: AppProps) => {
  const price = useNativeCurrencyPrice();
  const setNativeCurrencyPrice = useGlobalState(state => state.setNativeCurrencyPrice);
  // This variable is required for initial client side rendering of correct theme for RainbowKit
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    if (price > 0) {
      setNativeCurrencyPrice(price);
    }
  }, [setNativeCurrencyPrice, price]);

  useEffect(() => {
    setIsDarkTheme(isDarkMode);
  }, [isDarkMode]);

  return (
    <WagmiConfig config={wagmiConfig}>
      <NextNProgress />
      <ImpersonatorIframeProvider>
        <RainbowKitProvider
          chains={appChains.chains}
          avatar={BlockieAvatar}
          theme={isDarkTheme ? darkTheme() : lightTheme()}
        >
          <ErrorProvider>
            <div className="flex flex-col min-h-screen" style={{ overflowY: "auto", overflowX: "hidden" }}>
              {/* <Header /> */}
              <main className="relative flex flex-col flex-1">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
            <Toaster />
          </ErrorProvider>
        </RainbowKitProvider>
      </ImpersonatorIframeProvider>
    </WagmiConfig>
  );
};

export default ScaffoldEthApp;
