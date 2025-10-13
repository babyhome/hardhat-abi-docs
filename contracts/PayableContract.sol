// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PayableContract {
  event Deposited(address indexed sender, uint256 amount);

  uint256 public totalDeposited;

  function deposit() public payable {
    totalDeposited += msg.value;
    emit Deposited(msg.sender, msg.value);
  }

  function getBalance(address account) public view returns (uint256, bool) {
    return (account.balance, totalDeposited > 0);
  }
}