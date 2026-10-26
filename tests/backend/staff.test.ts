import { afterEach, describe, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference, type FunctionReturnType } from "convex/server";
import schema from "../../convex/schema";
import { staffApi as api } from "../../src/services/staff-api";
import { POLICY_VERSION, roleCapabilities } from "../../convex/lib/access";
import { roles, type Role } from "../../src/domain/models";
import * as operator from "../../convex/operator";
import { internal } from "../../convex/_generated/api";
import { protectLastAdministrator } from "../../convex/lib/access";
import type { Value } from "convex/values";

const modules = {
  "./staff.ts": () => import("../../convex/staff"),
  "./administration.ts": () => import("../../convex/administration"),
  "./operations.ts": () => import("../../convex/operations"),
  "./operator.ts": () => import("../../convex/operator"),
  // Test loader root marker only. No generated bindings or deployment are fabricated.
  "./_generated/test-loader-marker.js": async () => ({}),
};
const user = (subject: string, emailVerified = true) => ({ subject, issuer: "https://test.clerk.invalid", tokenIdentifier: `https://test.clerk.invalid|${subject}`, email: `${subject}@example.invalid`, emailVerified });
const createTest = () => convexTest(schema, modules);
async function setup(manual = true) {
  const t = createTest();
  const base = await t.run(async (ctx) => {
    const a = await ctx.db.insert("departments", { code: "TEST-A", name: "Test Department A", active: true });
    const b = await ctx.db.insert("departments", { code: "TEST-B", name: "Test Department B", active: true });
    await ctx.db.insert("accessPolicy", { key: "staff-access", version: POLICY_VERSION, manualVerificationEnabled: manual, institutionalPolicyReference: "TEST-POLICY-ONLY", configuredAt: Date.now() });
    const seed = async (subject: string, role: Role, scope = [a]) => ctx.db.insert("staffAccounts", {
      identity: user(subject).tokenIdentifier, clerkUserId: subject, email: user(subject).email, verifiedStaffId: `TEST-${subject.toUpperCase()}`, fullName: `Test ${subject}`,
      departmentId: scope[0], role, capabilities: roleCapabilities[role], scope,
      grantableRoles: role === "Administrator" ? [...roles] : [], status: "approved", approvedAt: Date.now(), revision: 1, createdAt: Date.now(), updatedAt: Date.now(),
    });
    const adminId = await seed("admin", "Administrator");
    const clinicianId = await seed("clinician", "Clinician");
    const technicianId = await seed("technician", "Biomedical Technician");
    const supervisorId = await seed("supervisor", "Maintenance Supervisor");
    const otherId = await seed("other", "Clinician", [b]);
    const equipment = await ctx.db.insert("equipment", { assetId: "TEST-DEVICE-A", name: "Test Equipment", model: "Test", location: "Test room", departmentId: a, identityVerified: true });
    const otherEquipment = await ctx.db.insert("equipment", { assetId: "TEST-DEVICE-B", name: "Other Equipment", model: "Test", location: "Other room", departmentId: b, identityVerified: true });
    return { a, b, adminId, clinicianId, technicianId, supervisorId, otherId, equipment, otherEquipment };
  });
  return { ...base, t, admin: t.withIdentity(user("admin")), applicant: t.withIdentity(user("applicant")), clinician: t.withIdentity(user("clinician")), technician: t.withIdentity(user("technician")), supervisor: t.withIdentity(user("supervisor")), other: t.withIdentity(user("other")) };
}
async function application(f: Awaited<ReturnType<typeof setup>>, subject = "applicant", staffId = "test-new") {
  return f.t.withIdentity(user(subject)).mutation(api.staff.submit, { fullName: "Test Applicant", staffId, departmentId: f.a, requestedRole: "Clinician" });
}
async function verified(f: Awaited<ReturnType<typeof setup>>, subject = "applicant", staffId = "test-new") {
  const id = await application(f, subject, staffId);
  await f.admin.mutation(api.administration.verify, { id, expectedRevision: 1, outcome: "verified", verifiedStaffId: staffId, verifiedFullName: "Verified Test Applicant", evidenceReference: "TEST-REVIEW-ONLY" });
  return id;
}
const approval = (id: Awaited<ReturnType<typeof application>>, department: Awaited<ReturnType<typeof setup>>["a"]) => ({ id, expectedRevision: 2, approvedRole: "Clinician" as const, capabilities: [...roleCapabilities.Clinician], scope: [department], grantableRoles: [], reason: "TEST institutional approval" });
afterEach(() => vi.unstubAllEnvs());

