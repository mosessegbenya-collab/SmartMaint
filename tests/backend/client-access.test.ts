import { expect, test, vi } from "vitest";
import { decodeStaffResolution, resolveAccessState, canUseTrustedAccount, accessCacheKey, nextConnection, observeAuthorization } from "../../src/domain/staff-access";
import { requestEmailCode, verifyEmailAttempt } from "../../src/features/access/email-code-service";
import { tabItems } from "../../src/navigation/tabs";

const response = { status: "approved", account: { id: "account-a", name: "Test Staff", staffId: "TEST-A", email: "test@example.invalid", departmentId: "department-a", role: "Clinician", capabilities: ["report", "clinical"], scope: ["department-a"], grantableRoles: [], revision: 1 } };
const state = { loaded: true, signedIn: true, expired: false, task: null, connected: true, authLoading: false, authenticated: true, timedOut: false, value: response };
test("only a connected, authenticated approved resolution opens live access", () => {
  const resolution = resolveAccessState(state);
  expect(canUseTrustedAccount(resolution, true, true)).toBe(true);
  expect(canUseTrustedAccount(resolution, false, true)).toBe(false);
  expect(canUseTrustedAccount(resolution, true, false)).toBe(false);
  for (const status of ["pending", "rejected", "suspended", "revoked", "unconfigured", "authorization_error"]) expect(canUseTrustedAccount({ status: status as typeof resolution.status, account: null }, true, true)).toBe(false);
});
test("malformed and escalated backend responses fail closed", () => {
  for (const value of [null, {}, { status: "approved" }, { ...response, account: { ...response.account, role: "Unknown" } }, { ...response, account: { ...response.account, capabilities: ["roles"] } }, { ...response, account: { ...response.account, scope: [] } }, { ...response, account: { ...response.account, scope: ["department-a", "department-a"] } }]) {
    expect(decodeStaffResolution(value)).toEqual({ status: "authorization_error", account: null });
  }
});
test("loading, session expiry, lookup errors, timeout and disconnect discard cached grants", () => {
  expect(resolveAccessState({ ...state, loaded: false }).status).toBe("loading");
  expect(resolveAccessState({ ...state, signedIn: false, expired: true }).status).toBe("session_expired");
  expect(resolveAccessState({ ...state, signedIn: false }).status).toBe("unauthenticated");
  expect(resolveAccessState({ ...state, connected: false })).toEqual({ status: "backend_unavailable", account: null });
  expect(resolveAccessState({ ...state, authenticated: false })).toEqual({ status: "authorization_error", account: null });
  expect(resolveAccessState({ ...state, value: undefined, timedOut: true })).toEqual({ status: "timeout", account: null });
  expect(resolveAccessState({ ...state, task: "choose-organization" }).status).toBe("session_task");
});
test("reconnect requires a different query key and a fresh server result", () => {
  let connection = { connected: true, generation: 1 };
  connection = nextConnection(connection, false);
  expect(connection.connected).toBe(false);
  connection = nextConnection(connection, true);
  expect(connection.generation).toBe(2);
  expect(resolveAccessState({ ...state, value: undefined })).toEqual({ status: "loading", account: null });
  expect(resolveAccessState({ ...state, value: { status: "revoked" } }).account).toBeNull();
});
test("account switches, role changes, scope changes and revocation invalidate protected-state keys", () => {
  const initial = decodeStaffResolution(response);
  const key = accessCacheKey("session-a", initial);
  expect(accessCacheKey("session-b", initial)).not.toBe(key);
  expect(accessCacheKey("session-a", decodeStaffResolution({ ...response, account: { ...response.account, revision: 2 } }))).not.toBe(key);
  expect(accessCacheKey("session-a", decodeStaffResolution({ status: "suspended" }))).not.toBe(key);
  expect(accessCacheKey("session-a", decodeStaffResolution({ ...response, account: { ...response.account, scope: ["department-a", "department-b"] } }))).not.toBe(key);
});
test("a confirmed authorization change replaces the record client exactly once", () => {
  const initial = observeAuthorization(null, "session-a", "approved-revision-1");
  expect(initial.reset).toBe(false);
  const changed = observeAuthorization(initial.next, "session-a", "approved-revision-2");
  expect(changed.reset).toBe(true);
  expect(observeAuthorization(changed.next, "session-a", "approved-revision-2").reset).toBe(false);
  const revoked = observeAuthorization(changed.next, "session-a", "revoked");
  expect(revoked.reset).toBe(true);
  expect(observeAuthorization(revoked.next, "session-a", "revoked").reset).toBe(false);
  expect(observeAuthorization(revoked.next, "session-b", "approved-revision-1").reset).toBe(false); // Session-keyed client is already new.
});
test("valid email verification finalizes exactly once without issuing staff authorization", async () => {
  const finalize = vi.fn(async () => ({ error: null }));
  const result = await verifyEmailAttempt({ verify: vi.fn(async () => ({ error: null })), status: () => "complete", finalize }, " 123456 ");
  expect(result).toBe("complete"); expect(finalize).toHaveBeenCalledOnce();
});
test.each(["Invalid verification code", "Verification code expired", "Network unavailable"])("%s cannot finalize or open staff access", async (message) => {
  const finalize = vi.fn(async () => ({ error: null }));
  await expect(verifyEmailAttempt({ verify: async () => ({ error: new Error(message) }), status: () => "complete", finalize }, "000000")).rejects.toThrow(message);
  expect(finalize).not.toHaveBeenCalled();
});
test("additional challenges do not finalize; finalization errors are surfaced", async () => {
  const finalize = vi.fn(async () => ({ error: new Error("Finalize unavailable") }));
  expect(await verifyEmailAttempt({ verify: async () => ({ error: null }), status: () => "needs_second_factor", finalize }, "123456")).toBe("needs_second_factor");
  expect(finalize).not.toHaveBeenCalled();
  await expect(verifyEmailAttempt({ verify: async () => ({ error: null }), status: () => "complete", finalize }, "123456")).rejects.toThrow(/Finalize unavailable/);
});
test("resend cooldown blocks calls; network errors do not claim delivery", async () => {
  const send = vi.fn(async () => ({ error: null }));
  expect(await requestEmailCode(send, 30)).toBe(false); expect(send).not.toHaveBeenCalled();
  expect(await requestEmailCode(send, 0)).toBe(true); expect(send).toHaveBeenCalledOnce();
  await expect(requestEmailCode(async () => { throw new Error("Offline"); })).rejects.toThrow(/Offline/);
  await expect(requestEmailCode(async () => ({ error: new Error("Delivery unavailable") }))).rejects.toThrow(/Delivery unavailable/);
});
test("role navigation also respects narrowed capability grants", () => {
  const account = decodeStaffResolution(response).account!;
  expect(tabItems({ ...account, role: "Biomedical Technician", capabilities: ["report"] }).some((t) => t.name === "tasks")).toBe(false);
  expect(tabItems({ ...account, role: "Registration Approver", capabilities: [] }).some((t) => t.name === "accounts")).toBe(false);
  expect(tabItems({ ...account, role: "Biomedical Technician", capabilities: ["repair"] }).some((t) => t.name === "tasks")).toBe(true);
});
