// Never emit environment values, credentials, identity claims, or tokens.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { parseEnv } = require('node:util');
const target = 'greedy-bat-971';
const expectedUrl = `https://${target}.convex.cloud`;
function bindings() {
  const env = { ...process.env };
  for (const name of ['.env.development.local', '.env.local', '.env.development', '.env']) if (fs.existsSync(name)) {
    for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(name, 'utf8')))) if (!(key in env)) env[key] = value;
  }
  return env;
}
function cli(args, env) {
  const result = cp.spawnSync(process.execPath, ['node_modules/convex/bin/main.js', ...args], { env, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) {
    const detail = result.stderr || '';
    const category = /Could not find|not found|not a public/i.test(detail) ? 'function unavailable' : /fetch failed|ENOTFOUND|ETIMEDOUT|network/i.test(detail) ? 'network' : /system|_system|invalid.*function/i.test(detail) ? 'system function unsupported by run' : 'CLI failure';
    throw Error(`Read-only Convex command failed (${args[0]}, exit ${result.status}, ${category}); no credential-bearing output was emitted.`);
  }
  return result.stdout.trim();
}
async function inspect(remote = false) {
  const env = bindings();
  const selected = env.CONVEX_DEPLOYMENT?.split(':')[0] === 'dev' && env.CONVEX_DEPLOYMENT?.split(':')[1]?.split(' ')[0] === target;
  const urlMatches = env.EXPO_PUBLIC_CONVEX_URL?.replace(/\/$/, '') === expectedUrl;
  const result = { at: new Date().toISOString(), target: { kind: 'dev', name: target, url: expectedUrl, selected, appUrlMatches: urlMatches }, presence: Object.fromEntries(['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CONVEX_DEPLOY_KEY', 'CLERK_SECRET_KEY', 'SMARTMAINT_TEST_TOKEN'].map((name) => [name, !!env[name]])) };
  if (!selected || !urlMatches) throw Error('Configured deployment does not match the authorized existing development target.');
  if (process.argv.includes('--signed-out')) {
    const { ConvexHttpClient } = require('convex/browser');
    const { makeFunctionReference } = require('convex/server');
    const client = new ConvexHttpClient(expectedUrl, { logger: false });
    const resolution = await client.query(makeFunctionReference('staff:resolve'), {});
    const checks = [];
    for (const name of ['operations:equipment', 'operations:reports', 'operations:tasks', 'extensions:preferences']) {
      try { await client.query(makeFunctionReference(name), {}); checks.push({ function: name, denied: false }); }
      catch (failure) { checks.push({ function: name, denied: /Sign in|not authorized|authenticated/i.test(failure.message) }); }
    }
    result.signedOut = { resolution: resolution.status, checks };
  }
  if (remote) {
    const names = cli(['env', 'list', '--names-only', '--deployment', target], env);
    const issuerPresent = /\bCLERK_JWT_ISSUER_DOMAIN\b/.test(names);
    const issuer = issuerPresent ? cli(['env', 'get', 'CLERK_JWT_ISSUER_DOMAIN', '--deployment', target], env).replace(/^"|"$/g, '') : '';
    let issuerValid = false, issuerMatchesKey = false, discoveryMatches = false, jwksAvailable = false;
    let expectedIssuerReachable = false;
    const keyHost = Buffer.from((env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '').replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
    if (/^[a-z0-9.-]+\.clerk\.accounts\.dev$/.test(keyHost)) {
      try { const r = await fetch(`https://${keyHost}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15000) }); const d = await r.json(); expectedIssuerReachable = r.ok && d.issuer === `https://${keyHost}`; } catch { /* Record failure, never infer JWT acceptance. */ }
    }
    try {
      const u = new URL(issuer); issuerValid = u.protocol === 'https:' && !u.username && !u.password && u.pathname === '/' && !u.search && !u.hash;
      const host = Buffer.from((env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '').replace(/^pk_(test|live)_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
      issuerMatchesKey = u.host === host;
      const response = await fetch(`${u.origin}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(15000) });
      const discovery = await response.json(); discoveryMatches = response.ok && discovery.issuer?.replace(/\/$/, '') === u.origin;
      if (typeof discovery.jwks_uri === 'string' && new URL(discovery.jwks_uri).origin === u.origin) {
        const keys = await fetch(discovery.jwks_uri, { signal: AbortSignal.timeout(15000) });
        jwksAvailable = keys.ok && Array.isArray((await keys.json()).keys);
      }
    } catch { /* Only booleans are recorded. A failed discovery is never acceptance. */ }
    result.remote = { issuerPresent, issuerValid, issuerMatchesKey, discoveryMatches, jwksAvailable, expectedIssuerReachable, issuerShape: { length: issuer.length, startsHttps: issuer.startsWith('https://'), containsEquals: issuer.includes('='), containsQuotes: /['"]/.test(issuer), lines: issuer.split(/\r?\n/).length }, tableNames: cli(['data', '--deployment', target], env).split(/\r?\n/).filter(Boolean) };
    if (process.argv.includes('--repair-empty-issuer')) {
      if (issuer.length !== 0 || !expectedIssuerReachable || env.CONVEX_DEPLOY_KEY) throw Error('Issuer correction requires an empty development setting and verified existing Clerk public discovery.');
      cli(['env', 'set', 'CLERK_JWT_ISSUER_DOMAIN', `https://${keyHost}`, '--deployment', target], env);
      result.remote.emptyIssuerCorrected = true;
    }
    if (process.argv.includes('--compatibility')) {
      try { const schema = JSON.parse(cli(['run', '_system/frontend/getSchemas', '{}', '--deployment', target], env)); fs.writeFileSync('validation/continuation-2026-10-25/deployed-schema.json', JSON.stringify(schema, null, 2)); }
      catch (failure) { result.remote.schemaInspection = failure.message; }
      result.remote.dataPresence = JSON.parse(cli(['run', '--inline-query', 'return { departments: !!(await ctx.db.query("departments").first()), staffAccounts: !!(await ctx.db.query("staffAccounts").first()), applications: !!(await ctx.db.query("registrationRequests").first()), accessPolicy: (await ctx.db.query("accessPolicy").take(2)).map(p => ({ manualVerificationEnabled: p.manualVerificationEnabled })), activeSafetyPolicy: !!(await ctx.db.query("safetyPolicies").filter(q => q.eq(q.field("active"), true)).first()) };', '--deployment', target], env));
    }
  }
  return result;
}
module.exports = { bindings, cli, inspect, expectedUrl, target };
  if (require.main === module) inspect(process.argv.includes('--remote')).then((result) => {
  const output = JSON.stringify(result, null, 2); console.log(output);
  fs.writeFileSync(path.join('validation/continuation-2026-10-25', process.argv.includes('--remote') ? 'integration-configuration.json' : process.argv.includes('--signed-out') ? 'live-signed-out.json' : 'local-configuration.json'), output + '\n');
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
