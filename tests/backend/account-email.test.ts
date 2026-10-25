import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { accountEmailError, refreshIdentityClaims, sendAccountEmailCode, verifyAccountEmail } from '../../src/features/access/account-email-service';
import { canUseTrustedAccount, resolveAccessState } from '../../src/domain/staff-access';

test('signed-in unverified accounts expose email verification instead of a dead end', () => {
  const status = readFileSync('src/features/staff/status.tsx', 'utf8');
  expect(status).toContain('<AccountEmailVerification');
  expect(status).toContain('identity_unverified');
});

function email() {
  return { verification: { status: 'unverified' }, prepareVerification: vi.fn(async () => ({})),
    attemptVerification: vi.fn(async (_params: { code: string }) => ({ verification: { status: 'verified' } })) };
}

test('request and resend use the signed-in email resource, respecting the deadline', async () => {
  const resource = email();
  expect(await sendAccountEmailCode(resource, 0, 1000)).toBe(true);
  expect(resource.prepareVerification).toHaveBeenCalledWith({ strategy: 'email_code' });
  expect(await sendAccountEmailCode(resource, 31000, 30999)).toBe(false);
  expect(resource.prepareVerification).toHaveBeenCalledTimes(1);
  expect(await sendAccountEmailCode(resource, 31000, 31000)).toBe(true);
  resource.verification.status = 'verified';
  expect(await sendAccountEmailCode(resource, 0, 32000)).toBe(false);
  expect(resource.prepareVerification).toHaveBeenCalledTimes(2);
});

test('delivery failure does not report success and permits a subsequent retry', async () => {
  const resource = email();
  resource.prepareVerification.mockRejectedValueOnce({ code: 'network_error', message: '[REDACTED]' });
  await expect(sendAccountEmailCode(resource, 0)).rejects.toEqual({ code: 'network_error', message: '[REDACTED]' });
  expect(await sendAccountEmailCode(resource, 0)).toBe(true);
});

test('successful code verification awaits identity refresh and never grants staff access', async () => {
  const resource = email(), refresh = vi.fn(async () => {});
  await verifyAccountEmail(resource, ' 000000 ', refresh); // synthetic placeholder only
  expect(resource.attemptVerification).toHaveBeenCalledWith({ code: '000000' });
  expect(refresh).toHaveBeenCalledOnce();
  expect(resource.attemptVerification.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
  for (const status of ['identity_unverified', 'no_application', 'pending', 'rejected']) {
    const resolution = resolveAccessState({ loaded: true, signedIn: true, expired: false, task: null, connected: true, authLoading: false, authenticated: true, timedOut: false, value: { status } });
    expect(canUseTrustedAccount(resolution, true, true)).toBe(false);
    expect(resolution.account).toBeNull();
  }
});

test.each(['unverified', 'expired', 'failed'])('a %s result cannot refresh authorization', async (status) => {
  const resource = email(), refresh = vi.fn(async () => {});
  resource.attemptVerification.mockResolvedValue({ verification: { status } });
  await expect(verifyAccountEmail(resource, '000000', refresh)).rejects.toEqual({ code: status === 'expired' ? 'verification_expired' : 'verification_incomplete' });
  expect(refresh).not.toHaveBeenCalled();
});

test('empty, incorrect and expired codes cannot refresh; errors remain retryable', async () => {
  const resource = email(), refresh = vi.fn(async () => {});
  await expect(verifyAccountEmail(resource, ' ', refresh)).rejects.toEqual({ code: 'code_required' });
  expect(resource.attemptVerification).not.toHaveBeenCalled();
  for (const code of ['form_code_incorrect', 'verification_expired', 'session_expired']) {
    resource.attemptVerification.mockRejectedValueOnce({ errors: [{ code, longMessage: '[REDACTED]' }] });
    await expect(verifyAccountEmail(resource, '000000', refresh)).rejects.toBeDefined();
  }
  expect(refresh).not.toHaveBeenCalled();
  await verifyAccountEmail(resource, '000000', refresh);
  expect(refresh).toHaveBeenCalledOnce();
});

test('refresh orders user, session, token-cache invalidation and uncached claims; failures propagate', async () => {
  const order: string[] = [];
  const port = { reloadUser: async () => { order.push('user'); }, reloadSession: async () => { order.push('session'); },
    clearCache: () => { order.push('clear'); }, refreshToken: async () => { order.push('claims'); } };
  await refreshIdentityClaims(port);
  expect(order).toEqual(['user', 'session', 'clear', 'claims']);
  const resource = email();
  await expect(verifyAccountEmail(resource, '000000', async () => { throw { code: 'network_error' }; })).rejects.toEqual({ code: 'network_error' });
  const claims = vi.fn(async () => {});
  await expect(refreshIdentityClaims({ ...port, reloadUser: async () => { throw { code: 'session_expired' }; }, refreshToken: claims })).rejects.toEqual({ code: 'session_expired' });
  expect(claims).not.toHaveBeenCalled();
});

test('fixed error messages cover expiry, rate limits and revoked sessions without echoing provider material', () => {
  expect(accountEmailError({ code: 'verification_expired' })).toMatch(/expired.*new code/);
  expect(accountEmailError({ errors: [{ code: 'form_code_incorrect' }] })).toMatch(/incorrect/);
  expect(accountEmailError({ code: 'too_many_requests' })).toMatch(/Wait/);
  expect(accountEmailError({ code: 'session_revoked' })).toMatch(/Sign in again/);
  expect(accountEmailError({ errors: [{ longMessage: '[REDACTED]' }], message: '[REDACTED]' })).not.toContain('[REDACTED]');
  const component = readFileSync('src/features/access/account-email.tsx', 'utf8');
  expect(component).toContain('Cancel code entry');
  expect(component).toContain('Resend verification code');
  expect(component).toContain('identity.sessionId');
  expect(component).not.toMatch(/console\.|localStorage|sessionStorage|unsafeMetadata/);
  const identity = readFileSync('src/features/access/identity.tsx', 'utf8');
  expect(identity).toContain('template: "convex", skipCache: true');
});
