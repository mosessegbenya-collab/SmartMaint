import { test, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { staffApi as api } from "../../src/services/staff-api";
import { POLICY_VERSION, roleCapabilities } from "../../src/domain/role-policy";
import type { Role } from "../../src/domain/models";

const modules = { "./safety.ts": () => import("../../convex/safety"), "./operations.ts": () => import("../../convex/operations"), "./workflows.ts": () => import("../../convex/workflows"), "./_generated/loader-marker.js": async () => ({}) };
async function setup() {
  const t = convexTest(schema, modules);
  const identity = (subject: string) => ({ subject, tokenIdentifier: `https://test.invalid|${subject}`, email: `${subject}@example.invalid`, emailVerified: true });
  const records = await t.run(async (ctx) => {
    const departmentId = await ctx.db.insert("departments", { code: "TEST", name: "TEST ONLY", active: true });
    await ctx.db.insert("accessPolicy", { key: "staff-access", version: POLICY_VERSION, institutionalPolicyReference: "TEST ONLY", manualVerificationEnabled: false, configuredAt: 1 });
    const seed = (name: string, role: Role) => ctx.db.insert("staffAccounts", { identity: identity(name).tokenIdentifier, clerkUserId: name, email: identity(name).email, verifiedStaffId: name, fullName: name, departmentId, role, capabilities: roleCapabilities[role], scope: [departmentId], grantableRoles: [], status: "approved", approvedAt: 1, createdAt: 1, updatedAt: 1, revision: 1 });
    const a = await seed("A", "Biomedical Technician"), b = await seed("B", "Biomedical Technician"), c = await seed("C", "Biomedical Technician"), supervisor = await seed("S", "Maintenance Supervisor");
    const equipmentId = await ctx.db.insert("equipment", { assetId: "TEST", name: "TEST", model: "TEST", location: "TEST", departmentId, identityVerified: true });
    const policyId = await ctx.db.insert("safetyPolicies", { departmentId, active: true, version: "smartmaint-safety-v1", approvalReference: "TEST ONLY, NOT INSTITUTIONAL APPROVAL", technicalChecks: ["TEST check"], clinicalChecks: [], clinicalRequired: false, releaseRoles: ["Maintenance Supervisor"], configuredAt: 1 });
    return { departmentId, equipmentId, policyId, a, b, c, supervisor };
  });
  const user = (name: string) => t.withIdentity(identity(name));
  let operation = 0;
  const task = (updatedAt = 1) => t.run((ctx) => ctx.db.insert("maintenanceTasks", { equipmentId: records.equipmentId, departmentId: records.departmentId, assigneeId: records.a, state: "Completed", dueAt: Date.now() + 100000, diagnosis: "TEST work", notes: "", parts: [], cycle: 1, revision: 3, createdAt: 1, updatedAt }));
  const verify = (taskId: Awaited<ReturnType<typeof task>>, outcome: "pass" | "fail" = "pass", who = "C", revision = 3) => user(who).mutation(api.safety.verify, { taskId, expectedRevision: revision, kind: "technical", outcome, checks: [{ label: "TEST check", passed: outcome === "pass" }], notes: "TEST ONLY", evidenceReference: "TEST ONLY", operationId: `TEST-${++operation}`, reworkDueAt: outcome === "fail" ? Date.now() + 100000 : undefined });
  const status = () => user("S").query(api.safety.releaseStatus, { equipmentId: records.equipmentId });
  // Conditional spread lets the original implementation run: stale confirmation must fail
  // because evidence changed, rather than because an unknown argument was supplied.
  const confirmation = async () => {
    const reviewed = await status();
    return { equipmentId: records.equipmentId, expectedTaskRevision: reviewed.expectedTaskRevision!, reason: "TEST review", ...("evidenceSnapshot" in reviewed ? { expectedEvidence: reviewed.evidenceSnapshot as string } : {}) };
  };
  return { t, ...records, user, task, verify, status, confirmation };
}

test("review 1: every completed repair requires verification, not only the newest", async () => {
  const f = await setup(); await f.task(1); const newest = await f.task(2); await f.verify(newest);
  expect((await f.status()).eligible).toBe(false);
  await expect(f.user("S").mutation(api.safety.release, await f.confirmation())).rejects.toThrow(/verification|repair/i);
});

test("review 1: cancelled rework and an unrelated pass cannot erase a failed repair chain", async () => {
  const f = await setup(); const failed = await f.task(1); await f.verify(failed, "fail");
  const child = (await f.t.run((ctx) => ctx.db.query("maintenanceTasks").withIndex("by_parent", (q) => q.eq("parentTaskId", failed)).collect()))[0];
  await f.user("S").mutation(api.operations.cancelTask, { id: child._id, expectedRevision: child.revision, reason: "TEST cancellation" });
  const unrelated = await f.task(Date.now() + 1); await f.verify(unrelated);
  expect((await f.status()).eligible).toBe(false);
});

test("review 1: a failed chain clears only after its linked rework and every unrelated repair pass", async () => {
  const f = await setup(); const failed = await f.task(1); await f.verify(failed, "fail");
  const child = (await f.t.run((ctx) => ctx.db.query("maintenanceTasks").withIndex("by_parent", (q) => q.eq("parentTaskId", failed)).collect()))[0];
  await f.user("S").mutation(api.operations.assign, { id: child._id, expectedRevision: 1, assigneeId: f.b, dueAt: Date.now() + 100000, reason: "TEST rework" });
  await f.user("B").mutation(api.operations.recordWork, { id: child._id, expectedRevision: 2, diagnosis: "TEST rework", notes: "", parts: [], complete: true });
  const unrelated = await f.task(Date.now() + 1); await f.verify(unrelated);
  expect((await f.status()).eligible).toBe(false);
  await f.verify(child._id);
  expect((await f.status()).eligible).toBe(true);
  await f.user("S").mutation(api.safety.release, await f.confirmation());
  expect((await f.status()).available).toBe(true);
});

test("review 2: previous contributor A cannot verify after B completes; independent C can", async () => {
  const f = await setup(); const task = await f.task();
  await f.t.run((ctx) => ctx.db.patch(task, { state: "Assigned", revision: 1 }));
  const work = { id: task, diagnosis: "TEST", notes: "TEST", parts: [], complete: false };
  await f.user("A").mutation(api.operations.recordWork, { ...work, expectedRevision: 1 });
  await f.user("S").mutation(api.operations.assign, { id: task, expectedRevision: 2, assigneeId: f.b, dueAt: Date.now() + 100000, reason: "TEST reassignment" });
  await f.user("B").mutation(api.operations.recordWork, { ...work, expectedRevision: 3, complete: true });
  await expect(f.verify(task, "pass", "A", 4)).rejects.toThrow(/independent/);
  const page = await f.user("S").query(api.safety.verifierPage, { taskId: task, kind: "technical", paginationOpts: { cursor: null, numItems: 20 } });
  expect(page.page.map((p) => p.id)).toEqual([f.c]);
  await expect(f.user("S").mutation(api.safety.requestVerification, { taskId: task, expectedRevision: 4, kind: "technical", recipientId: f.a })).rejects.toThrow(/independent/);
  expect((await f.user("A").query(api.workflows.taskPage, { departmentId: f.departmentId, verification: "technical", paginationOpts: { cursor: null, numItems: 20 } })).page).toEqual([]);
  await expect(f.verify(task, "pass", "C", 4)).resolves.toBeTypeOf("string");
  expect((await f.status()).eligible).toBe(true);
});

test.each(["policy", "hold", "attempt", "task"])("review 3: stale confirmation rejects changed %s evidence at unchanged selected revision", async (change) => {
  const f = await setup(); const task = await f.task(); await f.verify(task);
  const reviewed = await f.confirmation();
  if (change === "policy") {
    await f.t.run(async (ctx) => {
      const policy = (await ctx.db.get(f.policyId))!;
      await ctx.db.patch(policy._id, { active: false });
      const { _id, _creationTime, ...fields } = policy; void _id; void _creationTime;
      await ctx.db.insert("safetyPolicies", { ...fields, technicalChecks: ["Replacement TEST check"], configuredAt: 2 });
    });
    await f.user("C").mutation(api.safety.verify, { taskId: task, expectedRevision: 3, kind: "technical", outcome: "pass", checks: [{ label: "Replacement TEST check", passed: true }], notes: "", evidenceReference: "TEST replacement", operationId: "replacement" });
  } else if (change === "hold") {
    const hold = await f.user("S").mutation(api.operations.placeHold, { equipmentId: f.equipmentId, reason: "TEST hold" });
    await f.user("S").mutation(api.safety.resolveHold, { id: hold, reason: "TEST resolution" });
  } else if (change === "attempt") await f.verify(task);
  else { const other = await f.task(2); await f.verify(other); }
  expect((await f.status()).eligible).toBe(true);
  await expect(f.user("S").mutation(api.safety.release, reviewed)).rejects.toThrow(/changed|review/i);
  const fresh = await f.confirmation();
  const id = await f.user("S").mutation(api.safety.release, fresh);
  expect(await f.user("S").mutation(api.safety.release, fresh)).toBe(id);
  expect((await f.status()).available).toBe(true);
});
