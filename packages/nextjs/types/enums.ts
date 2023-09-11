export enum BundlingSteps {
  _,
  ASSET_SELECTION,
  TX_BUNDLE,
  SIGN_RECOVERY_TXS,
}

export enum RecoveryProcessStatus {
  INITIAL,
  GAS_PAID,
  CLEAR_ACTIVITY_DATA,
  NO_CONNECTED_ACCOUNT,
  NO_SAFE_ACCOUNT,
  SWITCH_RPC_AND_PAY_GAS,
  // IMPOSSIBLE,
  INCREASE_PRIORITY_FEE,
  SWITCH_TO_HACKED_ACCOUNT,
  SIGN_RECOVERY_TXS,
  RECOVERY_TXS_SIGNED,
  SEND_BUNDLE,
  LISTEN_BUNDLE,
  DONATE,
  SUCCESS,
}