describe("registration and trusted resolution", () => {
  test("unauthenticated and unverified email submissions are denied", async () => {
    const f = await setup();
    expect(await f.t.query(api.staff.resolve, {})).toEqual({ status: "unauthenticated" });
    const data = { fullName: "Test", staffId: "TEST-NEW", departmentId: f.a, requestedRole: "Clinician" as const };
    await expect(f.t.mutation(api.staff.submit, data)).rejects.toThrow(/Sign in/);
    await expect(f.t.withIdentity(user("unverified", false)).mutation(api.staff.submit, data)).rejects.toThrow(/verified Clerk email/);
  });
  test("valid application derives Clerk identity and stays pending", async () => {
    const f = await setup(); const id = await application(f);
    const result = await f.applicant.query(api.staff.resolve, {});
    expect(result.status).toBe("pending");
    expect("application" in result && result.application?.staffId).toBe("TEST-NEW");
    const row = await f.t.run((ctx) => ctx.db.get(id));
    expect(row?.clerkUserId).toBe("applicant");
    expect(await f.t.run((ctx) => ctx.db.query("staffAccounts").withIndex("by_identity", (q) => q.eq("identity", user("applicant").tokenIdentifier)).first())).toBeNull();
  });
  test("missing fields, unsupported role, invalid department and forged identity arguments fail", async () => {
    const f = await setup();
    const args = { fullName: "Test", staffId: "TEST-NEW", departmentId: f.a, requestedRole: "Clinician" as const };
    await expect(f.applicant.mutation(api.staff.submit, { ...args, fullName: " " })).rejects.toThrow();
    await expect(f.applicant.mutation(api.staff.submit, { ...args, staffId: "@bad" })).rejects.toThrow();
    await expect(f.applicant.mutation(api.staff.submit, { ...args, requestedRole: "Superuser" as Role })).rejects.toThrow();
    await f.t.run((ctx) => ctx.db.patch(f.b, { active: false }));
    await expect(f.applicant.mutation(api.staff.submit, { ...args, departmentId: f.b })).rejects.toThrow(/Department/);
    await expect(f.applicant.mutation(makeFunctionReference<"mutation">("staff:submit"), { ...args, clerkUserId: "admin" })).rejects.toThrow();
  });
  test("duplicate requests are idempotent; verified Staff IDs cannot be claimed", async () => {
    const f = await setup();
    const [first, second] = await Promise.all([application(f), application(f)]);
    expect(first).toBe(second);
    await expect(application(f, "different", "TEST-CLINICIAN")).rejects.toThrow(/cannot be used/);
    expect((await f.t.run((ctx) => ctx.db.query("registrationRequests").collect())).length).toBe(1);
  });
  test("requested Administrator role and unsafe Clerk metadata grant no permissions", async () => {
    const f = await setup();
    const hostile = f.t.withIdentity({ ...user("hostile"), role: "Administrator", unsafeMetadata: { role: "Administrator", approved: true } });
    await hostile.mutation(api.staff.submit, { fullName: "Hostile", staffId: "TEST-HOSTILE", departmentId: f.a, requestedRole: "Administrator" });
    expect((await hostile.query(api.staff.resolve, {})).status).toBe("pending");
    await expect(hostile.query(api.administration.applications, { status: "pending" })).rejects.toThrow(/approved staff/);
  });
  test("unknown identities and disabled authorization policy remain locked", async () => {
    const f = await setup(); expect((await f.applicant.query(api.staff.resolve, {})).status).toBe("no_application");
    await f.t.run(async (ctx) => { const p = await ctx.db.query("accessPolicy").first(); await ctx.db.patch(p!._id, { version: "unknown-policy" }); });
    expect((await f.clinician.query(api.staff.resolve, {})).status).toBe("unconfigured");
    await expect(f.clinician.query(api.operations.equipment)).rejects.toThrow(/policy/);
  });
});

