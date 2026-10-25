export const SSO_CALLBACK_PATH = "/sso-callback";
export const ACCOUNT_STATUS_PATH = "/access/pending";
export const SSO_SIGN_IN_PATH = "/sso-continue/sign-in";
export const SSO_SIGN_UP_PATH = "/sso-continue/sign-up";
export const SSO_TASK_PATH = "/sso-continue/task";
export const sessionTaskUrls = {
  "choose-organization": SSO_TASK_PATH,
  "reset-password": SSO_TASK_PATH,
  "setup-mfa": SSO_TASK_PATH,
};

// Clerk owns callback parsing, cookies, handshake and activation. Never copy callback parameters.
export const webCallbackOptions = {
  signInUrl: SSO_SIGN_IN_PATH,
  signUpUrl: SSO_SIGN_UP_PATH,
  firstFactorUrl: SSO_SIGN_IN_PATH,
  secondFactorUrl: SSO_SIGN_IN_PATH,
  resetPasswordUrl: SSO_SIGN_IN_PATH,
  continueSignUpUrl: SSO_SIGN_UP_PATH,
  verifyEmailAddressUrl: SSO_SIGN_UP_PATH,
  verifyPhoneNumberUrl: SSO_SIGN_UP_PATH,
  signInProtectCheckUrl: SSO_SIGN_IN_PATH,
  signUpProtectCheckUrl: SSO_SIGN_UP_PATH,
  signInForceRedirectUrl: ACCOUNT_STATUS_PATH,
  signUpForceRedirectUrl: ACCOUNT_STATUS_PATH,
  signInFallbackRedirectUrl: ACCOUNT_STATUS_PATH,
  signUpFallbackRedirectUrl: ACCOUNT_STATUS_PATH,
};

export function ssoFailureMessage(error: unknown): string {
  const codes = error && typeof error === "object" ? ["code" in error ? error.code : null, ...("errors" in error && Array.isArray(error.errors) ? error.errors.map((e: { code?: unknown }) => e?.code) : [])] : [];
  return codes.some((code) => code === "oauth_access_denied" || code === "user_cancelled")
    ? "Sign-in was cancelled. Start a fresh sign-in when you are ready."
    : "Identity sign-in could not finish. Start a fresh sign-in session and try again.";
}

export async function finishWebCallback(port: {
  handle: (options: typeof webCallbackOptions) => Promise<unknown>;
  session: () => { currentTask?: unknown } | null | undefined;
  navigate: (path: typeof ACCOUNT_STATUS_PATH | typeof SSO_TASK_PATH) => void;
  hasNavigated?: () => boolean;
}) {
  await port.handle(webCallbackOptions);
  if (port.hasNavigated?.()) return "complete" as const;
  // A fallback is permitted only after Clerk's handler completes and an activated/pending session exists.
  const session = port.session();
  if (!session) return "incomplete" as const;
  port.navigate(session.currentTask ? SSO_TASK_PATH : ACCOUNT_STATUS_PATH);
  return "complete" as const;
}

export async function finishNativeSSO(result: {
  createdSessionId: string | null;
  setActive?: (params: { session: string }) => Promise<void>;
  authSessionResult?: { type: string } | null;
}, navigate: (path: typeof ACCOUNT_STATUS_PATH) => void) {
  if (result.authSessionResult?.type === "cancel" || result.authSessionResult?.type === "dismiss") return "cancelled" as const;
  if (!result.createdSessionId || !result.setActive) return "incomplete" as const;
  await result.setActive({ session: result.createdSessionId });
  navigate(ACCOUNT_STATUS_PATH);
  return "complete" as const;
}
