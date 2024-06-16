// SPDX-License-Identifier: MIT
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("hardhat");

module.exports = buildModule("STLHarvest", (m) => {
    const stlTokenAddress = "0x0d462e6a8a850aA935145C5ac5d1333402135523";
    const STLHarvest = m.contract("STLHarvest", [stlTokenAddress]);

    return { STLHarvest };
});
