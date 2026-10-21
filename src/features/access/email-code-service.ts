export type IdentityResult = { error: unknown };
export function checkIdentityResult(result: IdentityResult) { if (result.error) throw result.error; }

/** A verified identity is finalized here; no staff role or approval is ever created. */
export async function verifyEmailAttempt(port: {
  verify: (code: string) => Promise<IdentityResult>;
  status: () => string | null;
  finalize: () => Promise<IdentityResult>;
}, code: string) {
  if (!code.trim()) throw new Error("Enter the verification code.");
  checkIdentityResult(await port.verify(code.trim()));
  const status = port.status();
  if (status === "complete") checkIdentityResult(await port.finalize());
  return status;
}

export async function requestEmailCode(send: () => Promise<IdentityResult>, cooldown = 0) {
  if (!Number.isFinite(cooldown) || cooldown > 0) return false;
  checkIdentityResult(await send());
  return true;
}
