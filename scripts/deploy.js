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

  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Network: ${hre.network.name} (chainId ${network.chainId})`);

  const nftFactory = await hre.ethers.getContractFactory("CS521OnChainNFT");
  const nft = await nftFactory.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log(`CS521OnChainNFT deployed at: ${nftAddress}`);

  const settlementFactory = await hre.ethers.getContractFactory("TradeSettlement");
  const settlement = await settlementFactory.deploy();
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log(`TradeSettlement deployed at: ${settlementAddress}`);

  const nftArtifact = await hre.artifacts.readArtifact("CS521OnChainNFT");
  const settlementArtifact = await hre.artifacts.readArtifact("TradeSettlement");

  const sepoliaConfig = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    nft: {
      contractName: nftArtifact.contractName,
      address: nftAddress,
      abi: nftArtifact.abi,
    },
    settlement: {
      contractName: settlementArtifact.contractName,
      address: settlementAddress,
      abi: settlementArtifact.abi,
    },
  };

  const frontendDir = path.join(__dirname, "..", "frontend");
  const sepoliaConfigPath = path.join(frontendDir, "sepolia-config.json");
  fs.writeFileSync(sepoliaConfigPath, JSON.stringify(sepoliaConfig, null, 2));
  console.log(`Wrote frontend Sepolia config to: ${sepoliaConfigPath}`);

  const legacyContractInfo = {
    contractName: nftArtifact.contractName,
    network: hre.network.name,
    chainId: Number(network.chainId),
    address: nftAddress,
    abi: nftArtifact.abi,
  };
  const legacyPath = path.join(frontendDir, "contract-info.json");
  fs.writeFileSync(legacyPath, JSON.stringify(legacyContractInfo, null, 2));
  console.log(`Updated legacy NFT config at: ${legacyPath}`);

  if (hre.network.name === "sepolia") {
    console.log("Sepolia deployment complete.");
    console.log(`NFT: ${nftAddress}`);
    console.log(`Settlement: ${settlementAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
