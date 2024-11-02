import Document, { Head, Html, Main, NextScript } from "next/document";

export default class MyDocument extends Document {
  render() {
    const title = "Hacked Wallet Recovery | Secure Ethereum Asset Recovery Tool";
    const description =
      "Instantly recover assets from hacked Ethereum wallets using Flashbots. Bypass malicious sweepers, and securely transfer ERC20, NFTs, and other tokens to safety. Free, open-source tool trusted by the Web3 community.";
    const baseUrl = "https://hackedwalletrecovery.com";
    const imageUrl = `${baseUrl}/thumbnail.png`;

    return (
      <Html lang="en">
        <Head>
          {/* Primary Meta Tags */}
          <meta name="description" content={description} />

          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content={baseUrl} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={imageUrl} />

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@buidlguidl" />
          <meta name="twitter:domain" content="hackedwalletrecovery.com" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:image" content={imageUrl} />

          {/* Favicons for different platforms */}
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
          {/* This is the key meta tag for Google search results favicon */}
          <link rel="shortcut icon" href="/favicon.ico" />

          {/* Analytics */}
          <script defer data-domain="hackedwalletrecovery.com" src="https://plausible.io/js/script.js" />
        </Head>
        <body>
          <Main />
          <div id="myportal" />
          <div id="myportal2" />
          <NextScript />
        </body>
      </Html>
    );
  }
}
