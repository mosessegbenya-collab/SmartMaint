import { expect, test, vi } from "vitest";
import { ACCOUNT_STATUS_PATH, SSO_CALLBACK_PATH, SSO_SIGN_IN_PATH, SSO_SIGN_UP_PATH, SSO_TASK_PATH, finishNativeSSO, finishWebCallback, sessionTaskUrls, ssoFailureMessage } from "../../src/features/access/sso-flow";
import { resolveAccessState } from "../../src/domain/staff-access";
import { webCallbackOptions } from "../../src/features/access/sso-flow";
import { existsSync, readFileSync } from "node:fs";

test('web callback waits for the Clerk handshake before routing an activated session to account status', async () => {
  let complete!: () => void; let activated = false;
  const pending = new Promise<void>((resolve) => { complete = resolve; });
  const navigate = vi.fn();
  const handle = vi.fn(async () => { await pending; activated = true; });
  const result = finishWebCallback({ handle, session: () => activated ? {} : null, navigate });
  expect(navigate).not.toHaveBeenCalled(); complete(); await result;
  expect(handle).toHaveBeenCalledOnce(); expect(navigate).toHaveBeenCalledWith(ACCOUNT_STATUS_PATH);
  expect(handle).toHaveBeenCalledWith(webCallbackOptions);
});

test('SDK-directed cookie/handshake navigation is preserved rather than replaced with an application redirect', async () => {
  const navigate = vi.fn(); let requested = false;
  expect(await finishWebCallback({ handle: async () => { requested = true; }, session: () => ({}), hasNavigated: () => requested, navigate })).toBe('complete');
  expect(navigate).not.toHaveBeenCalled();
});

test('web callback errors and incomplete/cancelled attempts never route to protected workspace', async () => {
  const navigate = vi.fn();
  await expect(finishWebCallback({ handle: async () => { throw { code: 'oauth_access_denied', message: '[REDACTED]' }; }, session: () => null, navigate })).rejects.toEqual(expect.objectContaining({ code: 'oauth_access_denied' }));
  expect(await finishWebCallback({ handle: async () => {}, session: () => null, navigate })).toBe('incomplete');
  expect(navigate).not.toHaveBeenCalled();
  expect(ssoFailureMessage({ errors: [{ code: 'oauth_access_denied', longMessage: '[REDACTED]' }] })).toMatch(/cancelled/);
  expect(ssoFailureMessage(Error('[REDACTED]'))).not.toContain('[REDACTED]');
});

test('pending session tasks are handled separately and cannot authorize staff access', async () => {
  const navigate = vi.fn();
  await finishWebCallback({ handle: async () => {}, session: () => ({ currentTask: { key: 'setup-mfa' } }), navigate });
  expect(navigate).toHaveBeenCalledWith(SSO_TASK_PATH);
  expect(Object.values(sessionTaskUrls)).toEqual([SSO_TASK_PATH, SSO_TASK_PATH, SSO_TASK_PATH]);
  expect(resolveAccessState({ loaded: true, signedIn: true, expired: false, task: 'setup-mfa', connected: true, authLoading: false, authenticated: true, timedOut: false, value: { status: 'no_application' } })).toEqual({ status: 'session_task', account: null });
  expect(resolveAccessState({ loaded: true, signedIn: true, expired: false, task: null, connected: true, authLoading: false, authenticated: true, timedOut: false, value: { status: 'pending' } }).account).toBeNull();
});

test('native activation is awaited; cancelled, incomplete and failed activations do not navigate', async () => {
  const navigate = vi.fn(), setActive = vi.fn(async () => {});
  expect(await finishNativeSSO({ createdSessionId: null, authSessionResult: { type: 'cancel' } }, navigate)).toBe('cancelled');
  expect(await finishNativeSSO({ createdSessionId: null }, navigate)).toBe('incomplete');
  expect(navigate).not.toHaveBeenCalled();
  await expect(finishNativeSSO({ createdSessionId: 'redacted-test-session', setActive: async () => { throw Error('[REDACTED]'); } }, navigate)).rejects.toThrow('[REDACTED]');
  expect(navigate).not.toHaveBeenCalled();
  await finishNativeSSO({ createdSessionId: 'redacted-test-session', setActive }, navigate);
  expect(setActive).toHaveBeenCalledWith({ session: 'redacted-test-session' });
  expect(navigate).toHaveBeenCalledWith(ACCOUNT_STATUS_PATH);
});

test('callback and continuation paths are explicit and never point directly at a workspace', () => {
  expect(SSO_CALLBACK_PATH).toBe('/sso-callback');
  expect([SSO_SIGN_IN_PATH, SSO_SIGN_UP_PATH, SSO_TASK_PATH, ACCOUNT_STATUS_PATH].every((p) => !p.startsWith('/workspace'))).toBe(true);
  expect(existsSync('src/app/sso-callback.tsx')).toBe(true);
  expect(existsSync('src/app/sso-continue/[flow].tsx')).toBe(true);
  expect(existsSync('src/features/access/sso.web.tsx')).toBe(false);
  expect(existsSync('src/features/access/sso.tsx')).toBe(false);
  const access = readFileSync('src/features/access/screens.tsx', 'utf8');
  expect(access).not.toMatch(/ConfiguredSSO|Continue with Google|Continue with Apple/);
  const callback = readFileSync('src/features/access/sso-callback.web.tsx', 'utf8');
  expect(callback).toContain('clerk.handleRedirectCallback');
  expect(callback).not.toMatch(/location\.(search|hash)|useLocalSearchParams|console\.(log|error|warn)|localStorage|sessionStorage/);
});
