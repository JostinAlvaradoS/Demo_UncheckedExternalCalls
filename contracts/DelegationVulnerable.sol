// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DelegationVulnerable {
    address public owner;      // slot 0
    address public delegate;   // slot 1

    constructor(address _delegateAddress) {
        owner = msg.sender;
        delegate = _delegateAddress;
    }

    // Evento para auditar intentos de forward/delegatecall
    event DelegateCalled(bool success, bytes data, bytes returnData);

    // fallback que delega sin comprobar el resultado -> vulnerabilidad SC06 (unchecked external call)
    fallback() external payable {
        // llamada peligrosa: capturamos el resultado y lo emitimos para auditoría
        (bool success, bytes memory ret) = delegate.delegatecall(msg.data);
        emit DelegateCalled(success, msg.data, ret);
        // no revertimos aquí: mantenemos la conducta original (vulnerable) para la demo
    }
}
