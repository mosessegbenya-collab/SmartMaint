import { afterEach, expect, test, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../../convex/schema';
import { makeFunctionReference } from 'convex/server';
import { checkFreshIdentity, describeToken } from '../../src/features/access/identity-diagnostic-service';

const modules = {
  './auth_diagnostics.ts': () => import('../../convex/auth_diagnostics'),
  './staff.ts': () => import('../../convex/staff'),
  './operations.ts': () => import('../../convex/operations'),
  './_generated/server.ts': () => import('../../convex/_generated/server'),
};
const probe = makeFunctionReference<'query'>('auth_diagnostics:inspect');
const resolve = makeFunctionReference<'query'>('staff:resolve');
const base = { subject: 'synthetic-only', issuer: 'https://expected.clerk.invalid', email: 'redacted@example.invalid' };
afterEach(() => vi.unstubAllEnvs());

test('actual caller diagnostics distinguish missing claims from verified identity without leaking values', async () => {
  const t = convexTest(schema, modules);
  for (const [claims, status] of [
    [{}, 'email_missing'], [{ email: base.email }, 'email_verification_missing'],
    [{ email: base.email, emailVerified: false }, 'email_not_verified'],
    [{ email: base.email, emailVerified: true }, 'verified_identity'],
  ] as const) {
    const client = t.withIdentity({ subject: base.subject, issuer: base.issuer, ...claims });
    const result = await client.query(probe, {});
    expect(result.status).toBe(status);
    const serialized = JSON.stringify(result);
    for (const value of [base.email, base.subject, base.issuer]) expect(serialized).not.toContain(value);
    const resolution = await client.query(resolve, {});
    expect(resolution.status).toBe(status === 'verified_identity' ? 'no_application' : 'identity_unverified');
    expect(resolution).not.toHaveProperty('account');
  }
});

test('signed claim types and names remain strict; diagnostics compare the configured issuer', async () => {
  vi.stubEnv('CLERK_JWT_ISSUER_DOMAIN', base.issuer);
  const t = convexTest(schema, modules);
  const malformed = t.withIdentity({ ...base, emailVerified: 'true' as unknown as boolean });
  const result = await malformed.query(probe, {});
  expect(result.status).toBe('email_verification_type_invalid');
  expect(result.issuer).toBe('issuer_expected');
  expect(result.claims.emailVerified).toBe('string');
  expect((await malformed.query(resolve, {})).status).toBe('identity_unverified');
  const customAlias = t.withIdentity({ ...base, email_verified: true });
  expect((await customAlias.query(probe, {})).status).toBe('email_verification_missing');
  expect((await customAlias.query(resolve, {})).status).toBe('identity_unverified');
  expect((await t.withIdentity({ ...base, issuer: 'https://other.invalid' }).query(probe, {})).issuer).toBe('issuer_mismatch');
});

test('client diagnostics identify missing signed email claims without returning their values', () => {
  const payload = { iss: base.issuer, aud: 'convex', exp: 2000, email: base.email, email_verified: true, sub: base.subject, private: '[REDACTED]' };
  const valid = describeToken(payload, base.issuer, base.email, 1000);
  expect(valid).toMatchObject({ issuer: 'issuer_expected', audience: 'audience_expected', expiry: 'token_current', primaryEmail: 'primary_email_matches', verification: 'email_verified' });
  expect(valid.claims).toMatchObject({ email: 'string', email_verified: 'boolean', emailVerified: 'missing' });
  for (const value of [base.issuer, base.email, base.subject, '[REDACTED]']) expect(JSON.stringify(valid)).not.toContain(value);
  expect(describeToken({ ...payload, email_verified: 'true' }, base.issuer, base.email).verification).toBe('email_verification_missing_or_invalid');
  expect(describeToken({}, base.issuer, base.email).claims.email).toBe('missing');
});

test('fresh diagnostic and resolution use the exact freshly requested token, after reload; errors propagate', async () => {
  const order: string[] = [];
  const token = { redacted: true };
  const inspect = vi.fn(async (_token: typeof token) => { order.push('inspect'); return 'verified_identity'; });
  const resolve = vi.fn(async (_token: typeof token) => { order.push('resolve'); return 'no_application'; });
  const port = { reload: async () => { order.push('reload'); }, token: async () => { order.push('token'); return token; }, inspect, resolve };
  expect(await checkFreshIdentity(port)).toEqual({ diagnostic: 'verified_identity', resolution: 'no_application' });
  expect(order).toEqual(['reload', 'token', 'inspect', 'resolve']);
  expect(inspect).toHaveBeenCalledExactlyOnceWith(token);
  expect(resolve).toHaveBeenCalledExactlyOnceWith(token);
  inspect.mockClear(); resolve.mockClear();
  await expect(checkFreshIdentity({ ...port, token: async () => { throw { code: 'session_expired' }; } })).rejects.toEqual({ code: 'session_expired' });
  expect(inspect).not.toHaveBeenCalled(); expect(resolve).not.toHaveBeenCalled();
});

test('signed-out and forged verification arguments cannot satisfy diagnostics or staff authorization', async () => {
  const t = convexTest(schema, modules);
  expect((await t.query(probe, {})).status).toBe('unauthenticated');
  await expect(t.query(probe, { emailVerified: true })).rejects.toThrow();
  await expect(t.withIdentity({ ...base, emailVerified: true }).query(makeFunctionReference<'query'>('operations:equipment'), {})).rejects.toThrow(/policy|approved/);
});
