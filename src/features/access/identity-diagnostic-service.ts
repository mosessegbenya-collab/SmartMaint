export function claimType(value: unknown): string {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return ['string', 'boolean', 'number', 'object'].includes(typeof value) ? typeof value : 'other';
}

/** Examine in memory; return only fixed status codes and claim names/types. */
export function describeToken(payload: Record<string, unknown>, expectedIssuer: string, primaryEmail: string | undefined, now = Date.now()) {
  return {
    issuer: payload.iss === expectedIssuer ? 'issuer_expected' : 'issuer_mismatch',
    audience: payload.aud === 'convex' ? 'audience_expected' : 'audience_mismatch',
    expiry: typeof payload.exp === 'number' && payload.exp * 1000 > now ? 'token_current' : 'token_expired_or_invalid',
    primaryEmail: typeof payload.email === 'string' && payload.email === primaryEmail ? 'primary_email_matches' : 'primary_email_missing_or_mismatch',
    verification: payload.email_verified === true ? 'email_verified' : payload.email_verified === false ? 'email_not_verified' : 'email_verification_missing_or_invalid',
    claims: Object.fromEntries(['iss', 'aud', 'exp', 'email', 'email_verified', 'emailVerified'].map((key) => [key, claimType(payload[key])])),
  };
}

export async function checkFreshIdentity<Token, Diagnostic, Resolution>(port: {
  reload: () => Promise<void>;
  token: () => Promise<Token>;
  inspect: (token: Token) => Promise<Diagnostic>;
  resolve: (token: Token) => Promise<Resolution>;
}) {
  await port.reload();
  const token = await port.token();
  // Both requests use the same freshly acquired token, through a fresh HTTP client.
  const diagnostic = await port.inspect(token);
  const resolution = await port.resolve(token);
  return { diagnostic, resolution };
}
