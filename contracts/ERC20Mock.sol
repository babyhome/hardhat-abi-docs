// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ERC20Mock {
  string public name = "Mock Token";
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;

  constructor(uint256 _supply) {
    totalSupply = _supply;
    balanceOf[msg.sender] = _supply;
  }

  function transfer(address to, uint256 amount) public returns (bool) {
    require(balanceOf[msg.sender] >= amount, "Insufficient balance");
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    return true;
  }

  function getBalances(address[] memory accounts) public view returns (uint256[] memory) {
    uint256[] memory balances = new uint256[](accounts.length);
    for (uint256 i = 0; i < accounts.length; i++) {
      balances[i] = balanceOf[accounts[i]];
    }
    return balances;
  }
}