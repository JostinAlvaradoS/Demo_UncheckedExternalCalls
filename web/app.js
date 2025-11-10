async function api(path, opts) {
  const res = await fetch(path, opts);
  return res.json();
}

async function refreshAll() {
  const signers = await api('/signers');
  document.getElementById('signers').textContent = signers.accounts.join(', ');

  const deployments = await api('/addresses');
  document.getElementById('deployments').textContent = JSON.stringify(deployments, null, 2);

  const o1 = await api('/owner/vulnerable');
  document.getElementById('owner-vul').textContent = o1.owner;
  const o2 = await api('/owner/safe');
  document.getElementById('owner-safe').textContent = o2.owner;
  const o3 = await api('/owner/delegate');
  document.getElementById('owner-lib').textContent = o3.owner;
  // storage and events
  const s = await api('/storage/vulnerable');
  document.getElementById('storage-vul').textContent = JSON.stringify(s, null, 2);
  const ev = await api('/events/vulnerable');
  document.getElementById('events-vul').textContent = JSON.stringify(ev.decoded || ev, null, 2);
}

document.getElementById('refresh').addEventListener('click', refreshAll);

document.getElementById('attack-vul').addEventListener('click', async () => {
  const idx = Number(document.getElementById('signerIndex').value || 1);
  document.getElementById('result').textContent = 'Enviando ataque...';
  const r = await api('/attack/vulnerable', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signerIndex: idx }) });
  document.getElementById('result').textContent = JSON.stringify(r, null, 2);
  await refreshAll();
});

document.getElementById('attack-safe').addEventListener('click', async () => {
  const idx = Number(document.getElementById('signerIndex').value || 1);
  document.getElementById('result').textContent = 'Enviando intento al contrato seguro...';
  const r = await api('/attack/safe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signerIndex: idx }) });
  document.getElementById('result').textContent = JSON.stringify(r, null, 2);
  await refreshAll();
});

document.getElementById('refresh-storage').addEventListener('click', async () => {
  const s = await api('/storage/vulnerable');
  document.getElementById('storage-vul').textContent = JSON.stringify(s, null, 2);
  const ev = await api('/events/vulnerable');
  document.getElementById('events-vul').textContent = JSON.stringify(ev.decoded || ev, null, 2);
});

document.getElementById('get-trace').addEventListener('click', async () => {
  const tx = document.getElementById('txhash').value.trim();
  if (!tx) return alert('Introduce txHash');
  document.getElementById('trace').textContent = '(cargando...)';
  const r = await api('/trace/' + tx);
  document.getElementById('trace').textContent = JSON.stringify(r.trace || r, null, 2);
});

// auto-refresh on load
refreshAll().catch(err => { document.getElementById('result').textContent = String(err); });
