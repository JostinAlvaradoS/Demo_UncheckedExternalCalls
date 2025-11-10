const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { ethers } = require('ethers');

const app = express();
app.use(cors());
app.use(express.json());

const RPC = process.env.RPC || 'http://127.0.0.1:8545';
const provider = new ethers.providers.JsonRpcProvider(RPC);

function loadArtifact(name) {
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', `${name}.sol`, `${name}.json`);
  if (!fs.existsSync(artifactPath)) throw new Error('Artifact not found: ' + artifactPath);
  return JSON.parse(fs.readFileSync(artifactPath));
}

async function getSigners() {
  // create signers from provider (hardhat exposes accounts)
  const accounts = await provider.listAccounts();
  return accounts.map((a, i) => provider.getSigner(i));
}

app.get('/addresses', async (req, res) => {
  try {
    const deployments = await fs.readJson(path.join(process.cwd(), 'deployments.json'));
    res.json(deployments);
  } catch (err) {
    res.status(500).json({ error: 'deployments.json not found. Run `npm run deploy:local` after starting a local node.' });
  }
});

app.get('/signers', async (req, res) => {
  const accounts = await provider.listAccounts();
  res.json({ accounts });
});

app.get('/owner/:which', async (req, res) => {
  try {
    const which = req.params.which; // vulnerable | safe | delegate
    const deployments = await fs.readJson(path.join(process.cwd(), 'deployments.json'));
    const mapping = { vulnerable: deployments.vulnerable, safe: deployments.safe, delegate: deployments.delegate };
    const address = mapping[which];
    if (!address) return res.status(400).json({ error: 'Unknown contract key' });

    const artName = which === 'vulnerable' ? 'DelegationVulnerable' : which === 'safe' ? 'DelegationSafe' : 'Delegate';
    const artifact = loadArtifact(artName);
    const contract = new ethers.Contract(address, artifact.abi, provider);
    const owner = await contract.owner();
    res.json({ owner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leer storage (slot 0 y 1) para un contrato (vulnerable|safe|delegate)
app.get('/storage/:which', async (req, res) => {
  try {
    const which = req.params.which;
    const deployments = await fs.readJson(path.join(process.cwd(), 'deployments.json'));
    const mapping = { vulnerable: deployments.vulnerable, safe: deployments.safe, delegate: deployments.delegate };
    const address = mapping[which];
    if (!address) return res.status(400).json({ error: 'Unknown contract key' });
    const s0 = await provider.getStorageAt(address, 0);
    const s1 = await provider.getStorageAt(address, 1);
    res.json({ slot0: s0, slot1: s1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener traza detallada (debug_traceTransaction) de una txHash
app.get('/trace/:tx', async (req, res) => {
  try {
    const tx = req.params.tx;
    const trace = await provider.send('debug_traceTransaction', [tx, {}]);
    res.json({ trace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener eventos DelegateCalled emitidos por el contrato vulnerable
app.get('/events/:which', async (req, res) => {
  try {
    const which = req.params.which;
    const deployments = await fs.readJson(path.join(process.cwd(), 'deployments.json'));
    const mapping = { vulnerable: deployments.vulnerable, safe: deployments.safe, delegate: deployments.delegate };
    const address = mapping[which];
    if (!address) return res.status(400).json({ error: 'Unknown contract key' });

    // Cargar artifact para decodificar logs
    const artName = which === 'vulnerable' ? 'DelegationVulnerable' : which === 'safe' ? 'DelegationSafe' : 'Delegate';
    const artifact = loadArtifact(artName);
    const iface = new ethers.utils.Interface(artifact.abi);

    const filter = { address: address, fromBlock: 0, toBlock: 'latest' };
    const logs = await provider.getLogs(filter);
    const decoded = [];
    for (const l of logs) {
      try {
        const parsed = iface.parseLog(l);
        decoded.push({ name: parsed.name, args: parsed.args, log: l });
      } catch (e) {
        // no pudo parsear con este ABI, ignorar
      }
    }
    res.json({ decoded });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/attack/:which', async (req, res) => {
  try {
    const which = req.params.which; // vulnerable | safe
    const signerIndex = req.body.signerIndex || 1; // default attacker uses index 1
    const deployments = await fs.readJson(path.join(process.cwd(), 'deployments.json'));
    const mapping = { vulnerable: deployments.vulnerable, safe: deployments.safe };
    const address = mapping[which];
    if (!address) return res.status(400).json({ error: 'Unknown contract key' });

    const artifact = loadArtifact(which === 'vulnerable' ? 'DelegationVulnerable' : 'DelegationSafe');
    const iface = new ethers.utils.Interface(['function pwn()']);
    const data = iface.encodeFunctionData('pwn');

    const accounts = await provider.listAccounts();
    if (signerIndex >= accounts.length) return res.status(400).json({ error: 'signerIndex out of range' });
    const signer = provider.getSigner(signerIndex);

    // Send low-level tx to target contract (to trigger fallback -> delegatecall)
    try {
      const tx = await signer.sendTransaction({ to: address, data, gasLimit: 100000 });
      const receipt = await tx.wait();
      res.json({ success: true, txHash: receipt.transactionHash });
    } catch (err) {
      // return revert message if any
      res.json({ success: false, error: err.message });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/', express.static(path.join(__dirname, '..', 'web')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Requires a running local JSON-RPC (Hardhat node) and a deployments.json (script: npm run deploy:local)');
});
