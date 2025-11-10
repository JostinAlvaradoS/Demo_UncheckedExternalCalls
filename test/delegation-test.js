const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Demo de vulnerabilidad delegatecall", function () {
  let delegate;
  let delegationVul;
  let delegationSafe;
  let owner, attacker, other;

  beforeEach(async function () {
    [owner, attacker, other] = await ethers.getSigners();

  // Desplegar Delegate (la "librería")
    const DelegateFactory = await ethers.getContractFactory("Delegate");
    delegate = await DelegateFactory.connect(owner).deploy();
    await delegate.deployed();

  // Desplegar delegación vulnerable
    const Div = await ethers.getContractFactory("DelegationVulnerable");
    delegationVul = await Div.connect(owner).deploy(delegate.address);
    await delegationVul.deployed();

  // Desplegar delegación segura
    const Ds = await ethers.getContractFactory("DelegationSafe");
    delegationSafe = await Ds.connect(owner).deploy(delegate.address);
    await delegationSafe.deployed();
  });

  it("Vulnerable: el atacante puede convertirse en owner vía delegatecall por el fallback (evidencia en consola)", async function () {
    const beforeOwner = await delegationVul.owner();
    console.log("Vulnerable - owner antes:", beforeOwner);

    // payload pwn()
    const iface = new ethers.utils.Interface(["function pwn()"]);
    const data = iface.encodeFunctionData("pwn");

    // El atacante llama al contrato vulnerable (se ejecuta fallback -> delegatecall)
    await attacker.sendTransaction({
      to: delegationVul.address,
      data: data
    });

    const afterOwner = await delegationVul.owner();
    console.log("Vulnerable - owner después del ataque:", afterOwner);

    expect(afterOwner).to.equal(attacker.address);
  });

  it("Seguro: el mismo intento falla/revierte y el owner permanece intacto (evidencia en consola)", async function () {
    const beforeOwnerSafe = await delegationSafe.owner();
    console.log("Seguro - owner antes:", beforeOwnerSafe);

    // payload pwn()
    const iface = new ethers.utils.Interface(["function pwn()"]);
    const data = iface.encodeFunctionData("pwn");

    // Intento de ataque: realizamos la misma transacción low-level
    let reverted = false;
    try {
      await attacker.sendTransaction({
        to: delegationSafe.address,
        data: data
      });
    } catch (err) {
      reverted = true;
      console.log("Seguro - intento de ataque revirtió: ", err.reason || err.message);
    }

    const afterOwnerSafe = await delegationSafe.owner();
    console.log("Seguro - owner después del intento:", afterOwnerSafe);

    expect(reverted).to.be.true;
    expect(afterOwnerSafe).to.equal(beforeOwnerSafe);
  });
});
