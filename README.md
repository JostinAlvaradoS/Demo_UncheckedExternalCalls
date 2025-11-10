# delegatecall-demo

Proyecto educativo que demuestra una vulnerabilidad por `delegatecall` sin comprobación (SC06: Unchecked External Calls)
y una versión segura que mitiga el problema. Incluye tests con Hardhat (ethers.js + mocha) que imprimen evidencia.

## Requisitos
- Node.js 16+ y npm
- Git (opcional)
- Recomiendo usar la red local de Hardhat para pruebas.

## Instalación rápida
```bash
npm install
npx hardhat test
```

## Estructura
- contracts/
  - Delegate.sol
  - DelegationVulnerable.sol
  - DelegationSafe.sol
- test/
  - delegation-test.js

## Atención
Usa esto solo en entornos de desarrollo o testnets. No desplegar contratos vulnerables en mainnet.
# Demo_UncheckedExternalCalls
