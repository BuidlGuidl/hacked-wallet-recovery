import {
  FlashbotsBundleProvider,
  FlashbotsBundleResolution,
  FlashbotsTransactionResponse,
  RelayResponseError,
} from "@flashbots/ethers-provider-bundle";
import { ethers } from "ethers";
export const maxDuration = 240
const mainnetProvider = new ethers.providers.InfuraProvider(1, "416f5398fa3d4bb389f18fd3fa5fb58c");
const flashbotProvider = await FlashbotsBundleProvider.create(
  mainnetProvider,
  ethers.Wallet.createRandom(),
  "https://relay.flashbots.net/",
);

export default async function handler(req: any, res: any) {
  const body = req.body;
  if (!body || !body.txs || body.txs.length == 0) {
    res.status(400).json({ reason: "Bad bundle" });
  }

  const reformattedBundle = body.txs.map((signedTx: any) => {
    return { signedTransaction: signedTx };
  });

  let retries = 5;
  while (retries > 0) {
    // console.log(`@@@@@@ TRIAL #${3 - retries} OUT OF ${retries} @@@@@@`);
    const targetBlockNumber = (await mainnetProvider.getBlockNumber()) + 1;
    const flashbotsTransactionResponse = await flashbotProvider.sendBundle(reformattedBundle, targetBlockNumber);

    // console.log(`@@@@@@ Bundle submitted targetting block#${targetBlockNumber}`);

    if (Object.hasOwn(flashbotsTransactionResponse, "error")) {
      const errorResponse = flashbotsTransactionResponse as RelayResponseError;
      res.status(203).json({
        response: `Bundle reverted with error: ${errorResponse.error}`,
      });
      // console.log(`@@@@@@ Bundle reverted with error: ${errorResponse.error}`);
      return;
    }

    const submissionResponse = flashbotsTransactionResponse as FlashbotsTransactionResponse;
    // console.log(`@@@@@@ Waiting for resolution....`);
    const bundleResolution = await submissionResponse.wait();

    if (bundleResolution == FlashbotsBundleResolution.AccountNonceTooHigh) {
      res.status(203).json({
        response: `Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
      });
      // console.log(
      //   `@@@@@@ Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
      // );
      return;
    }

    if (bundleResolution == FlashbotsBundleResolution.BundleIncluded) {
      res.status(203).json({
        response: `Bundle successfully included in block number ${targetBlockNumber}!!`,
      });
      // console.log(`@@@@@@ Bundle successfully included in block number ${targetBlockNumber}!!`);
      return;
    }

    if (bundleResolution == FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
      retries--;
      // console.log(`@@@@@@ BlockPassedWithoutInclusion. Retrying submission`);
      continue;
    }
  }

  res.status(203).json({
    response: `Unexpected state`,
  });
}
