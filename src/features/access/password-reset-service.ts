import { checkIdentityResult, type IdentityResult } from "./email-code-service";

type ResetPort = {
  status: string | null;
  resetPasswordEmailCode: {
    verifyCode: (params: { code: string }) => Promise<IdentityResult>;
    submitPassword: (params: { password: string; signOutOfOtherSessions: boolean }) => Promise<IdentityResult>;
  };
};

// Clerk owns verification and password policy. These helpers never activate a
// session or assign a staff role; the caller must inspect the resulting state.
export async function verifyPasswordReset(port: ResetPort, code: string) {
  if (!code.trim()) throw new Error("Enter the verification code.");
  checkIdentityResult(await port.resetPasswordEmailCode.verifyCode({ code: code.trim() }));
  return port.status;
}

export async function submitPasswordReset(port: ResetPort, password: string, confirmation: string) {
  if (port.status !== "needs_new_password") throw new Error("Verify your password reset code first.");
  if (!password) throw new Error("Enter a new password.");
  if (password !== confirmation) throw new Error("Passwords must match.");
  checkIdentityResult(await port.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true }));
}
