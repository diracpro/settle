import { ethers } from "hardhat";
// const hre = require("hardhat");

async function main() {
  const STLToken = await ethers.getContractFactory("STLToken");
  const stlToken = await STLToken.deploy();
  await stlToken.deployed();
  console.log("STLToken deployed to:", stlToken.address);

  const STLHarvest = await ethers.getContractFactory("STLHarvest");
  const stlHarvest = await STLHarvest.deploy(stlToken.address); 
  await stlHarvest.deployed();
  console.log("STLHarvest deployed to:", stlHarvest.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
