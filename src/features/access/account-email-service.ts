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
}

export function convexTokenOptions(audience: unknown): { skipCache: true; template?: 'convex' } {
  return audience === 'convex' ? { skipCache: true } : { template: 'convex', skipCache: true };
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
