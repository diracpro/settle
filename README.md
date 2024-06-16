# Settle STLHarvest Challenge Hardhat Project

Requirements:

1) /contracts
2) /test/STLHarvest.js
3) Verified Smart Contracts in Sepolia Testnet:
  STLToken   - 0x0d462e6a8a850aA935145C5ac5d1333402135523
  STLHarvest - 0xA0Bb5937fF5dDf1fbDC3154E4B0647BF4717e155
4) /Dockerfile
   /scripts/deploy.js
5) /tasks/stl-balance.js


Result of /test/STLHarvest.js :

% npx hardhat test


  STLHarvest
    ✔ Should distribute rewards proportionally (748ms)
    ✔ Should handle deposits before and after rewards
    Deployment
      ✔ Should set the right owner
      ✔ Owner should have DEFAULT_ADMIN_ROLE and MINTER_ROLE
      ✔ Should set the right reward token
      ✔ Should start with week 1
      ✔ Owner should have WEEK_UPDATER_ROLE
    Deposit
      ✔ Should allow users to deposit tokens
      ✔ Should record deposits for the correct week
    Add Rewards
      ✔ Should allow owner to add rewards
      ✔ Should allow owner to add rewards after starting a new week
    Distribute Rewards
      ✔ Should distribute rewards proportionally
      ✔ Should not distribute rewards if no rewards are added
      ✔ Should not distribute rewards to users who haven't deposited
    Start New Week
      ✔ Should allow only WEEK_UPDATER_ROLE to start a new week
      ✔ Should start a new week after 7 days
    Examples
      ✔ Should distribute rewards proportionally
      ✔ Should handle deposits before and after rewards


  18 passing (934ms)
