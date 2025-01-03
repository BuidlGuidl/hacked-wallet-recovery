import {
  FlashbotsBundleProvider,
  FlashbotsTransactionResponse,
  RelayResponseError,
  SimulationResponse,
} from "@flashbots/ethers-provider-bundle";
import { ethers } from "ethers";
import * as chains from "wagmi/chains";
import { getNetworkConfig } from "~~/utils/scaffold-eth";

export const maxDuration = 240;

export default async function handler(req: any, res: any) {
  // Get network from request headers or query params
  const networkId = req.headers["x-network-id"] || req.query.networkId;
  const network = Number(networkId) === chains.sepolia.id ? chains.sepolia : chains.mainnet;
  const networkConfig = getNetworkConfig(network);

  const provider = new ethers.providers.JsonRpcProvider(
    `${networkConfig.alchemyUrl}/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
  );

  const flashbotProvider = await FlashbotsBundleProvider.create(
    provider,
    ethers.Wallet.createRandom(),
    networkConfig.relayUrl,
    network.id === chains.sepolia.id ? "sepolia" : undefined,
  );

  const body = req.body;
  if (!body || !body.txs || body.txs.length == 0) {
    res.status(400).json({ reason: "Bad bundle" });
  }

  const reformattedBundle: string[] = body.txs.map((signedTx: any) => {
    return signedTx;
  });

  const targetBlockNumber = (await provider.getBlockNumber()) + 1;
  const flashbotsTransactionResponse = await flashbotProvider.sendRawBundle(reformattedBundle, targetBlockNumber);

  // console.log(`@@@@@@ Bundle submitted targetting block#${targetBlockNumber}`);

  if (Object.hasOwn(flashbotsTransactionResponse, "error")) {
    const errorResponse = flashbotsTransactionResponse as RelayResponseError;
    res.status(203).json({
      response: `Bundle reverted with error: ${errorResponse.error.message}`,
      success: false,
    });
    // console.log(`@@@@@@ Bundle reverted with error: ${errorResponse.error}`);
    return;
  }

  const simulationResult: SimulationResponse = await flashbotProvider.simulate(reformattedBundle, targetBlockNumber);

  if (simulationResult && (simulationResult as RelayResponseError).error) {
    res.status(203).json({
      response: `Bundle reverted with error: ${(simulationResult as RelayResponseError).error.message}`,
      success: false,
    });
    // console.log(`@@@@@@ Bundle simulation reverted with error: ${(simulationResult as RelayResponseError).error}`);
    return;
  }

  const submissionResponse = flashbotsTransactionResponse as FlashbotsTransactionResponse;
  // console.log(`@@@@@@ Waiting for resolution....`);
  const bundleResolution = await submissionResponse.wait();

  // BundleIncluded
  if (bundleResolution == 0) {
    res.status(203).json({
      response: `Bundle successfully included in block number ${targetBlockNumber}!!`,
      success: true,
      simulationResult,
    });
    // console.log(`@@@@@@ Bundle successfully included in block number ${targetBlockNumber}!!`);
    return;
  }

  const exactSimulationResult: SimulationResponse = await submissionResponse.simulate();
  // BlockPassedWithoutInclusion
  if (bundleResolution == 1) {
    res.status(203).json({
      response: `BlockPassedWithoutInclusion.`,
      success: false,
      simulationResult: exactSimulationResult,
    });
    // console.log(`@@@@@@ BlockPassedWithoutInclusion.`);
    return;
  }

  // AccountNonceTooHigh
  if (bundleResolution == 2) {
    res.status(203).json({
      response: `Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
      success: false,
      simulationResult: exactSimulationResult,
    });
    // console.log(
    //   `@@@@@@ Bundle submitted but reverted because account nonce is too high. Clear activity data and start all over again.`,
    // );
    return;
  }

  res.status(203).json({
    response: `Unexpected state`,
    success: false,
    simulationResult: exactSimulationResult,
  });
}
