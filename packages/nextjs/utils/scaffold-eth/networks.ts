import * as chains from "wagmi/chains";
import scaffoldConfig from "~~/scaffold.config";

export type TChainAttributes = {
  color: string | [string, string];
  nativeCurrencyTokenAddress?: string;
};

export type NetworkConfig = {
  relayUrl: string;
  bundleCacheApiUrl: string;
  blockExplorerUrl: string;
  alchemyUrl: string;
};

// Only keep mainnet and sepolia configurations
export const NETWORKS_EXTRA_DATA: Record<string, TChainAttributes> = {
  [chains.hardhat.id]: {
    color: "#b8af0c",
  },
  [chains.mainnet.id]: {
    color: "#ff8b9e",
  },
  [chains.sepolia.id]: {
    color: ["#5f4bb6", "#87ff65"],
  },
};

/**
 * Gives the block explorer transaction URL.
 * @param network
 * @param txnHash
 * @dev returns empty string if the network is localChain
 */
export function getBlockExplorerTxLink(chainId: number, txnHash: string) {
  const chainNames = Object.keys(chains);

  const targetChainArr = chainNames.filter(chainName => {
    const wagmiChain = chains[chainName as keyof typeof chains];
    return wagmiChain.id === chainId;
  });

  if (targetChainArr.length === 0) {
    return "";
  }

  const targetChain = targetChainArr[0] as keyof typeof chains;
  // @ts-expect-error : ignoring error since `blockExplorers` key may or may not be present on some chains
  const blockExplorerTxURL = chains[targetChain]?.blockExplorers?.default?.url;

  if (!blockExplorerTxURL) {
    return "";
  }

  return `${blockExplorerTxURL}/tx/${txnHash}`;
}

export const getNetworkConfig = (network: chains.Chain): NetworkConfig => {
  const isSepolia = network.id === chains.sepolia.id;

  return {
    relayUrl: isSepolia ? "https://relay-sepolia.flashbots.net" : "https://relay.flashbots.net",
    bundleCacheApiUrl: isSepolia ? "https://rpc-sepolia.flashbots.net" : "https://rpc.flashbots.net",
    blockExplorerUrl: isSepolia ? "https://sepolia.etherscan.io" : "https://etherscan.io",
    alchemyUrl: isSepolia ? "https://eth-sepolia.g.alchemy.com/v2" : "https://eth-mainnet.alchemyapi.io/v2",
  };
};

export function getTargetNetwork(): chains.Chain & Partial<TChainAttributes> {
  const configuredNetwork = scaffoldConfig.targetNetwork;
  return {
    ...configuredNetwork,
    ...NETWORKS_EXTRA_DATA[configuredNetwork.id],
  };
}

/**
 * Gives the block explorer Address URL.
 * @param network - wagmi chain object
 * @param address
 * @returns block explorer address URL and etherscan URL if block explorer URL is not present for wagmi network
 */
export function getBlockExplorerAddressLink(network: chains.Chain, address: string) {
  const blockExplorerBaseURL = network.blockExplorers?.default?.url;
  if (network.id === chains.hardhat.id) {
    return `/blockexplorer/address/${address}`;
  }

  if (!blockExplorerBaseURL) {
    return `https://etherscan.io/address/${address}`;
  }

  return `${blockExplorerBaseURL}/address/${address}`;
}

/**
 * @returns targetNetwork object consisting targetNetwork from scaffold.config and extra network metadata
 */
