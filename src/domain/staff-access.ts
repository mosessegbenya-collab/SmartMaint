import { roles, type Account, type Role } from "./models";
import type { GenericId } from "convex/values";
import { allowedRoleCapabilities } from "./role-policy";

export type AccessStatus = "loading" | "unauthenticated" | "session_expired" | "identity_unverified" | "session_task" | "no_application" | "pending" | "rejected" | "approved" | "suspended" | "revoked" | "unconfigured" | "backend_unavailable" | "timeout" | "authorization_error";
export type TrustedAccount = Account & { id: GenericId<"staffAccounts">; status: "approved"; staffId: string; email: string; departmentId: GenericId<"departments">; scope: GenericId<"departments">[]; grantableRoles: Role[]; revision: number };
export type StaffApplication = { id: GenericId<"registrationRequests">; fullName: string; staffId: string; email: string; departmentId: GenericId<"departments">; department: string; requestedRole: Role; verificationStatus: "unverified" | "verified" | "failed"; submittedAt: number; revision: number; rejectionReason?: string };
export type StaffResolution = { status: AccessStatus; account: TrustedAccount | null; application?: StaffApplication };
const capabilities = ["report", "repair", "assign", "triage", "technical", "clinical", "accounts", "roles", "suspend", "reconcile", "audit", "analytics", "export", "hold"];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === "string" && s.length > 0 && s.length <= 200);
const role = (v: unknown): v is Role => typeof v === "string" && (roles as readonly string[]).includes(v);

/** Reject malformed server results; this validation never replaces server authorization. */
export function decodeStaffResolution(value: unknown): StaffResolution {
  const fail: StaffResolution = { status: "authorization_error", account: null };
  if (!record(value) || typeof value.status !== "string") return fail;
  if (["unauthenticated", "identity_unverified", "no_application", "suspended", "revoked", "unconfigured", "authorization_error"].includes(value.status)) return { status: value.status as AccessStatus, account: null };
  if (value.status === "approved") {
    const a = value.account;
    if (!record(a) || ![a.id, a.name, a.staffId, a.email, a.departmentId].every((v) => typeof v === "string" && v.length > 0) || !role(a.role)
      || !strings(a.capabilities) || a.capabilities.some((c) => !capabilities.includes(c)) || !strings(a.scope) || !a.scope.length || a.scope.length > 20
      || (a.classification !== undefined && a.classification !== "development-demo")
      || a.capabilities.some((c) => !allowedRoleCapabilities(a.role as Role, a.classification as "development-demo" | undefined).includes(c as Account["capabilities"][number]))
      || new Set(a.scope).size !== a.scope.length || new Set(a.capabilities).size !== a.capabilities.length
      || !a.scope.includes(String(a.departmentId)) || !Array.isArray(a.grantableRoles) || !a.grantableRoles.every(role)
      || !Number.isSafeInteger(a.revision) || Number(a.revision) < 1) return fail;
    return { status: "approved", account: { ...a, status: "approved" } as TrustedAccount };
  }
  if (value.status === "pending" || value.status === "rejected") {
    const a = value.application;
    if (!record(a) || ![a.id, a.fullName, a.staffId, a.email, a.departmentId, a.department].every((v) => typeof v === "string" && v.length > 0)
      || !role(a.requestedRole) || !["unverified", "verified", "failed"].includes(String(a.verificationStatus))
      || !Number.isSafeInteger(a.revision) || Number(a.revision) < 1 || !Number.isFinite(a.submittedAt) || (a.rejectionReason !== undefined && typeof a.rejectionReason !== "string")) return fail;
    return { status: value.status, account: null, application: a as StaffApplication };
  }
  return fail;
}
export function canUseTrustedAccount(resolution: StaffResolution, connected: boolean, authenticated: boolean): boolean {
  return authenticated && connected && resolution.status === "approved" && resolution.account !== null;
}
export function accessCacheKey(sessionId: string | null, resolution: StaffResolution): string {
  const a = resolution.account;
  return `${sessionId ?? "signed-out"}:${resolution.status}:${a ? `${a.id}:${a.revision}:${a.role}:${a.departmentId}:${a.scope.join(",")}:${a.capabilities.join(",")}:${a.grantableRoles.join(",")}` : "locked"}`;
}
export type ObservedAuthorization = { session: string | null; fingerprint: string } | null;
export function observeAuthorization(previous: ObservedAuthorization, session: string | null, fingerprint: string) {
  return { reset: previous !== null && previous.session === session && previous.fingerprint !== fingerprint, next: { session, fingerprint } };
}
export function nextConnection(previous: { connected: boolean; generation: number }, connected: boolean) {
  return connected === previous.connected ? previous : { connected, generation: previous.generation + (connected ? 1 : 0) };
}
export function resolveAccessState(input: {
  loaded: boolean; signedIn: boolean; expired: boolean; task: string | null; connected: boolean;
  authLoading: boolean; authenticated: boolean; timedOut: boolean; value: unknown;
}): StaffResolution {
  const locked = (status: AccessStatus): StaffResolution => ({ status, account: null });
  if (!input.loaded) return locked("loading");
  if (!input.signedIn) return locked(input.expired ? "session_expired" : "unauthenticated");
  if (input.task) return locked("session_task");
  if (input.timedOut && input.value === undefined) return locked("timeout");
  if (!input.connected) return locked("backend_unavailable");
  if (!input.authLoading && !input.authenticated) return locked("authorization_error");
  if (!input.authenticated || input.value === undefined) return locked("loading");
  return decodeStaffResolution(input.value);
}
