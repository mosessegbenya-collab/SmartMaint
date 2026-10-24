const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const names = ['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', 'EXPO_PUBLIC_CONVEX_URL', 'CONVEX_DEPLOYMENT', 'CLERK_JWT_ISSUER_DOMAIN'];
function preflight(root = process.cwd(), environment = process.env) {
  const mode = environment.NODE_ENV || 'development';
  const files = [`.env.${mode}.local`, ...(mode === 'test' ? [] : ['.env.local']), `.env.${mode}`, '.env'];
  const bindings = { ...environment };
  if (!/^(1|true)$/i.test(environment.EXPO_NO_DOTENV || '')) for (const file of files) {
    const target = path.join(root, file);
    if (fs.existsSync(target)) for (const [name, value] of Object.entries(parseEnv(fs.readFileSync(target, 'utf8')))) if (!(name in bindings)) bindings[name] = value;
  }
  const checks = names.map((name) => {
    const value = bindings[name]; let valid = !!value;
    if (valid && /URL|ISSUER/.test(name)) { try { const u = new URL(value); valid = u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && u.pathname === '/'; } catch { valid = false; } }
    if (valid && name === 'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY') valid = /^pk_(test|live)_[A-Za-z0-9_-]+$/.test(value);
    return { name, present: !!value, shapeValid: valid };
  });
  const unsafePublicVariableNames = Object.keys(bindings).filter((name) => /^EXPO_PUBLIC_.*(SECRET|PRIVATE|DEPLOY_KEY)/i.test(name) && !!bindings[name]);
  return { checks, unsafePublicVariableNames, bindings: 'source-derived public API references; no deployment-generated bindings verified', externalCalls: false, deploymentIssuerVerified: false, note: 'Local presence and shape only; issuer must also be configured and verified on the selected deployment.' };
}
module.exports = { preflight };
if (require.main === module) {
  const result = preflight(); console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes('--strict') && (result.checks.some((r) => !r.shapeValid) || result.unsafePublicVariableNames.length)) process.exitCode = 1;
}
