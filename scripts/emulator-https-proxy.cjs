// Local emulator troubleshooting only. CONNECT passes encrypted TLS unchanged;
// request bodies, tokens and headers are never inspected or logged.
const http = require('node:http');
const net = require('node:net');
const dns = require('node:dns').promises;
const allowed = ['clerk.accounts.dev', 'clerkaccounts.dev', 'clerk.com', 'clerk.dev'];
const server = http.createServer((request, response) => {
  let url;
  try { url = new URL(request.url); } catch { response.writeHead(403).end(); return; }
  // The development client also uses Metro's unencrypted loopback manifest.
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.port !== '8081') { response.writeHead(403).end(); return; }
  const upstream = http.request({ host: '127.0.0.1', port: 8081, path: url.pathname + url.search, method: request.method, headers: request.headers }, (result) => { response.writeHead(result.statusCode, result.headers); result.pipe(response); });
  upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
  request.pipe(upstream);
});
server.on('connect', async (request, client, head) => {
  try {
    const [host, port] = request.url.split(':');
    if (port !== '443' || !/^[a-z0-9.-]+$/i.test(host) || !allowed.some((suffix) => host === suffix || host.endsWith('.' + suffix))) throw Error('Unsupported target');
    const { address } = await dns.lookup(host, { family: 4 });
    const bytes = address.split('.').map(Number);
    if (bytes[0] === 0 || bytes[0] === 10 || bytes[0] === 127 || bytes[0] >= 224 || (bytes[0] === 169 && bytes[1] === 254) || (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31) || (bytes[0] === 192 && bytes[1] === 168)) throw Error('Public hosts only');
    const upstream = net.connect({ host: address, port: 443 });
    upstream.on('connect', () => { client.write('HTTP/1.1 200 Connection Established\r\n\r\n'); if (head.length) upstream.write(head); client.pipe(upstream); upstream.pipe(client); });
    upstream.on('error', () => client.destroy());
    client.on('error', () => upstream.destroy());
    client.on('close', () => upstream.destroy());
    upstream.setTimeout(60000, () => upstream.destroy());
  } catch { client.end('HTTP/1.1 502 Bad Gateway\r\n\r\n'); }
});
server.listen(8082, '127.0.0.1', () => process.stdout.write('Emulator identity TLS tunnel listening on loopback:8082\n'));
