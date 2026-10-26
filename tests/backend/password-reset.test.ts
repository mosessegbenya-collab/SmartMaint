import { expect, test, vi } from "vitest";
import { submitPasswordReset, verifyPasswordReset } from "../../src/features/access/password-reset-service";

function setup() {
  const port = {
    status: "needs_first_factor",
    resetPasswordEmailCode: {
      verifyCode: vi.fn(async (_params: { code: string }) => {
        port.status = "needs_new_password";
        return { error: null as unknown };
      }),
      submitPassword: vi.fn(async (_params: { password: string; signOutOfOtherSessions: boolean }) => ({ error: null as unknown })),
    },
  };
  return port;
}

test("reset cannot submit before code verification or with empty or mismatched passwords", async () => {
  const port = setup();
  await expect(submitPasswordReset(port, "test-only", "test-only")).rejects.toThrow(/Verify/);
  await expect(verifyPasswordReset(port, " ")).rejects.toThrow(/verification code/);
  expect(port.resetPasswordEmailCode.verifyCode).not.toHaveBeenCalled();
  expect(await verifyPasswordReset(port, " 123456 ")).toBe("needs_new_password");
  expect(port.resetPasswordEmailCode.verifyCode).toHaveBeenCalledExactlyOnceWith({ code: "123456" });
  await expect(submitPasswordReset(port, "", "")).rejects.toThrow(/new password/);
  await expect(submitPasswordReset(port, "test-only", "different")).rejects.toThrow(/match/);
  expect(port.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
});

test("expired or invalid Clerk codes never advance recovery", async () => {
  const port = setup();
  port.resetPasswordEmailCode.verifyCode.mockImplementationOnce(async () => ({ error: { code: "verification_expired" } }));
  await expect(verifyPasswordReset(port, "123456")).rejects.toEqual({ code: "verification_expired" });
  expect(port.status).toBe("needs_first_factor");
  expect(port.resetPasswordEmailCode.submitPassword).not.toHaveBeenCalled();
});

test("reset revokes other sessions, preserves password bytes and propagates Clerk policy errors", async () => {
  const port = setup();
  await verifyPasswordReset(port, "123456");
  port.resetPasswordEmailCode.submitPassword.mockResolvedValueOnce({ error: { code: "form_password_pwned" } });
  await expect(submitPasswordReset(port, " test-only ", " test-only ")).rejects.toEqual({ code: "form_password_pwned" });
  expect(port.resetPasswordEmailCode.submitPassword).toHaveBeenCalledExactlyOnceWith({ password: " test-only ", signOutOfOtherSessions: true });
  port.resetPasswordEmailCode.submitPassword.mockImplementationOnce(async () => { port.status = "needs_second_factor"; return { error: null }; });
  await submitPasswordReset(port, "test-only", "test-only");
  expect(port.status).toBe("needs_second_factor");
});
