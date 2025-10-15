// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


contract EventContract {
    struct Item {
        uint256 id;
        string name;
        address owner;
    }

    event ItemAdded(address indexed sender, Item item, uint256[] quantity);
    event StatusUpdated(bool status, string message);

    function addItem(uint256 id, string memory name, address owner, uint256[] memory quantity) public {
        Item memory item = Item(id, name, owner);
        emit ItemAdded(msg.sender, item, quantity);
    }

    function updateStatus(bool status, string memory message) public {
        emit StatusUpdated(status, message);
    }
}

