import { expect, test, vi } from 'vitest';
import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { checkUnapprovedAccess, protectedAreas } from '../../src/features/access/unapproved-access-check';
import schema from '../../convex/schema';
import { staffApi } from '../../src/services/staff-api';

test('live-query probe distinguishes deliberate denials from transport errors and discards returned data', async () => {
  const query = vi.fn(async (area) => {
    if (area === 'equipment') throw new ConvexError('Institutional access policy is not configured.');
    if (area === 'reports') throw new ConvexError('An active approved staff account is required.');
    if (area === 'tasks') throw new Error('Access is not authorized.'); // Generic text is not proof of denial.
    if (area === 'preferences') throw new ConvexError('[PRIVATE ERROR]');
    return ['[PRIVATE RECORD]'];
  });
  const result = await checkUnapprovedAccess({ identityStatus: 'verified_identity', staffStatus: 'no_application', query });
  expect(query.mock.calls.map(([area]) => area)).toEqual([...protectedAreas]);
  expect(result).toMatchObject({ status: 'complete', allDenied: false, checks: [
    { area: 'equipment', outcome: 'denied', reason: 'policy_unconfigured' },
    { area: 'reports', outcome: 'denied', reason: 'approved_account_required' },
    { area: 'tasks', outcome: 'request_failed' },
    { area: 'preferences', outcome: 'request_failed' },
    { area: 'administration', outcome: 'unexpected_access' },
  ] });
  expect(JSON.stringify(result)).not.toContain('PRIVATE');
});

test('unverified, signed-out and approved sessions cannot be counted as an unapproved-user pass', async () => {
  const query = vi.fn();
  for (const [identityStatus, staffStatus] of [['unauthenticated', 'unauthenticated'], ['email_not_verified', 'identity_unverified'], ['verified_identity', 'approved']]) {
    expect(await checkUnapprovedAccess({ identityStatus, staffStatus, query })).toEqual({ status: 'not_tested', reason: 'verified_unapproved_identity_required' });
  }
  expect(query).not.toHaveBeenCalled();
});

test('actual protected Convex queries deny a verified caller with no application and no policy', async () => {
  const modules = {
    './staff.ts': () => import('../../convex/staff'),
    './auth_diagnostics.ts': () => import('../../convex/auth_diagnostics'),
    './operations.ts': () => import('../../convex/operations'),
    './extensions.ts': () => import('../../convex/extensions'),
    './administration.ts': () => import('../../convex/administration'),
    './_generated/server.ts': () => import('../../convex/_generated/server'),
  };
  const client = convexTest(schema, modules).withIdentity({ subject: 'synthetic-only', issuer: 'https://test.clerk.invalid', email: 'synthetic@example.invalid', emailVerified: true });
  const identity = await client.query(staffApi.auth_diagnostics.inspect, {});
  const resolution = await client.query(staffApi.staff.resolve, {});
  const queries = {
    equipment: () => client.query(staffApi.operations.equipment, {}),
    reports: () => client.query(staffApi.operations.reports, {}),
    tasks: () => client.query(staffApi.operations.tasks, {}),
    preferences: () => client.query(staffApi.extensions.preferences, {}),
    administration: () => client.query(staffApi.administration.accounts, {}),
  };
  const result = await checkUnapprovedAccess({ identityStatus: identity.status, staffStatus: resolution.status, query: (area) => queries[area]() });
  expect(result).toMatchObject({ status: 'complete', allDenied: true });
  expect(result.checks).toHaveLength(5);
  expect(result.checks?.every((check) => check.reason === 'policy_unconfigured')).toBe(true);
});
