// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ComplexContract {
    struct User {
        uint256 id;
        string name;
        address wallet;
        uint256[] scores;
    }

    mapping(address => User) public users;

    function addUser(uint256 id, string memory name, address wallet, uint256[] memory scores) public {
        users[wallet] = User(id, name, wallet, scores);
    }

    function getUser(address wallet) public view returns (uint256, string memory, address, uint256[] memory) {
        User memory user = users[wallet];
        return (user.id, user.name, user.wallet, user.scores);
    }
}

