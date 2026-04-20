const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  if (hre.network.name === "sepolia") {
    if (!process.env.SEPOLIA_RPC_URL) {
      throw new Error("Missing SEPOLIA_RPC_URL in .env for Sepolia deployment.");
    }

    if (!process.env.PRIVATE_KEY) {
      throw new Error("Missing PRIVATE_KEY in .env for Sepolia deployment.");
    }
  }

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log(`Deploying prediction market with account: ${deployer.address}`);
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);

  const predictionFactory = await hre.ethers.getContractFactory("CS521PredictionMarket1155");
  const prediction = await predictionFactory.deploy();
  await prediction.waitForDeployment();
  const predictionAddress = await prediction.getAddress();
  console.log(`CS521PredictionMarket1155 deployed at: ${predictionAddress}`);

  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const closeTime = BigInt(latestBlock.timestamp + 30 * 24 * 60 * 60);

  await (
    await prediction.createMarket(
      0,
      "Will ETH be above $3,000 at close?",
      "Class demo ETH price market. Outcome is resolved by the project authority for now; a production version would use a price oracle.",
      300000,
      closeTime
    )
  ).wait();
  await (
    await prediction.createMarket(
      1,
      "Will the Celtics beat the Lakers in the demo NBA game?",
      "Class demo NBA market. Outcome is resolved by the project authority after the game result is known.",
      0,
      closeTime
    )
  ).wait();
  console.log("Created prediction markets: #1 ETH price, #2 NBA game");

  const artifact = await hre.artifacts.readArtifact("CS521PredictionMarket1155");
  const frontendDir = path.join(__dirname, "..", "frontend");
  const sepoliaConfigPath = path.join(frontendDir, "sepolia-config.json");
  const existingConfig = fs.existsSync(sepoliaConfigPath)
    ? JSON.parse(fs.readFileSync(sepoliaConfigPath, "utf8"))
    : {};

  const nextConfig = {
    ...existingConfig,
    network: existingConfig.network || hre.network.name,
    chainId: Number(existingConfig.chainId || network.chainId),
    prediction: {
      contractName: artifact.contractName,
      address: predictionAddress,
      abi: artifact.abi,
      markets: {
        ethPrice: 1,
        nbaGame: 2,
      },
    },
  };

  fs.writeFileSync(sepoliaConfigPath, JSON.stringify(nextConfig, null, 2));
  console.log(`Updated frontend Sepolia config at: ${sepoliaConfigPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
