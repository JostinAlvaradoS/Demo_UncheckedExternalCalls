// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @notice Contrato "librería" que cambia owner en su propio storage layout (slot 0)
contract Delegate {
    address public owner;

    function pwn() public {
        owner = msg.sender;
    }
}
