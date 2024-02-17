import {
  FlashbotsBundleProvider,
  FlashbotsTransactionResponse,
  RelayResponseError,
} from "@flashbots/ethers-provider-bundle";
import { ethers } from "ethers";

const goerliProvider = new ethers.providers.InfuraProvider("goerli", "416f5398fa3d4bb389f18fd3fa5fb58c");
const goerliFlashbotProvider = await FlashbotsBundleProvider.create(
  goerliProvider,
  ethers.Wallet.createRandom(),
  "https://relay-goerli.flashbots.net/",
  "goerli",
);

export default async function handler(req: any, res: any) {
  const body = req.body;
  if (!body || !body.txs || body.txs.length == 0) {
    res.status(400).json({ reason: "Bad bundle" });
  }

  const reformattedBundle: string[] = body.txs.map((signedTx: any) => {
    return signedTx;
  });

  const targetBlockNumber = (await goerliProvider.getBlockNumber()) + 1;
  const flashbotsTransactionResponse = await goerliFlashbotProvider.sendRawBundle(reformattedBundle, targetBlockNumber);

  console.log(`@@@@@@ Bundle submitted targetting block#${targetBlockNumber}`);

  if (Object.hasOwn(flashbotsTransactionResponse, "error")) {
    const errorResponse = flashbotsTransactionResponse as RelayResponseError;
    res.status(203).json({
      response: `Bundle reverted with error: ${errorResponse.error.message}`,
      success: false,
    });
    console.log(`@@@@@@ Bundle reverted with error: ${errorResponse.error}`);
    return;
  }

  const submissionResponse = flashbotsTransactionResponse as FlashbotsTransactionResponse;
  console.log(`@@@@@@ Waiting for resolution....`);
  const bundleResolution = await submissionResponse.wait();

  // BundleIncluded
  if (bundleResolution == 0) {
    res.status(203).json({
      response: `Bundle successfully included in block number ${targetBlockNumber}!!`,
      success: true,
      simulationResult: null,
    });
    console.log(`@@@@@@ Bundle successfully included in block number ${targetBlockNumber}!!`);
    return;
  }

  // BlockPassedWithoutInclusion
  if (bundleResolution == 1) {
    res.status(203).json({
      response: `BlockPassedWithoutInclusion.`,
      success: false,
      simulationResult: null,
    });
    console.log(`@@@@@@ BlockPassedWithoutInclusion.`);
    return;
  }

  // AccountNonceTooHigh
  if (bundleResolution == 2) {
    res.status(203).json({
      response: `Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
      success: false,
      simulationResult: null,
    });
    console.log(
      `@@@@@@ Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
    );
    return;
  }

  res.status(203).json({
    response: `Unexpected state`,
    success: false,
    simulationResult: null,
  });
}
