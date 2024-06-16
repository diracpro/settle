// SPDX-License-Identifier: MIT
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("STLTokenModule", (m) => {
    const stlToken = m.contract("STLToken"); 

    return { stlToken };
});
