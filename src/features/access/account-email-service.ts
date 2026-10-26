type Email = {
  verification: { status: string | null };
  prepareVerification: (params: { strategy: 'email_code' }) => Promise<unknown>;
  attemptVerification: (params: { code: string }) => Promise<{ verification: { status: string | null } }>;
};

export async function sendAccountEmailCode(email: Email, retryAt: number, now = Date.now()) {
  if (email.verification.status === 'verified') return false;
  if (!Number.isFinite(retryAt) || now < retryAt) return false;
  await email.prepareVerification({ strategy: 'email_code' });
  return true;
}

export async function verifyAccountEmail(email: Email, code: string, refresh: () => Promise<void>) {
  if (!code.trim()) throw { code: 'code_required' };
  const result = await email.attemptVerification({ code: code.trim() });
  if (result.verification.status !== 'verified') throw { code: result.verification.status === 'expired' ? 'verification_expired' : 'verification_incomplete' };
  // Reload authoritative identity and claims before requesting a fresh staff resolution.
  // This operation never creates or approves a staff account.
  await refresh();
}

export async function refreshIdentityClaims(port: {
  reloadUser: () => Promise<unknown>;
  reloadSession: () => Promise<{ audience?: unknown } | void>;
  clearCache: () => void;
  refreshToken: (options: { skipCache: true; template?: 'convex' }) => Promise<unknown>;
  reconnect: () => void;
}) {
  await port.reloadUser();
  const session = await port.reloadSession();
  port.clearCache();
  // Match the installed ConvexProviderWithClerk: activated integration uses the
  // session token; only legacy configurations request a named JWT template.
  try {
    await port.refreshToken(convexTokenOptions(session?.audience));
  } catch (error) {
    if (errorCode(error) === 'resource_not_found') throw { code: 'backend_auth_unconfigured' };
    throw error;
  } // The caller discards token results; never log or persist them.
  // Owned above authorization-keyed screens: those screens can unmount while
  // reload is pending and must not be responsible for committing this handoff.
  port.reconnect();
}

export function convexTokenOptions(audience: unknown): { skipCache: true; template?: 'convex' };
export function convexTokenOptions(audience: unknown, skipCache: boolean): { skipCache: boolean; template?: 'convex' };
export function convexTokenOptions(audience: unknown, skipCache = true): { skipCache: boolean; template?: 'convex' } {
  return audience === 'convex' ? { skipCache } : { template: 'convex', skipCache };
}

export async function fetchConvexSessionToken(port: {
  signedIn: boolean;
  sessionReady: boolean;
  pendingTask: boolean;
  audience: unknown;
  getToken: (options: { skipCache: boolean; template?: 'convex' }) => Promise<string | null>;
}, forceRefreshToken: boolean) {
  if (!port.signedIn || !port.sessionReady || port.pendingTask) return null;
  try {
    const options = convexTokenOptions(port.audience, forceRefreshToken);
    const token = await port.getToken(options);
    // An integration audience alone does not establish that the custom primary
    // email claims were configured on session tokens. Use the existing supported
    // legacy template when those claims are absent, without inventing any claim.
    if (token && !options.template && needsLegacyClaimsToken(token)) {
      return await port.getToken({ template: 'convex', skipCache: true });
    }
    return token;
  }
  catch { return null; }
}

function needsLegacyClaimsToken(token: string): boolean {
  try {
    const value: unknown = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
    const claims = value as Record<string, unknown>;
    // A real false stays false: do not search for a more permissive token.
    if (claims.email_verified === false || claims.emailVerified === false) return false;
    return !(typeof claims.email === 'string' && claims.email.length > 0
      && (typeof claims.email_verified === 'boolean' || typeof claims.emailVerified === 'boolean'));
  } catch { return true; }
}

/** A new reactive connection must not begin with pre-verification cached claims. */
export function createFreshConvexTokenFetcher(port: () => Parameters<typeof fetchConvexSessionToken>[0]) {
  let initialized = false;
  return async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    const token = await fetchConvexSessionToken(port(), forceRefreshToken || !initialized);
    if (token) initialized = true;
    return token;
  };
}

function errorCode(error: unknown) {
  const object = error && typeof error === 'object' ? error as { code?: string; errors?: { code?: string }[] } : {};
  return object.errors?.[0]?.code ?? object.code;
}

export function accountEmailError(error: unknown) {
  const code = errorCode(error);
  if (code === 'backend_auth_unconfigured') return 'The Clerk–Convex connection needs configuration. Activate the Convex integration in this Clerk development instance, or configure its legacy convex JWT template. Then refresh account status. Staff access remains locked.';
  if (code === 'code_required') return 'Enter the verification code.';
  if (code === 'verification_expired' || code === 'form_code_expired') return 'This code expired. Request a new code.';
  if (code === 'form_code_incorrect') return 'The code is incorrect. Try again or request a new code.';
  if (code === 'too_many_requests' || code === 'verification_failed' || code === 'form_code_max_attempts_exceeded') return 'Too many attempts. Wait before requesting a new code.';
  if (code === 'session_expired' || code === 'session_revoked' || code === 'unauthenticated') return 'Your session is no longer active. Sign in again.';
  return 'Email verification could not finish. Check your connection, refresh account status, or request a new code.';
}
