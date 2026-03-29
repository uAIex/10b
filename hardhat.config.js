require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_RPC_URL, PRIVATE_KEY } = process.env;

const sepoliaAccounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

const networks = {
  hardhat: {
    chainId: 31337,
  },
  localhost: {
    url: "http://127.0.0.1:8545",
  },
  sepolia: {
    url: SEPOLIA_RPC_URL || "",
    accounts: sepoliaAccounts,
  },
};

module.exports = {
  solidity: "0.8.20",
  networks,
};
