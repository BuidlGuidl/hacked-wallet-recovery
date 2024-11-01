import React from "react";
import Head from "next/head";

type MetaHeaderProps = {
  title?: string;
  description?: string;
  image?: string;
  twitterCard?: string;
  children?: React.ReactNode;
};

const baseUrl = "https://hackedwalletrecovery.com/";

export const MetaHeader = ({
  title = "Hacked Wallet Recovery | Secure Ethereum Asset Recovery Tool",
  description = "Instantly recover assets from hacked Ethereum wallets using Flashbots. Bypass malicious sweepers, and securely transfer ERC20, NFTs, and other tokens to safety. Free, open-source tool trusted by the Web3 community.",
  image = "thumbnail.png",
  twitterCard = "summary_large_image",
  children,
}: MetaHeaderProps) => {
  const imageUrl = baseUrl + image;

  return (
    <Head>
      {title && (
        <>
          <title>{title}</title>
          <meta property="og:title" content={title} />
          <meta name="twitter:title" content={title} />
        </>
      )}
      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}
      {image && (
        <>
          <meta property="og:image" content={imageUrl} />
          <meta name="twitter:image" content={imageUrl} />
        </>
      )}
      {twitterCard && <meta name="twitter:card" content={twitterCard} />}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <script defer data-domain="hackedwalletrecovery.com" src="https://plausible.io/js/script.js"></script>
      {children}
    </Head>
  );
};
