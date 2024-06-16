// tasks/stl-balance.js
const { task } = require("hardhat/config");
require("@nomicfoundation/hardhat-toolbox");

task("stl-balance", "Get the STL balance of the STLHarvest contract")
  .setAction(async (taskArgs, hre) => {
 
    // Get the rewardToken contract instance
    STLTokenAddress = "0x0d462e6a8a850aA935145C5ac5d1333402135523";
    const rewardToken = await hre.ethers.getContractAt("STLToken", "0x0d462e6a8a850aA935145C5ac5d1333402135523");

    // Get the balance of STL tokens held by the STLHarvest contract
    const STLHarvestAddress = "0xA0Bb5937fF5dDf1fbDC3154E4B0647BF4717e155";
    const balance = await rewardToken.balanceOf(STLHarvestAddress);

    // Convert the balance to a string and divide by 10^18 (assuming 18 decimals)
    const formattedBalance = (balance.toString() / 1e18).toFixed(18);

    console.log(
      `STLHarvest contract STL balance: ${formattedBalance} STL`
    );
  });
