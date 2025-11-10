const hre = require("hardhat");
const fs = require('fs-extra');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with', deployer.address);

  const Delegate = await hre.ethers.getContractFactory('Delegate');
  const delegate = await Delegate.deploy();
  await delegate.deployed();
  console.log('Delegate deployed to', delegate.address);

  const DelegationVulnerable = await hre.ethers.getContractFactory('DelegationVulnerable');
  const delegationVul = await DelegationVulnerable.deploy(delegate.address);
  await delegationVul.deployed();
  console.log('DelegationVulnerable deployed to', delegationVul.address);

  const DelegationSafe = await hre.ethers.getContractFactory('DelegationSafe');
  const delegationSafe = await DelegationSafe.deploy(delegate.address);
  await delegationSafe.deployed();
  console.log('DelegationSafe deployed to', delegationSafe.address);

  const out = {
    delegate: delegate.address,
    vulnerable: delegationVul.address,
    safe: delegationSafe.address,
    deployer: deployer.address,
    network: hre.network.name
  };

  await fs.writeJson('deployments.json', out, { spaces: 2 });
  console.log('Wrote deployments.json');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
