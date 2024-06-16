require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("./tasks/stl-balance"); 
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  sourcify: {
    enabled: false
  },
  defaultNetwork: "localhost", // Default network for Docker
  networks: {
    localhost: {
      url: "http://localhost:8545", // URL for Hardhat Network in Docker
    },
    sepolia: {
      url: process.env.INFURA_SEPOLIA_ENDPOINT || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
    }
  },
};
