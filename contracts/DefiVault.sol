// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFiVault
 * @dev A complex DeFi vault contract to test documentation generation
 * @notice This vault allows users to deposit tokens and earn yield
 */
contract DeFiVault {
    // Structs
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 depositTime;
        bool isActive;
    }

    struct PoolInfo {
        address token;
        uint256 allocPoint;
        uint256 lastRewardBlock;
        uint256 accRewardPerShare;
        uint256 totalStaked;
    }

    // State variables
    mapping(uint256 => PoolInfo) public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    uint256 public totalAllocPoint;
    uint256 public rewardPerBlock;
    uint256 public constant BONUS_MULTIPLIER = 10;
    address public owner;
    bool public paused;

    // Events
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PoolAdded(uint256 indexed pid, address indexed token, uint256 allocPoint);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint);

    // Errors
    error InsufficientBalance(uint256 requested, uint256 available);
    error PoolNotExists(uint256 pid);
    error Unauthorized(address caller);
    error VaultPaused();
    error InvalidAmount();
    error TransferFailed();

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _;
    }

    modifier notPaused() {
        if (paused) revert VaultPaused();
        _;
    }

    modifier poolExists(uint256 _pid) {
        if (poolInfo[_pid].token == address(0)) revert PoolNotExists(_pid);
        _;
    }

    /**
     * @dev Constructor to initialize the vault
     * @param _rewardPerBlock Initial reward per block
     */
    constructor(uint256 _rewardPerBlock) {
        owner = msg.sender;
        rewardPerBlock = _rewardPerBlock;
    }

    /**
     * @notice Add a new liquidity pool to the vault
     * @dev Can only be called by the owner
     * @param _allocPoint Allocation points for this pool
     * @param _token Token address for the pool
     * @param _withUpdate Whether to update all pools
     */
    function addPool(
        uint256 _allocPoint,
        address _token,
        bool _withUpdate
    ) external onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        
        uint256 lastRewardBlock = block.number;
        totalAllocPoint += _allocPoint;
        
        uint256 pid = poolLength();
        poolInfo[pid] = PoolInfo({
            token: _token,
            allocPoint: _allocPoint,
            lastRewardBlock: lastRewardBlock,
            accRewardPerShare: 0,
            totalStaked: 0
        });
        
        emit PoolAdded(pid, _token, _allocPoint);
    }

    /**
     * @notice Deposit tokens into a pool
     * @param _pid Pool ID to deposit into
     * @param _amount Amount of tokens to deposit
     */
    function deposit(uint256 _pid, uint256 _amount) 
        external 
        notPaused 
        poolExists(_pid) 
    {
        if (_amount == 0) revert InvalidAmount();
        
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        updatePool(_pid);
        
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare / 1e12) - user.rewardDebt;
            if (pending > 0) {
                safeTransferReward(msg.sender, pending);
            }
        }
        
        // Transfer tokens from user
        // Note: Simplified - actual implementation would use SafeERC20
        pool.totalStaked += _amount;
        user.amount += _amount;
        user.rewardDebt = user.amount * pool.accRewardPerShare / 1e12;
        user.depositTime = block.timestamp;
        user.isActive = true;
        
        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @notice Withdraw tokens from a pool
     * @param _pid Pool ID to withdraw from
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _pid, uint256 _amount) 
        external 
        poolExists(_pid) 
    {
        UserInfo storage user = userInfo[_pid][msg.sender];
        if (user.amount < _amount) {
            revert InsufficientBalance(_amount, user.amount);
        }
        
        PoolInfo storage pool = poolInfo[_pid];
        updatePool(_pid);
        
        uint256 pending = (user.amount * pool.accRewardPerShare / 1e12) - user.rewardDebt;
        if (pending > 0) {
            safeTransferReward(msg.sender, pending);
        }
        
        user.amount -= _amount;
        user.rewardDebt = user.amount * pool.accRewardPerShare / 1e12;
        pool.totalStaked -= _amount;
        
        if (user.amount == 0) {
            user.isActive = false;
        }
        
        // Transfer tokens back to user
        // Note: Simplified - actual implementation would use SafeERC20
        
        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @notice Get pending rewards for a user
     * @param _pid Pool ID
     * @param _user User address
     * @return pending Pending reward amount
     */
    function pendingRewards(uint256 _pid, address _user) 
        external 
        view 
        poolExists(_pid)
        returns (uint256 pending) 
    {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.number > pool.lastRewardBlock && pool.totalStaked != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 reward = multiplier * rewardPerBlock * pool.allocPoint / totalAllocPoint;
            accRewardPerShare += (reward * 1e12 / pool.totalStaked);
        }
        
        pending = (user.amount * accRewardPerShare / 1e12) - user.rewardDebt;
    }

    /**
     * @notice Get user information for a specific pool
     * @param _pid Pool ID
     * @param _user User address
     * @return amount Staked amount
     * @return rewardDebt Reward debt
     * @return depositTime Time of last deposit
     * @return isActive Whether user is active in pool
     */
    function getUserInfo(uint256 _pid, address _user) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 rewardDebt,
            uint256 depositTime,
            bool isActive
        ) 
    {
        UserInfo memory user = userInfo[_pid][_user];
        return (
            user.amount,
            user.rewardDebt,
            user.depositTime,
            user.isActive
        );
    }

    /**
     * @notice Get pool information
     * @param _pid Pool ID
     * @return token Token address
     * @return allocPoint Allocation points
     * @return lastRewardBlock Last reward block
     * @return totalStaked Total staked in pool
     */
    function getPoolInfo(uint256 _pid)
        external
        view
        returns (
            address token,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 totalStaked
        )
    {
        PoolInfo memory pool = poolInfo[_pid];
        return (
            pool.token,
            pool.allocPoint,
            pool.lastRewardBlock,
            pool.totalStaked
        );
    }

    /**
     * @notice Emergency withdraw without caring about rewards
     * @param _pid Pool ID
     */
    function emergencyWithdraw(uint256 _pid) external {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        user.isActive = false;
        pool.totalStaked -= amount;
        
        // Transfer tokens back
        // Note: Simplified
        
        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    /**
     * @notice Update reward variables for all pools
     * @dev Be careful of gas spending!
     */
    function massUpdatePools() public {
        uint256 length = poolLength();
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    /**
     * @notice Update reward variables of the given pool
     * @param _pid Pool ID to update
     */
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        
        if (pool.totalStaked == 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 reward = multiplier * rewardPerBlock * pool.allocPoint / totalAllocPoint;
        
        pool.accRewardPerShare += (reward * 1e12 / pool.totalStaked);
        pool.lastRewardBlock = block.number;
    }

    /**
     * @notice Set new reward per block
     * @dev Only owner can call
     * @param _rewardPerBlock New reward per block
     */
    function setRewardPerBlock(uint256 _rewardPerBlock) external onlyOwner {
        massUpdatePools();
        rewardPerBlock = _rewardPerBlock;
    }

    /**
     * @notice Pause the vault
     * @dev Only owner can call
     */
    function pause() external onlyOwner {
        paused = true;
    }

    /**
     * @notice Unpause the vault
     * @dev Only owner can call
     */
    function unpause() external onlyOwner {
        paused = false;
    }

    /**
     * @notice Get number of pools
     * @return Number of pools
     */
    function poolLength() public view returns (uint256) {
        uint256 length = 0;
        while (poolInfo[length].token != address(0)) {
            length++;
        }
        return length;
    }

    /**
     * @dev Return reward multiplier over the given blocks
     */
    function getMultiplier(uint256 _from, uint256 _to) internal pure returns (uint256) {
        return (_to - _from) * BONUS_MULTIPLIER;
    }

    /**
     * @dev Safe transfer reward to user
     */
    function safeTransferReward(address _to, uint256 _amount) internal {
        // Simplified implementation
        emit RewardsClaimed(_to, _amount);
    }

    /**
     * @notice Migrate funds to a new vault (emergency use)
     * @param _newVault Address of the new vault
     */
    function migrate(address _newVault) external onlyOwner {
        // Emergency migration logic
    }

    /**
     * @notice Compound rewards back into the pool
     * @param _pid Pool ID
     */
    function compound(uint256 _pid) external {
        // Compound logic
    }

    // Receive function to accept ETH
    receive() external payable {
        // Accept ETH
    }
}