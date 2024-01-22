export type RecoverableAssetTypes = "erc20" | "erc721" | "erc1155" | "custom";

export interface CoreTxToEstimate {
  from: `0x${string}`;
  to: `0x${string}`;
  data: `0x${string}`;
}

export interface CoreTxToSign extends CoreTxToEstimate {
  type?: "eip1559";
  maxFeePerGas?: string | bigint;
  maxPriorityFeePerGas?: string | bigint;
  gas?: string | bigint;
}

export interface ExtendedUnsignedTx {
  type: RecoverableAssetTypes;
  info: string;
  toEstimate: CoreTxToEstimate;
  toSign?: CoreTxToSign;
}

export interface CustomTx extends ExtendedUnsignedTx {}

export interface ERC20Tx extends ExtendedUnsignedTx {
  symbol: string;
  amount: string;
}

export interface ERC721Tx extends ExtendedUnsignedTx {
  symbol: string;
  tokenId: string;
}

export interface ERC1155Tx extends ExtendedUnsignedTx {
  symbol: string;
  tokenIds: string[];
  amounts: string[];
}

export type RecoveryTx = CustomTx | ERC20Tx | ERC721Tx | ERC1155Tx;

export interface AutoDetectedERC20Info {
  [contractAddress: string]: string; // address: balance
}

export interface AutoDetectedERC721Info {
  [contractAddress: string]: string[]; // address: tokenId[]
}

export interface AutoDetectedERC1155Info {
  [contractAddress: string]: {
    [tokenId: string]: string; // tokenId: balance
  };
}
