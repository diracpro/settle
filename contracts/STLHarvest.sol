// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./STLToken.sol";

/**
 * @title STLHarvest
 * @dev A contract for staking STL tokens and earning weekly rewards.
 */
contract STLHarvest is Ownable, AccessControl {
    STLToken public rewardToken;
    
    /// @dev Mapping of the total rewards added in that week.
    mapping(uint256 => uint256) public weeklyRewards;
    /// @dev Mapping of user addresses to week number to their deposits in that week.
    mapping(address => mapping(uint256 => uint256)) public userDepositsPerWeek;
    /// @dev Mapping of user addresses to week number to their rewards in that week.
    mapping(address => mapping(uint256 => uint256)) public userRewardsPerWeek;

    /// @dev An array of all users who have deposited tokens.
    address[] public holders;
    /// @dev An array of users who deposited before rewards were added for a week, thus eligible for rewards.
    address[] public holdersGetRewards; 
    /// @dev Mapping to check if a user is in the holdersGetRewards array.
    mapping(address => bool) public holdersGetRewardsExist;
    /// @dev Mapping to track the total deposited tokens per user.
    mapping(address => uint256) public tokenBalances;

    /// @dev Current week number since contract deployment.
    uint256 public currentWeek;
    /// @dev Timestamp of the contract deployment.
    uint256 public contractStartTime;
    
    /// @dev Role identifier for week updaters.
    bytes32 public constant WEEK_UPDATER_ROLE = keccak256("WEEK_UPDATER_ROLE");

    /**
     * @dev Constructor function. Sets initial values and grants the WEEK_UPDATER_ROLE to the deployer.
     * @param _rewardToken The address of the STLToken contract used for rewards.
     */
    constructor(STLToken _rewardToken) Ownable(msg.sender) {
        rewardToken = _rewardToken;
        currentWeek = 1;
        contractStartTime = block.timestamp;
        _grantRole(WEEK_UPDATER_ROLE, msg.sender);
    }

    /**
     * @dev Allows users to deposit STL tokens.
     * @param _amount The amount of tokens to deposit.
     */
    function deposit(uint256 _amount) external {
        rewardToken.transferFrom(msg.sender, address(this), _amount);
        userDepositsPerWeek[msg.sender][currentWeek] += _amount;
        tokenBalances[msg.sender] += _amount;

        if (!contains(holders, msg.sender)) { 
            holders.push(msg.sender);
        }
    }

    /**
     * @dev Internal function to check if an address exists in an array.
     * @param arr The array to search.
     * @param element The address to look for.
     * @return True if the element exists in the array, false otherwise.
     */
    function contains(address[] memory arr, address element) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == element) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Allows the contract owner to add rewards for the current week.
     * @param _amount The amount of rewards to add.
     */
    function addRewards(uint256 _amount) external onlyOwner {
        require(weeklyRewards[currentWeek] == 0, "Rewards already added for this week");

        weeklyRewards[currentWeek] += _amount;
        rewardToken.transferFrom(msg.sender, address(this), _amount);

        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            if (userDepositsPerWeek[holder][currentWeek] > 0) {
                if (holdersGetRewardsExist[holder]==false) {
                    holdersGetRewards.push(holder);
                    holdersGetRewardsExist[holder] = true;
                }
            }
        }
        distributeRewards();
    }

    /**
     * @dev Distributes rewards proportionally among eligible holders for the current week.
     */
    function distributeRewards() internal onlyOwner {
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            
            uint256 rewardAmount = calculateRewards(holder, currentWeek);
            
            if (rewardAmount > 0) {
                userRewardsPerWeek[holder][currentWeek] += rewardAmount;
                holdersGetRewardsExist[holder] = false;
            }
        }
        weeklyRewards[currentWeek] = 0;
    }

    /**
     * @dev Calculates the rewards for a specific user and week.
     * @param _user The address of the user.
     * @param _week The week for which to calculate rewards.
     * @return The amount of rewards the user is entitled to.
     */
    function calculateRewards(address _user, uint256 _week) internal view returns (uint256) {
        bool isEligible = false;
        for (uint256 i = 0; i < holdersGetRewards.length; i++) {
            if (holdersGetRewards[i] == _user) {
                isEligible = true;
                break;
            }
        }
        if (!isEligible) {
            return 0;
        }
        uint256 userDeposit = userDepositsPerWeek[_user][_week];
        uint256 totalDeposits = 0;
        
        for (uint256 i = 0; i < holdersGetRewards.length; i++) {
            totalDeposits += userDepositsPerWeek[holdersGetRewards[i]][_week];
        }
        if (totalDeposits == 0) {
            return 0; // Avoid division by zero
        }
        return (weeklyRewards[_week] * userDeposit) / totalDeposits;
    }

    /**
     * @dev Allows users to withdraw their deposited tokens and accumulated rewards.
     */
    function withdraw() external {
        uint256 amountToWithdraw = 0;
        
        amountToWithdraw += userRewardsPerWeek[msg.sender][currentWeek];
        amountToWithdraw += tokenBalances[msg.sender];
        tokenBalances[msg.sender] = 0;
        rewardToken.transfer(msg.sender, amountToWithdraw);
    }

    /**
     * @dev Starts a new week, resetting relevant data and updating user deposits.
     * Can only be called by an account with the WEEK_UPDATER_ROLE.
     */
    function startNewWeek() public onlyRole(WEEK_UPDATER_ROLE) {
        require(
            block.timestamp >= contractStartTime + 7 days * currentWeek,
            "A week has not yet passed."
        );

        delete holdersGetRewards;

        uint256 nextWeek = currentWeek + 1;
        for (uint256 i = 0; i < holders.length; i++) {
            userDepositsPerWeek[holders[i]][nextWeek] = 0;
        }
        currentWeek = nextWeek;
    }

    /**
     * @dev Grants the WEEK_UPDATER_ROLE to an account.
     * Can only be called by the contract owner.
     * @param _account The address of the account to grant the role to.
     */
    function grantWeekUpdaterRole(address _account) external onlyOwner {
        _grantRole(WEEK_UPDATER_ROLE, _account);
    }

    /**
     * @dev Revokes the WEEK_UPDATER_ROLE from an account.
     * Can only be called by the contract owner.
     * @param _account The address of the account to revoke the role from.
     */
    function revokeWeekUpdaterRole(address _account) external onlyOwner {
        _revokeRole(WEEK_UPDATER_ROLE, _account);
    }
}
