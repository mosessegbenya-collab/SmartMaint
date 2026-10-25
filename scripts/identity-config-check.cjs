// Read-only configuration audit. Emit fixed status codes only.
require('./development-integration.cjs').inspect(true).then((result) => {
  console.log(JSON.stringify({
    target: result.target.selected && result.target.appUrlMatches ? 'development_target_expected' : 'target_mismatch',
    clerk: result.presence.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'clerk_key_present' : 'clerk_key_missing',
    issuer: result.remote.issuerValid && result.remote.issuerMatchesKey ? 'issuer_expected' : 'issuer_missing_or_mismatch',
    discovery: result.remote.discoveryMatches && result.remote.jwksAvailable ? 'issuer_keys_available' : 'issuer_discovery_failed',
  }));
}).catch(() => { console.log(JSON.stringify({ status: 'configuration_check_failed' })); process.exitCode = 1; });
