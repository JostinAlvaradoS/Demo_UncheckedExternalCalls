// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DelegationSafe {
    address public owner;      // slot 0
    address public delegate;   // slot 1

    constructor(address _delegateAddress) {
        owner = msg.sender;
        delegate = _delegateAddress;
    }

    /// Uso seguro: sólo el owner puede hacer forward, comprobamos que sea contrato y verificamos el resultado
    function safeForward(address _callee, bytes calldata data) external {
        require(msg.sender == owner, "Not authorized");
        require(_callee != address(0), "Zero address");

        uint256 size;
        assembly { size := extcodesize(_callee) }
        require(size > 0, "Callee must be contract");

        (bool success, ) = _callee.delegatecall(data);
        require(success, "Delegatecall failed");
    }

    // fallback proactivo: impedir que se use fallback para delegar
    fallback() external payable {
        revert("Use safeForward");
    }
}
