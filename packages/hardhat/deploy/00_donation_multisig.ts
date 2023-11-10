import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a contract named "DonationMultiSig" using the deployer account and
 * constructor arguments set to the deployer address
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployDonationMultiSig: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network goerli`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("DonationMultiSig", {
    from: deployer,
    args: [["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"], [10, 10], 3],
    log: true,
    autoMine: true,
  });

  // Get the deployed contract
  // const DonationMultiSig = await hre.ethers.getContract("DonationMultiSig", deployer);
};

export default deployDonationMultiSig;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags DonationMultiSig
deployDonationMultiSig.tags = ["DonationMultiSig"];