describe("institutional verification and approval", () => {
  test("verification stays disabled without approved policy", async () => {
    const f = await setup(false); const id = await application(f);
    await expect(f.admin.mutation(api.administration.verify, { id, expectedRevision: 1, outcome: "verified", verifiedStaffId: "TEST-NEW", verifiedFullName: "Test", evidenceReference: "TEST" })).rejects.toThrow(/disabled/);
  });
  test("ordinary staff and cross-department reviewers cannot review", async () => {
    const f = await setup(); const id = await application(f);
    await expect(f.clinician.query(api.administration.application, { id })).rejects.toThrow();
    const otherRequest = await f.other.mutation(api.staff.submit, { fullName: "Other", staffId: "TEST-X", departmentId: f.b, requestedRole: "Clinician" }).catch(() => null);
    expect(otherRequest).toBeNull(); // An existing account cannot submit another application.
    const bId = await f.t.withIdentity(user("applicant-b")).mutation(api.staff.submit, { fullName: "Test B", staffId: "TEST-B-NEW", departmentId: f.b, requestedRole: "Clinician" });
    await expect(f.admin.query(api.administration.application, { id: bId })).rejects.toThrow(/scope/);
  });
  test("self-verification and self-approval are denied server-side", async () => {
    const f = await setup();
    const id = await f.t.run((ctx) => ctx.db.insert("registrationRequests", { identity: user("admin").tokenIdentifier, clerkUserId: "admin", email: user("admin").email, emailVerified: true, requestedStaffId: "TEST-ADMIN", fullName: "Test admin", departmentId: f.a, requestedRole: "Administrator", status: "pending", verificationStatus: "verified", submittedAt: Date.now(), revision: 1 }));
    await expect(f.admin.mutation(api.administration.verify, { id, expectedRevision: 1, outcome: "verified", verifiedStaffId: "TEST-ADMIN", verifiedFullName: "Test", evidenceReference: "TEST" })).rejects.toThrow(/Self-verification/);
    await expect(f.admin.mutation(api.administration.approve, { ...approval(id, f.a), expectedRevision: 1 })).rejects.toThrow(/Self-approval/);
  });
  test("unverified and failed identities cannot be approved", async () => {
    const f = await setup(); const id = await application(f);
    await expect(f.admin.mutation(api.administration.approve, { ...approval(id, f.a), expectedRevision: 1 })).rejects.toThrow(/verified/);
    await f.admin.mutation(api.administration.verify, { id, expectedRevision: 1, outcome: "failed", verifiedStaffId: "TEST-NEW", verifiedFullName: "Test", evidenceReference: "TEST-FAIL" });
    await expect(f.admin.mutation(api.administration.approve, approval(id, f.a))).rejects.toThrow(/verified/);
  });
  test("authorized approval creates trusted role and one audit trail under concurrent attempts", async () => {
    const f = await setup(); const id = await verified(f);
    const results = await Promise.allSettled([f.admin.mutation(api.administration.approve, approval(id, f.a)), f.admin.mutation(api.administration.approve, approval(id, f.a))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const resolved = await f.applicant.query(api.staff.resolve, {});
    expect(resolved.status).toBe("approved");
    expect("account" in resolved && resolved.account?.capabilities).toEqual(roleCapabilities.Clinician);
    expect((await f.t.run((ctx) => ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", "TEST-NEW")).collect()))).toHaveLength(1);
    expect((await f.admin.query(api.administration.auditHistory)).filter((a) => a.action === "application.approve")).toHaveLength(1);
  });
  test("concurrent approvals cannot duplicate verified Staff IDs", async () => {
    const f = await setup(); const a = await verified(f, "first", "TEST-SAME"); const b = await verified(f, "second", "TEST-SAME");
    const results = await Promise.allSettled([f.admin.mutation(api.administration.approve, approval(a, f.a)), f.admin.mutation(api.administration.approve, approval(b, f.a))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });
  test("capability and scope escalation are rejected even for an approval request", async () => {
    const f = await setup(); const id = await verified(f);
    await expect(f.admin.mutation(api.administration.approve, { ...approval(id, f.a), capabilities: ["roles"] })).rejects.toThrow(/capability/);
    await expect(f.admin.mutation(api.administration.approve, { ...approval(id, f.a), scope: [f.a, f.b] })).rejects.toThrow(/Scope/);
  });
  test("rejection locks access and requires explicit current revision for resubmission", async () => {
    const f = await setup(); const id = await application(f);
    await f.admin.mutation(api.administration.reject, { id, expectedRevision: 1, applicantReason: "Please confirm your staff details." });
    expect((await f.applicant.query(api.staff.resolve, {})).status).toBe("rejected");
    await expect(application(f)).rejects.toThrow(/Refresh/);
    await f.applicant.mutation(api.staff.submit, { fullName: "Corrected Test Applicant", staffId: "TEST-NEW", departmentId: f.a, requestedRole: "Clinician", previousRevision: 2 });
    expect((await f.applicant.query(api.staff.resolve, {})).status).toBe("pending");
  });
});

describe("revocation, role updates and record authorization", () => {
  test("role changes are audited and take effect with the same Clerk identity", async () => {
    const f = await setup();
    await f.admin.mutation(api.administration.changeRole, { id: f.clinicianId, expectedRevision: 1, role: "Biomedical Technician", capabilities: roleCapabilities["Biomedical Technician"], scope: [f.a], grantableRoles: [], reason: "TEST verified reassignment" });
    const result = await f.clinician.query(api.staff.resolve, {});
    expect("account" in result && result.account?.role).toBe("Biomedical Technician");
    expect((await f.admin.query(api.administration.auditHistory)).some((a) => a.action === "account.role")).toBe(true);
  });
  test("suspension, reinstatement and revocation block or restore queries immediately", async () => {
    const f = await setup(); await f.clinician.query(api.operations.equipment);
    await f.admin.mutation(api.administration.changeStatus, { id: f.clinicianId, expectedRevision: 1, status: "suspended", reason: "TEST suspension" });
    expect((await f.clinician.query(api.staff.resolve, {})).status).toBe("suspended");
    await expect(f.clinician.query(api.operations.equipment)).rejects.toThrow();
    await f.admin.mutation(api.administration.changeStatus, { id: f.clinicianId, expectedRevision: 2, status: "approved", reason: "TEST reinstatement" });
    expect((await f.clinician.query(api.operations.equipment)).length).toBe(1);
    await f.admin.mutation(api.administration.changeStatus, { id: f.clinicianId, expectedRevision: 3, status: "revoked", reason: "TEST revocation" });
    await expect(f.clinician.query(api.operations.equipment)).rejects.toThrow();
    await expect(f.admin.mutation(api.administration.changeStatus, { id: f.clinicianId, expectedRevision: 4, status: "approved", reason: "Try bypass" })).rejects.toThrow(/Revocation is final/);
  });
  test("self-authorization changes and stale administrative writes fail", async () => {
    const f = await setup();
    await expect(f.admin.mutation(api.administration.changeStatus, { id: f.adminId, expectedRevision: 1, status: "suspended", reason: "Self" })).rejects.toThrow(/own access/);
    await expect(f.admin.mutation(api.administration.changeRole, { id: f.adminId, expectedRevision: 1, role: "Clinician", capabilities: roleCapabilities.Clinician, scope: [f.a], grantableRoles: [], reason: "Self" })).rejects.toThrow(/own authorization/);
    await expect(f.admin.mutation(api.administration.changeStatus, { id: f.clinicianId, expectedRevision: 99, status: "suspended", reason: "Stale" })).rejects.toThrow(/changed/);
  });
  test("department scopes are enforced on direct queries and mutations", async () => {
    const f = await setup();
    expect((await f.clinician.query(api.operations.equipment)).map((e) => e.assetId)).toEqual(["TEST-DEVICE-A"]);
    await expect(f.clinician.query(api.operations.availability, { equipmentId: f.otherEquipment })).rejects.toThrow(/scope/);
    await expect(f.clinician.mutation(api.operations.submitReport, { equipmentId: f.otherEquipment, operationId: "cross-scope", category: "Electrical/Power", symptoms: "Test", description: "", priority: "High", condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 })).rejects.toThrow(/scope/);
    await expect(f.clinician.query(api.operations.exportReports, {})).rejects.toThrow();
    await expect(f.clinician.query(api.administration.auditHistory)).rejects.toThrow();
    await expect(f.t.query(api.operations.equipment)).rejects.toThrow(/Sign in/);
  });
  test("disabled departments and malformed capability grants fail closed", async () => {
    const f = await setup();
    await f.t.run((ctx) => ctx.db.patch(f.clinicianId, { capabilities: ["roles"] }));
    expect((await f.clinician.query(api.staff.resolve, {})).status).toBe("authorization_error");
    await expect(f.clinician.query(api.operations.equipment)).rejects.toThrow(/invalid/);
    await f.t.run((ctx) => ctx.db.patch(f.a, { active: false }));
    expect((await f.technician.query(api.staff.resolve, {})).status).toBe("authorization_error");
  });
  test("server report idempotency, technician ownership and safety release blockers", async () => {
    const f = await setup();
    const args = { equipmentId: f.equipment, operationId: "TEST-OP", category: "Electrical/Power", symptoms: "Test symptoms", description: "", priority: "High" as const, condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 };
    const report = await f.clinician.mutation(api.operations.submitReport, args);
    expect(await f.clinician.mutation(api.operations.submitReport, args)).toBe(report);
    const task = await f.supervisor.mutation(api.operations.createTask, { reportId: report, dueAt: Date.now() + 60000 });
    await expect(f.clinician.mutation(api.operations.assign, { id: task, expectedRevision: 1, assigneeId: f.technicianId, dueAt: Date.now() + 60000, reason: "Try bypass" })).rejects.toThrow();
    await f.supervisor.mutation(api.operations.assign, { id: task, expectedRevision: 1, assigneeId: f.technicianId, dueAt: Date.now() + 60000, reason: "TEST assignment" });
    await f.technician.mutation(api.operations.recordWork, { id: task, expectedRevision: 2, diagnosis: "Test diagnosis", notes: "Test work", parts: [], complete: true });
    expect((await f.clinician.query(api.operations.availability, { equipmentId: f.equipment })).available).toBe(false);
    await expect(f.technician.mutation(api.operations.submitVerification, { id: task, kind: "technical" })).rejects.toThrow(/Independent/);
    await expect(f.clinician.mutation(api.operations.submitVerification, { id: task, kind: "clinical" })).rejects.toThrow(/not approved/);
  });
});

describe("operator-only bootstrap", () => {
  test("public registration cannot set the system administrator tag", async () => {
    const f = await setup();
    const submit = makeFunctionReference<"mutation">("staff:submit");
    await expect(f.applicant.mutation(submit, { fullName: "Test Applicant", staffId: "TEST-ESCALATE", departmentId: f.a,
      requestedRole: "Clinician", systemRole: "SYSTEM_ADMINISTRATOR" })).rejects.toThrow();
    expect(await f.t.run((ctx) => ctx.db.query("staffAccounts").withIndex("by_clerk_user", (q) => q.eq("clerkUserId", "applicant")).unique())).toBeNull();
  });
  test("no public bootstrap endpoint is exported", () => {
    expect(operator.bootstrapAdministrator).toHaveProperty("isInternal", true);
    expect(operator.configurePolicy).toHaveProperty("isInternal", true);
  });
  test("bootstrap requires approved policy, intended verified identity and retries only the original grant", async () => {
    const t = createTest();
    const dept = await t.run((ctx) => ctx.db.insert("departments", { code: "TEST", name: "Test", active: true }));
    const intended = { ...user("intended-admin"), email: "moses.segbenya@ucc.edu.gh" };
    const request = await t.withIdentity(intended).mutation(api.staff.submit, { fullName: "Test admin", staffId: "TEST-BOOT", departmentId: dept, requestedRole: "Administrator" });
    const ref = internal.operator.bootstrapAdministrator;
    const args = { applicationId: request, clerkUserId: "intended-admin", institutionalAuthorizationReference: "TEST-OPERATOR-AUTH", verifiedStaffId: "TEST-BOOT", verifiedFullName: "Verified Test admin", scope: [dept] };
    await expect(t.mutation(ref, args)).rejects.toThrow(/policy/);
    await t.run((ctx) => ctx.db.insert("accessPolicy", { key: "staff-access", version: POLICY_VERSION, institutionalPolicyReference: "TEST", manualVerificationEnabled: false, configuredAt: Date.now() }));
    await expect(t.mutation(ref, args)).rejects.toThrow(/policy/);
    await t.run(async (ctx) => { const p = await ctx.db.query("accessPolicy").first(); await ctx.db.patch(p!._id, { manualVerificationEnabled: true }); });
    await expect(t.mutation(ref, args)).rejects.toThrow(/authorization is not configured/);
    vi.stubEnv("SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT", "wrong-subject"); vi.stubEnv("SMARTMAINT_BOOTSTRAP_AUTHORIZATION_REFERENCE", "TEST-OPERATOR-AUTH");
    await expect(t.mutation(ref, args)).rejects.toThrow(/allowlisted/);
    vi.stubEnv("SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT", "intended-admin");
    await expect(t.mutation(ref, { ...args, clerkUserId: "another-user" })).rejects.toThrow(/allowlisted/);
    const wrongEmail = await t.withIdentity(user("other-subject")).mutation(api.staff.submit, { fullName: "Test", staffId: "TEST-OTHER", departmentId: dept, requestedRole: "Administrator" });
    vi.stubEnv("SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT", "other-subject");
    await expect(t.mutation(ref, { ...args, applicationId: wrongEmail, clerkUserId: "other-subject" })).rejects.toThrow(/allowlisted/);
    vi.stubEnv("SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT", "intended-admin");
    const id = await t.mutation(ref, args);
    expect((await t.withIdentity(intended).query(api.staff.resolve, {})).status).toBe("approved");
    expect((await t.run((ctx) => ctx.db.get(id)))?.systemRole).toBe("SYSTEM_ADMINISTRATOR");
    expect(await t.mutation(ref, args)).toBe(id);
    await expect(t.mutation(ref, { ...args, verifiedStaffId: "TEST-DIFFERENT" })).rejects.toThrow(/already closed/);
    await expect(t.mutation(ref, { ...args, applicationId: wrongEmail, clerkUserId: "other-subject" })).rejects.toThrow(/allowlisted/);
    await t.run((ctx) => ctx.db.patch(id, { status: "suspended" }));
    expect(await t.mutation(ref, args)).toBe(id);
    expect((await t.withIdentity(intended).query(api.staff.resolve, {})).status).toBe("suspended");
    expect(await t.run((ctx) => ctx.db.query("staffAccounts").collect())).toHaveLength(1);
    expect((await t.run((ctx) => ctx.db.query("authorizationAudit").collect())).filter((e) => e.action === "operator.bootstrap")).toHaveLength(1);
  });
});

test("all protected public functions reject direct unauthenticated calls before record access", async () => {
  const f = await setup(); const request = await application(f);
  const report = await f.clinician.mutation(api.operations.submitReport, { equipmentId: f.equipment, operationId: "TEST-ALL", category: "Electrical/Power", symptoms: "Test", description: "", priority: "Routine", condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 });
  const task = await f.supervisor.mutation(api.operations.createTask, { reportId: report, dueAt: Date.now() + 60000 });
  const hold = await f.supervisor.mutation(api.operations.placeHold, { equipmentId: f.equipment, reason: "TEST hold" });
  const cases: ["query" | "mutation", string, Record<string, Value>][] = [
    ["query", "administration:applications", { status: "pending" }], ["query", "administration:application", { id: request }],
    ["query", "administration:accounts", {}], ["query", "administration:auditHistory", {}],
    ["query", "administration:applicationPage", { departmentId: f.a, status: "pending", paginationOpts: { cursor: null, numItems: 20 } }],
    ["query", "administration:accountPage", { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } }],
    ["query", "administration:account", { id: f.clinicianId }],
    ["query", "administration:auditPage", { departmentId: f.a, paginationOpts: { cursor: null, numItems: 20 } }],
    ["mutation", "administration:verify", { id: request, expectedRevision: 1, outcome: "verified", verifiedStaffId: "TEST-NEW", verifiedFullName: "Test", evidenceReference: "TEST" }],
    ["mutation", "administration:approve", approval(request, f.a)], ["mutation", "administration:reject", { id: request, expectedRevision: 1, applicantReason: "Test" }],
    ["mutation", "administration:changeRole", { id: f.clinicianId, expectedRevision: 1, role: "Clinician", capabilities: ["report"], scope: [f.a], grantableRoles: [], reason: "Test" }],
    ["mutation", "administration:changeStatus", { id: f.clinicianId, expectedRevision: 1, status: "suspended", reason: "Test" }],
    ...["equipment", "reports", "tasks", "analytics", "exportReports"].map((name) => ["query", `operations:${name}`, {}] as ["query", string, Record<string, Value>]),
    ["query", "operations:technicians", { departmentId: f.a }], ["query", "operations:holds", { equipmentId: f.equipment }], ["query", "operations:availability", { equipmentId: f.equipment }],
    ["mutation", "operations:submitReport", { equipmentId: f.equipment, operationId: "TEST-NOAUTH", category: "Electrical/Power", symptoms: "Test", description: "", priority: "Routine", condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 }],
    ["mutation", "operations:triage", { id: report, priority: "High", reason: "Test" }], ["mutation", "operations:createTask", { reportId: report, dueAt: Date.now() + 60000 }],
    ["mutation", "operations:assign", { id: task, expectedRevision: 1, assigneeId: f.technicianId, dueAt: Date.now() + 60000, reason: "Test" }],
    ["mutation", "operations:changeDue", { id: task, expectedRevision: 1, dueAt: Date.now() + 60000, reason: "Test" }], ["mutation", "operations:cancelTask", { id: task, expectedRevision: 1, reason: "Test" }],
    ["mutation", "operations:recordWork", { id: task, expectedRevision: 1, diagnosis: "Test", notes: "Test", parts: [], complete: true }],
    ["mutation", "operations:submitVerification", { id: task, kind: "technical" }], ["mutation", "operations:placeHold", { equipmentId: f.equipment, reason: "Test" }],
    ["mutation", "operations:clearHold", { id: hold }], ["mutation", "operations:reconcile", { equipmentId: f.equipment }],
  ];
  for (const [kind, name, args] of cases) {
    if (kind === "query") await expect(f.t.query(makeFunctionReference<"query">(name), args), name).rejects.toThrow(/Sign in/);
    else await expect(f.t.mutation(makeFunctionReference<"mutation">(name), args), name).rejects.toThrow(/Sign in/);
  }
});
test("registration approvers can only grant explicitly delegated roles and cannot administer authorization", async () => {
  const f = await setup();
  await f.admin.mutation(api.administration.changeRole, { id: f.clinicianId, expectedRevision: 1, role: "Registration Approver", capabilities: ["accounts"], scope: [f.a], grantableRoles: ["Clinician"], reason: "TEST limited delegation" });
  const id = await application(f);
  await f.clinician.mutation(api.administration.verify, { id, expectedRevision: 1, outcome: "verified", verifiedStaffId: "TEST-NEW", verifiedFullName: "Verified test", evidenceReference: "TEST-REFERENCE" });
  await expect(f.clinician.mutation(api.administration.approve, { ...approval(id, f.a), approvedRole: "Administrator", capabilities: roleCapabilities.Administrator, grantableRoles: [...roles] })).rejects.toThrow(/grant this role/);
  await f.clinician.mutation(api.administration.approve, approval(id, f.a));
  await expect(f.clinician.mutation(api.administration.changeStatus, { id: f.technicianId, expectedRevision: 1, status: "suspended", reason: "Try bypass" })).rejects.toThrow();
  await expect(f.clinician.query(api.administration.auditHistory)).rejects.toThrow();
});
test("last-administrator invariant and complete administrator capability grants are enforced", async () => {
  const f = await setup();
  await expect(f.t.run(async (ctx) => protectLastAdministrator(ctx, (await ctx.db.get(f.adminId))!))).rejects.toThrow(/last active administrator/);
  const request = await verified(f);
  await expect(f.admin.mutation(api.administration.approve, { ...approval(request, f.a), approvedRole: "Administrator", capabilities: ["accounts"], grantableRoles: [...roles] })).rejects.toThrow(/complete|retain/);
});
test("policy replacement invalidates old pending verification and conflicting decisions stay consistent", async () => {
  const f = await setup(); const id = await verified(f);
  await f.t.run(async (ctx) => { const p = await ctx.db.query("accessPolicy").first(); await ctx.db.patch(p!._id, { institutionalPolicyReference: "TEST-NEW-POLICY" }); });
  await expect(f.admin.mutation(api.administration.approve, approval(id, f.a))).rejects.toThrow(/repeated under the current/);
  await f.admin.mutation(api.administration.verify, { id, expectedRevision: 2, outcome: "verified", verifiedStaffId: "TEST-NEW", verifiedFullName: "Test", evidenceReference: "TEST-NEW-EVIDENCE" });
  const results = await Promise.allSettled([f.admin.mutation(api.administration.approve, { ...approval(id, f.a), expectedRevision: 3 }), f.admin.mutation(api.administration.reject, { id, expectedRevision: 3, applicantReason: "Test decision" })]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const row = await f.t.run((ctx) => ctx.db.get(id));
  const account = await f.t.run((ctx) => ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", "TEST-NEW")).first());
  expect(!!account).toBe(row?.status === "approved");
});
test("pending and rejected applicants cannot mutate records; approval audit omits identity tokens", async () => {
  const f = await setup(); const id = await application(f);
  await expect(f.applicant.query(api.operations.equipment)).rejects.toThrow(/approved staff/);
  await f.admin.mutation(api.administration.reject, { id, expectedRevision: 1, applicantReason: "Test rejection" });
  await expect(f.applicant.query(api.operations.equipment)).rejects.toThrow(/approved staff/);
  const audit = await f.admin.query(api.administration.auditHistory);
  expect(JSON.stringify(audit)).not.toContain("test.clerk.invalid");
  expect(JSON.stringify(audit)).not.toContain("emailVerified");
});
test("department pagination reaches every application and protects all pages and individual accounts", async () => {
  const f = await setup();
  await f.t.run(async (ctx) => {
    for (let n = 0; n < 85; n++) await ctx.db.insert("registrationRequests", { identity: user(`page-${n}`).tokenIdentifier, clerkUserId: `page-${n}`, email: user(`page-${n}`).email, emailVerified: true, requestedStaffId: `TEST-PAGE-${n}`, fullName: `Test applicant ${n}`, departmentId: f.a, requestedRole: "Clinician", status: "pending", verificationStatus: "unverified", submittedAt: n + 1, revision: 1 });
  });
  let cursor: string | null = null; let done = false; const ids: string[] = [];
  while (!done) {
    const result: FunctionReturnType<typeof api.administration.applicationPage> = await f.admin.query(api.administration.applicationPage, { status: "pending", departmentId: f.a, paginationOpts: { cursor, numItems: 20 } });
    ids.push(...result.page.map((r) => r.id)); cursor = result.continueCursor; done = result.isDone;
  }
  expect(ids).toHaveLength(85); expect(new Set(ids).size).toBe(85);
  await expect(f.admin.query(api.administration.applicationPage, { status: "pending", departmentId: f.b, paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow(/scope/);
  await expect(f.admin.query(api.administration.accountPage, { departmentId: f.b, paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow(/scope/);
  await expect(f.admin.query(api.administration.auditPage, { departmentId: f.b, paginationOpts: { cursor: null, numItems: 20 } })).rejects.toThrow(/scope/);
  await expect(f.admin.query(api.administration.account, { id: f.otherId })).rejects.toThrow(/Scope/);
  await expect(f.admin.query(api.administration.applicationPage, { status: "pending", departmentId: f.a, paginationOpts: { cursor: null, numItems: 1000 } })).rejects.toThrow(/page size/);
});
test("a primary role cannot expand record visibility beyond its current granted capabilities", async () => {
  const f = await setup();
  const args = { equipmentId: f.equipment, operationId: "TEST-OWNERSHIP", category: "Electrical/Power", symptoms: "Test", description: "", priority: "Routine" as const, condition: "Unknown", inUse: false, noticedAt: Date.now() - 1 };
  const report = await f.clinician.mutation(api.operations.submitReport, args);
  await f.admin.mutation(api.administration.changeRole, { id: f.technicianId, expectedRevision: 1, role: "Biomedical Technician", capabilities: ["report", "repair"], scope: [f.a], grantableRoles: [], reason: "TEST limited technician" });
  expect(await f.technician.query(api.operations.reports)).toEqual([]);
  const task = await f.supervisor.mutation(api.operations.createTask, { reportId: report, dueAt: Date.now() + 60000 });
  await f.t.run((ctx) => ctx.db.patch(task, { state: "Completed", assigneeId: f.clinicianId }));
  expect(await f.technician.query(api.operations.tasks)).toEqual([]);
});
