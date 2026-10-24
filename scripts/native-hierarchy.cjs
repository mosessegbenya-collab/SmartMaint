let sequence = 0;
function readFreshHierarchy(run, generation = () => `${process.pid}-${Date.now()}-${++sequence}`) {
  const id = generation();
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw Error('Invalid native hierarchy generation.');
  const remote = `/sdcard/smartmaint-current-${id}.xml`;
  try {
    const output = run(['shell', 'uiautomator', 'dump', remote]);
    if (!output.includes(remote) || /ERROR:|null root node/i.test(output)) throw Error('Fresh Android UI hierarchy is unavailable; no stale file will be reused.');
    const xml = run(['exec-out', 'cat', remote]);
    if (!xml.includes('<hierarchy')) throw Error('Fresh UI hierarchy required.');
    return xml;
  } finally {
    try { run(['shell', 'rm', '-f', remote]); } catch { /* Only this generated temporary XML is eligible for cleanup. */ }
  }
}
module.exports = { readFreshHierarchy };
