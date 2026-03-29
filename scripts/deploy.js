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

  const factory = await hre.ethers.getContractFactory("CS521OnChainNFT");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CS521OnChainNFT deployed at: ${address}`);

  const artifact = await hre.artifacts.readArtifact("CS521OnChainNFT");
  const output = {
    contractName: artifact.contractName,
    network: hre.network.name,
    chainId: Number(network.chainId),
    address,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  };

  const outputPath = path.join(__dirname, "..", "frontend", "contract-info.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Wrote frontend contract info to: ${outputPath}`);

  if (hre.network.name === "sepolia") {
    console.log(`Sepolia deployment complete. Contract address: ${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
