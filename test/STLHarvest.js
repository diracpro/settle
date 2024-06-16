const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

  describe("STLHarvest", function () {
    async function deployFixture() {
        const [owner, user1, user2, user3] = await ethers.getSigners();
        const STLTokenFactory = await ethers.getContractFactory("STLToken");
        const stlToken = await STLTokenFactory.deploy(owner); 
        const STLHarvestFactory = await ethers.getContractFactory("STLHarvest");
        const rewardsDistributor = await STLHarvestFactory.deploy(stlToken);
        await stlToken.grantRole(await stlToken.MINTER_ROLE(), owner);
        return { stlToken, rewardsDistributor, owner, user1, user2, user3 };
    }

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            const { stlToken, owner } = await loadFixture(deployFixture);
            expect(await stlToken.owner()).to.equal(owner);
          });
        
        it("Owner should have DEFAULT_ADMIN_ROLE and MINTER_ROLE", async function () {
            const { stlToken, owner } = await loadFixture(deployFixture);
            expect(await stlToken.hasRole(stlToken.DEFAULT_ADMIN_ROLE(), owner)).to.equal(true);
            expect(await stlToken.hasRole(stlToken.MINTER_ROLE(), owner)).to.equal(true);
        });
    
        it("Should set the right reward token", async function () {
            const { rewardsDistributor, stlToken } = await loadFixture(deployFixture);
            expect(await rewardsDistributor.rewardToken()).to.equal(stlToken);
        });
    
        it("Should start with week 1", async function () {
            const { rewardsDistributor } = await loadFixture(deployFixture);
            expect(await rewardsDistributor.currentWeek()).to.equal(1n);
        });
    
        it("Owner should have WEEK_UPDATER_ROLE", async function () {
            const { rewardsDistributor, owner } = await loadFixture(deployFixture);
            expect(
                await rewardsDistributor.hasRole(
                    rewardsDistributor.WEEK_UPDATER_ROLE(),
                    owner
                )
            ).to.equal(true);
        });
    });

    describe("Deposit", function () {
        it("Should allow users to deposit tokens", async function () {
            const { stlToken, rewardsDistributor, user1, owner } = await loadFixture(deployFixture);
            await stlToken.mint(user1, 100n); // Mint tokens for user1
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100);
            expect(await rewardsDistributor.tokenBalances(user1)).to.equal(100n);
        });

        it("Should record deposits for the correct week", async function () {
            const { stlToken, rewardsDistributor, user1 } = await loadFixture(deployFixture);
            await stlToken.mint(user1, 300n); // Mint tokens for user1
        
            // Week 1 deposit
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
            expect(await rewardsDistributor.userDepositsPerWeek(user1, 1n)).to.equal(100n);
        
            // Advance to the next week
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await rewardsDistributor.startNewWeek();
        
            // Week 2 deposit
            await stlToken.connect(user1).approve(rewardsDistributor, 200n);
            await rewardsDistributor.connect(user1).deposit(200n);
            expect(await rewardsDistributor.userDepositsPerWeek(user1, 2n)).to.equal(200n);
        
            // Ensure the previous week's deposit remains unchanged
            expect(await rewardsDistributor.userDepositsPerWeek(user1, 1n)).to.equal(100n);
        });
    
    });

    describe("Add Rewards", function () {
        it("Should allow owner to add rewards", async function () {
            const { stlToken, rewardsDistributor, owner, user1 } = await loadFixture(
                deployFixture
            );
            await stlToken.mint(owner, 1000n);
            await stlToken.approve(rewardsDistributor, 1000n);
    
            // Ensure currentWeek is 1 
            expect(await rewardsDistributor.currentWeek()).to.equal(1n);
    
            // User deposits tokens
            await stlToken.mint(user1, 100n);
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
    
            // Owner adds rewards, triggering distribution
            await rewardsDistributor.addRewards(1000n);
    
            // Check if the rewards were added to userRewardsPerWeek for the current week (week 1)
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 1n)).to.equal(1000n);
        });
    
        it("Should allow owner to add rewards after starting a new week", async function () {
            const { stlToken, rewardsDistributor, owner, user1 } = await loadFixture(deployFixture);
          
            // User deposits tokens
            await stlToken.mint(user1, 100n);
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n); // Deposit for week 1
          
            // Owner adds rewards, triggering distribution for week 1
            await stlToken.mint(owner, 1000n); // Mint tokens for the owner
            await stlToken.approve(rewardsDistributor, 1000n);
            await rewardsDistributor.addRewards(1000n);
          
            // Check rewards for user1 in week 1
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 1n)).to.equal(1000n);
          
            // Advance to the next week
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await rewardsDistributor.startNewWeek();
          
            // User deposits more tokens for week 2
            await stlToken.mint(user1, 100n);
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
          
            // Owner adds rewards for week 2
            await stlToken.mint(owner, 1000n); // Mint new tokens for the owner before adding rewards in week 2
            await stlToken.approve(rewardsDistributor, 1000n);
            await rewardsDistributor.addRewards(1000n);
          
            // Check if the rewards were added to userRewardsPerWeek for the current week (week 2)
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 2n)).to.equal(1000n);
          });
    
    });
    
    describe("Distribute Rewards", function () {
        it("Should distribute rewards proportionally", async function () {
            const { stlToken, rewardsDistributor, owner, user1, user2 } = await loadFixture(deployFixture);
    
            // Mint tokens for users to deposit
            await stlToken.mint(user1, 100n);
            await stlToken.mint(user2, 200n);
    
            // Users approve and deposit tokens
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
            await stlToken.connect(user2).approve(rewardsDistributor, 200n);
            await rewardsDistributor.connect(user2).deposit(200n);
    
            // Owner mints rewards and adds them
            await stlToken.mint(owner, 1000n); 
            await stlToken.approve(rewardsDistributor, 1000n);
            await rewardsDistributor.addRewards(1000n); 
    
            // Check that rewards are distributed proportionally
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 1n)).to.equal(333n);
            expect(await rewardsDistributor.userRewardsPerWeek(user2, 1n)).to.equal(666n);
    
            // Verify that the total rewards for the week are reset to 0
            expect(await rewardsDistributor.weeklyRewards(1)).to.equal(0);
        });
    
        it("Should not distribute rewards if no rewards are added", async function () {
            const { stlToken, rewardsDistributor, user1 } = await loadFixture(deployFixture);
            await stlToken.mint(user1, 100n); // Ensure user1 has tokens
 
            await stlToken.connect(user1).approve(rewardsDistributor, 100n); // Approve spending
        
            await rewardsDistributor.connect(user1).deposit(100n); // Deposit
        
            // Check that user has no rewards yet (since no rewards were added)
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 1n)).to.equal(0);
          });
        
        it("Should not distribute rewards to users who haven't deposited", async function () {
            const { stlToken, rewardsDistributor, owner, user1, user2 } = await loadFixture(deployFixture);
            await stlToken.mint(user1, 100n);
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
            await stlToken.mint(owner, 1000n); 
            await stlToken.approve(rewardsDistributor, 1000n);
            await rewardsDistributor.addRewards(1000n);
            await rewardsDistributor.connect(user1).withdraw(); // Withdraw before next deposit
    
            // User 2 deposits
            await stlToken.mint(user2, 200n);
            await stlToken.connect(user2).approve(rewardsDistributor, 200n);
            await rewardsDistributor.connect(user2).deposit(200n);
    
            // Move to next week and add rewards
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            await rewardsDistributor.startNewWeek();
    
            await stlToken.mint(owner, 1000n);
            await stlToken.approve(rewardsDistributor, 1000n);
            await rewardsDistributor.addRewards(1000n);
    
            // Check that user1 gets no rewards for week 2 as they did not deposit in week 2
            expect(await rewardsDistributor.userRewardsPerWeek(user1, 2n)).to.equal(0);
        });
    });

    describe("Start New Week", function () {
        it("Should allow only WEEK_UPDATER_ROLE to start a new week", async function () {
            const { rewardsDistributor, owner, user1 } = await loadFixture(deployFixture);
    
            // Move time forward by 7 days
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
    
            // Owner should be able to start a new week
            await rewardsDistributor.connect(owner).startNewWeek(); 
            expect(await rewardsDistributor.currentWeek()).to.equal(2);
    
            // Grant WEEK_UPDATER_ROLE to user1
            await rewardsDistributor.grantWeekUpdaterRole(user1);
          
            // Move time forward another 7 days
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
    
            // user1 should be able to start a new week now
            await rewardsDistributor.connect(user1).startNewWeek();
            expect(await rewardsDistributor.currentWeek()).to.equal(3);
        });

        it("Should start a new week after 7 days", async function () {
            const { rewardsDistributor, owner } = await loadFixture(deployFixture);
            
            // Move time forward by 7 days
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
      
            // Call startNewWeek (which the owner is authorized to do)
            await rewardsDistributor.connect(owner).startNewWeek(); 
      
            // Check if the week has been updated
            expect(await rewardsDistributor.currentWeek()).to.equal(2n);
        });
    });

    describe("Examples", function () {
        // Example case 1: Users deposits before rewards are added
        it("Should distribute rewards proportionally", async function () {
            const { stlToken, rewardsDistributor, owner, user1, user2 } = await loadFixture(deployFixture);
        
            // Mint tokens directly to users
            await stlToken.mint(user1, 100n);
            await stlToken.mint(user2, 300n);
        
            // Users approve and deposit tokens
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await stlToken.connect(user2).approve(rewardsDistributor, 300n);
        
            await rewardsDistributor.connect(user1).deposit(100n);
            await rewardsDistributor.connect(user2).deposit(300n);
        
            // Owner mints rewards and adds them
            await stlToken.mint(owner, 200n);
            await stlToken.approve(rewardsDistributor, 200n);
            await rewardsDistributor.addRewards(200n); 
        
            const user1BalanceBefore = await stlToken.balanceOf(user1);
            const user2BalanceBefore = await stlToken.balanceOf(user2);
        
            // Calculate expected rewards based on deposit proportions (1:3)
            const expectedUser1RewardPlusDeposit = 150n;  
            const expectedUser2RewardPlusDeposit = 450n;  
        
            // Withdraw to trigger reward distribution 
            await rewardsDistributor.connect(user1).withdraw(); // user1 withdraws
            await rewardsDistributor.connect(user2).withdraw(); // user2 withdraws
        
            const user1BalanceAfter = await stlToken.balanceOf(user1);
            const user2BalanceAfter = await stlToken.balanceOf(user2);
        
            // Calculate actual rewards received
            const user1Reward = user1BalanceAfter - (user1BalanceBefore);
            const user2Reward = user2BalanceAfter - (user2BalanceBefore);
        
            // Check rewards
            expect(user1Reward).to.equal(expectedUser1RewardPlusDeposit, "User1 should receive 150 tokens");
            expect(user2Reward).to.equal(expectedUser2RewardPlusDeposit, "User2 should receive 450 tokens");
        });

        // Example case 2: Users deposits before and after rewards are added
        it("Should handle deposits before and after rewards", async function () {
            const { stlToken, rewardsDistributor, owner, user1, user2 } = await loadFixture(deployFixture);
        
            // Mint tokens to user1 (Alice)
            await stlToken.mint(user1, 100n);
        
            // User1 (Alice) approves and deposits before rewards
            await stlToken.connect(user1).approve(rewardsDistributor, 100n);
            await rewardsDistributor.connect(user1).deposit(100n);
        
            // Owner mints and adds rewards
            await stlToken.mint(owner, 200n);
            await stlToken.approve(rewardsDistributor, 200n);
            await rewardsDistributor.addRewards(200n);
        
            // Mint tokens to user2 (Bob)
            await stlToken.mint(user2, 300n);
        
            // User2 (Bob) approves and deposits after rewards
            await stlToken.connect(user2).approve(rewardsDistributor, 300n);
            await rewardsDistributor.connect(user2).deposit(300n);
        
            // User1 (Alice) withdraws
            const user1BalanceBeforeWithdraw = await stlToken.balanceOf(user1);
            await rewardsDistributor.connect(user1).withdraw();
            // Check if user1 gets their deposit + all the rewards because they deposited before rewards were added
            expect(await stlToken.balanceOf(user1)).to.equal(user1BalanceBeforeWithdraw + (300n)); 
        
            // User2 (Bob) withdraws
            const user2BalanceBeforeWithdraw = await stlToken.balanceOf(user2);
            await rewardsDistributor.connect(user2).withdraw();
            // Check if user2 gets only their deposit back
            expect(await stlToken.balanceOf(user2)).to.equal(user2BalanceBeforeWithdraw + (300n));
        });   
    });   
  
});
