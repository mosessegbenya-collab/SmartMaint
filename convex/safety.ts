import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { GenericId } from "convex/values";
import { query, mutation, internalMutation } from "./lib/server";
import type { QueryCtx } from "./lib/server";
import { activeDepartment, audit, deny, requireAccount, requiredText, roleCapabilities } from "./lib/access";
import { role } from "./lib/validators";
import { equipmentNotice, reportNotice, taskNotice } from "./lib/notifications";

async function requestContext(ctx: QueryCtx, taskId: GenericId<"maintenanceTasks">) {
  const actor = await requireAccount(ctx); const task = await ctx.db.get(taskId);
  if (!task || !actor.scope.includes(task.departmentId) || !(actor.capabilities.includes("assign") || (actor.capabilities.includes("repair") && task.assigneeId === actor._id))) deny("Only the assigned repairer or an authorized supervisor can request verification.");
  const { policy } = await equipmentContext(ctx, task.equipmentId);
  const superseded = !!await ctx.db.query("maintenanceTasks").withIndex("by_parent", (q) => q.eq("parentTaskId", task._id)).first();
  return { actor, task, policy, superseded };
}
export const verificationRequestContext = query({ args: { taskId: v.id("maintenanceTasks") }, handler: async (ctx, { taskId }) => {
  const { task, policy, superseded } = await requestContext(ctx, taskId);
  return { approved: !!policy, revision: task.revision, completed: task.state === "Completed", superseded, clinicalRequired: policy?.clinicalRequired ?? false };
} });
export const verifierPage = query({ args: { taskId: v.id("maintenanceTasks"), kind: v.union(v.literal("technical"), v.literal("clinical")), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const { task, policy, superseded } = await requestContext(ctx, args.taskId);
  if (!policy || task.state !== "Completed" || superseded) deny("Approved policy and the current completed repair cycle are required.");
  if (!Number.isInteger(args.paginationOpts.numItems) || args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) deny("Invalid page size.");
  const page = await ctx.db.query("staffAccounts").withIndex("by_role_status", (q) => q.eq("role", args.kind === "technical" ? "Biomedical Technician" : "Clinician").eq("status", "approved")).paginate(args.paginationOpts);
  // Filter each bounded page before disclosure, including staff whose primary department differs.
  return { ...page, page: page.page.filter((candidate) => candidate._id !== task.assigneeId && candidate.scope.includes(task.departmentId) && candidate.capabilities.includes(args.kind)).map((candidate) => ({ id: candidate._id, name: candidate.fullName, staffId: candidate.verifiedStaffId })) };
} });
export const requestVerification = mutation({ args: { taskId: v.id("maintenanceTasks"), expectedRevision: v.number(), kind: v.union(v.literal("technical"), v.literal("clinical")), recipientId: v.id("staffAccounts") }, handler: async (ctx, args) => {
  const { actor, task, policy, superseded } = await requestContext(ctx, args.taskId);
  if (!policy || task.state !== "Completed" || superseded || task.revision !== args.expectedRevision || !(args.kind === "technical" ? policy.technicalChecks : policy.clinicalChecks).length) deny("Approved policy and current completed repair are required.");
  const recipient = await ctx.db.get(args.recipientId);
  if (!recipient || recipient.status !== "approved" || recipient._id === task.assigneeId || !recipient.scope.includes(task.departmentId) || !recipient.capabilities.includes(args.kind)) deny("Choose an independent authorized verifier in scope.");
  if (args.kind === "clinical") {
    const technical = await ctx.db.query("safetyAttempts").withIndex("by_task", (q) => q.eq("taskId", task._id)).filter((q) => q.and(q.eq(q.field("kind"), "technical"), q.eq(q.field("policyId"), policy._id), q.eq(q.field("taskRevision"), task.revision))).order("desc").first();
    if (!technical || technical.outcome !== "pass" || technical.actorId === recipient._id) deny("A technical pass and a distinct clinical verifier are required before requesting clinical checks.");
  }
  const requestKey = `${task._id}:${task.revision}:${args.kind}`;
  const previous = await ctx.db.query("notifications").withIndex("by_recipient_request", (q) => q.eq("recipientId", recipient._id).eq("requestKey", requestKey)).unique();
  if (previous) return previous._id;
  const id = await ctx.db.insert("notifications", { recipientId: recipient._id, departmentId: task.departmentId, requestKey, title: `${args.kind === "technical" ? "Technical" : "Clinical"} verification requested`, body: "A completed repair is ready for your independent review. This request does not record a verification or release decision.", targetKind: "task", targetId: task._id, createdAt: Date.now(), dispatchState: "in_app" });
  await audit(ctx, actor, "verification.request", id, "Independent verifier requested through the in-app inbox; external dispatch not configured", task.departmentId, task._id, recipient._id);
  return id;
} });

async function equipmentContext(ctx: QueryCtx, id: GenericId<"equipment">) {
  const actor = await requireAccount(ctx); const item = await ctx.db.get(id);
  if (!item || !actor.scope.includes(item.departmentId) || !actor.capabilities.some((c) => ["report", "repair", "assign", "clinical", "technical", "analytics", "export", "hold", "reconcile"].includes(c))) deny();
  const policy = await ctx.db.query("safetyPolicies").withIndex("by_department_active", (q) => q.eq("departmentId", item.departmentId).eq("active", true)).unique();
  return { actor, item, policy };
}
export const configurePolicy = internalMutation({ args: { departmentId: v.id("departments"), version: v.literal("smartmaint-safety-v1"), approvedReference: v.string(), enabled: v.boolean(), technicalChecks: v.array(v.string()), clinicalChecks: v.array(v.string()), clinicalRequired: v.boolean(), releaseRoles: v.array(role) }, handler: async (ctx, args) => {
  await activeDepartment(ctx, args.departmentId);
  const reference = requiredText(args.approvedReference, "institutional safety approval reference", 200);
  for (const checks of [args.technicalChecks, args.clinicalChecks]) if (checks.length > 30 || new Set(checks).size !== checks.length || checks.some((label) => !label.trim() || label.length > 160)) deny("Supply unique approved checklist labels.");
  if (!args.technicalChecks.length || (args.clinicalRequired && !args.clinicalChecks.length) || !args.releaseRoles.length || new Set(args.releaseRoles).size !== args.releaseRoles.length || args.releaseRoles.some((r) => !roleCapabilities[r].includes("hold"))) deny("Approved checks and explicit release roles with hold authority are required.");
  const prior = await ctx.db.query("safetyPolicies").withIndex("by_department_active", (q) => q.eq("departmentId", args.departmentId).eq("active", true)).unique();
  if (prior) await ctx.db.patch(prior._id, { active: false });
  const id = await ctx.db.insert("safetyPolicies", { departmentId: args.departmentId, active: args.enabled, version: args.version, approvalReference: reference, technicalChecks: args.technicalChecks, clinicalChecks: args.clinicalChecks, clinicalRequired: args.clinicalRequired, releaseRoles: args.releaseRoles, configuredAt: Date.now() });
  await audit(ctx, null, "operator.safety-policy", id, reference, args.departmentId, prior?._id, args.enabled ? "enabled" : "disabled"); return id;
} });
export const verificationContext = query({ args: { taskId: v.id("maintenanceTasks"), kind: v.union(v.literal("technical"), v.literal("clinical")) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, args.kind); const task = await ctx.db.get(args.taskId); if (!task || !actor.scope.includes(task.departmentId)) deny();
  if (task.state !== "Completed" && task.assigneeId !== actor._id && !actor.capabilities.includes("assign")) deny("Only completed work is available for independent verification.");
  const { policy } = await equipmentContext(ctx, task.equipmentId);
  return { task, policy: policy ? { id: policy._id, approvalReference: policy.approvalReference, checks: args.kind === "technical" ? policy.technicalChecks : policy.clinicalChecks, clinicalRequired: policy.clinicalRequired } : null,
    attempts: await ctx.db.query("safetyAttempts").withIndex("by_task", (q) => q.eq("taskId", task._id)).order("desc").take(100) };
} });
export const verify = mutation({ args: { taskId: v.id("maintenanceTasks"), expectedRevision: v.number(), kind: v.union(v.literal("technical"), v.literal("clinical")), outcome: v.union(v.literal("pass"), v.literal("fail"), v.literal("unable")), checks: v.array(v.object({ label: v.string(), passed: v.boolean() })), notes: v.string(), evidenceReference: v.string(), operationId: v.string(), reworkDueAt: v.optional(v.number()) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, args.kind); const task = await ctx.db.get(args.taskId);
  if (!task || !actor.scope.includes(task.departmentId)) deny();
  const { policy } = await equipmentContext(ctx, task.equipmentId); if (!policy) deny("Approved institutional safety policy is not configured.");
  const operationId = requiredText(args.operationId, "verification operation", 100);
  const prior = await ctx.db.query("safetyAttempts").withIndex("by_actor_operation", (q) => q.eq("actorId", actor._id).eq("operationId", operationId)).unique();
  if (prior) { if (prior.taskId !== task._id || prior.kind !== args.kind || prior.outcome !== args.outcome) deny("This verification operation cannot be reused."); return prior._id; }
  if (task.state !== "Completed" || task.revision !== args.expectedRevision || task.assigneeId === actor._id) deny("A current completed repair and an independent verifier are required.");
  const linkedRework = await ctx.db.query("maintenanceTasks").withIndex("by_parent", (q) => q.eq("parentTaskId", task._id)).first();
  if (linkedRework) deny("Verify the completed linked rework; the original failed repair cycle cannot be reopened.");
  const labels = args.kind === "technical" ? policy.technicalChecks : policy.clinicalChecks;
  if (!labels.length || args.checks.length !== labels.length || args.checks.some((check, i) => check.label !== labels[i]) || (args.outcome === "pass" && args.checks.some((check) => !check.passed))) deny("Complete every current approved checklist item before passing verification.");
  const attempts = await ctx.db.query("safetyAttempts").withIndex("by_task", (q) => q.eq("taskId", task._id)).order("desc").collect();
  const technical = attempts.find((r) => r.kind === "technical" && r.policyId === policy._id && r.taskRevision === task.revision);
  if (args.kind === "clinical" && (!technical || technical.outcome !== "pass" || technical.actorId === actor._id)) deny("A technical pass and a distinct clinical verifier are required.");
  const notes = args.outcome === "pass" ? args.notes.trim() : requiredText(args.notes, "failure or inability reason", 2000);
  if (notes.length > 2000) deny("Verification notes are too long.");
  const evidenceReference = requiredText(args.evidenceReference, "verification evidence reference", 500);
  if (args.outcome !== "pass" && (!args.reworkDueAt || !Number.isFinite(args.reworkDueAt) || args.reworkDueAt <= Date.now())) deny("Choose an explicit future due date for linked rework.");
  const id = await ctx.db.insert("safetyAttempts", { taskId: task._id, equipmentId: task.equipmentId, departmentId: task.departmentId, policyId: policy._id, taskRevision: task.revision, kind: args.kind, outcome: args.outcome, checks: args.checks, notes, evidenceReference, actorId: actor._id, at: Date.now(), operationId });
  if (args.outcome !== "pass") {
    const reworkId = await ctx.db.insert("maintenanceTasks", { equipmentId: task.equipmentId, departmentId: task.departmentId, reportId: task.reportId, state: "Unassigned", dueAt: args.reworkDueAt!, diagnosis: "", notes: `Linked rework: ${notes}`, parts: [], cycle: task.cycle + 1, revision: 1, createdAt: Date.now(), updatedAt: Date.now(), parentTaskId: task._id, failureAttemptId: id });
    await audit(ctx, actor, "task.rework", reworkId, notes, task.departmentId, task._id, id);
  }
  const noticeTitle = args.outcome === "pass" ? `${args.kind === "technical" ? "Technical" : "Clinical"} verification passed` : "Verification requires linked rework";
  const noticeBody = args.outcome === "pass" ? "An independent verification decision was recorded. This does not itself release equipment." : "A failed or unable verification decision created linked rework. Equipment is not released for service.";
  await taskNotice(ctx, task._id, noticeTitle, noticeBody);
  if (task.reportId) await reportNotice(ctx, task.reportId, noticeTitle, noticeBody);
  await audit(ctx, actor, `verification.${args.kind}`, id, notes || "Approved checklist and evidence recorded", task.departmentId, undefined, args.outcome); return id;
} });
export async function eligibility(ctx: QueryCtx, equipmentId: GenericId<"equipment">) {
  const { actor, item, policy } = await equipmentContext(ctx, equipmentId); const blockers: string[] = [];
  if (!policy) blockers.push("Approved institutional safety policy is not configured.");
  if (!item.identityVerified) blockers.push("Equipment identity is unverified.");
  const tasks = await ctx.db.query("maintenanceTasks").withIndex("by_equipment", (q) => q.eq("equipmentId", item._id)).collect();
  if (tasks.some((t) => !["Completed", "Cancelled"].includes(t.state))) blockers.push("Maintenance or linked rework remains open.");
  const reports = await ctx.db.query("faultReports").withIndex("by_equipment", (q) => q.eq("equipmentId", item._id)).filter((q) => q.neq(q.field("submissionState"), "draft")).collect();
  if (reports.some((report) => !tasks.some((t) => t.reportId === report._id && t.state === "Completed"))) blockers.push("A submitted fault report has no completed maintenance record.");
  const task = tasks.filter((t) => t.state === "Completed").sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (!task) blockers.push("Completed maintenance evidence is missing.");
  const holds = await ctx.db.query("safetyHolds").withIndex("by_equipment", (q) => q.eq("equipmentId", item._id)).collect();
  if (holds.some((hold) => hold.active)) blockers.push("An active safety hold remains.");
  const holdFingerprint = JSON.stringify(holds.map((h) => [h._id, h.active, h.resolvedAt ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const attempts = task ? await ctx.db.query("safetyAttempts").withIndex("by_task", (q) => q.eq("taskId", task._id)).order("desc").collect() : [];
  const current = attempts.filter((a) => a.policyId === policy?._id && a.taskRevision === task?.revision);
  const technical = current.find((a) => a.kind === "technical"); const clinical = current.find((a) => a.kind === "clinical");
  if (!technical || technical.outcome !== "pass") blockers.push("Current technical verification has not passed.");
  if (policy?.clinicalRequired && (!clinical || clinical.outcome !== "pass" || clinical.actorId === technical?.actorId || !technical || clinical._creationTime < technical._creationTime)) blockers.push("Independent clinical verification has not passed after the current technical check.");
  return { actor, item, policy, task, technical, clinical, blockers, holdFingerprint };
}
export const releaseStatus = query({ args: { equipmentId: v.id("equipment") }, handler: async (ctx, { equipmentId }) => {
  const state = await eligibility(ctx, equipmentId);
  const release = await ctx.db.query("releaseRecords").withIndex("by_equipment", (q) => q.eq("equipmentId", equipmentId)).order("desc").first();
  const currentRelease = !!release && release.holdFingerprint === state.holdFingerprint && release.policyId === state.policy?._id && release.taskId === state.task?._id && release.taskRevision === state.task?.revision && release.technicalAttemptId === state.technical?._id && (!state.policy?.clinicalRequired || release.clinicalAttemptId === state.clinical?._id);
  return { available: state.blockers.length === 0 && currentRelease, blockers: [...state.blockers, ...(state.blockers.length === 0 && !currentRelease ? ["An authorized return-to-service decision is required."] : [])], eligible: state.blockers.length === 0, expectedTaskRevision: state.task?.revision ?? null, canRelease: !!state.policy && state.actor.capabilities.includes("hold") && state.policy.releaseRoles.includes(state.actor.role), policyReference: state.policy?.approvalReference ?? null };
} });
export const release = mutation({ args: { equipmentId: v.id("equipment"), expectedTaskRevision: v.number(), reason: v.string() }, handler: async (ctx, args) => {
  const state = await eligibility(ctx, args.equipmentId);
  if (!state.policy || !state.actor.capabilities.includes("hold") || !state.policy.releaseRoles.includes(state.actor.role)) deny("Authorized institutional release authority is required.");
  if (state.blockers.length || !state.task || !state.technical || state.task.revision !== args.expectedTaskRevision) deny(state.blockers.join(" ") || "Maintenance evidence changed; review again.");
  const prior = await ctx.db.query("releaseRecords").withIndex("by_equipment", (q) => q.eq("equipmentId", args.equipmentId)).order("desc").first();
  if (prior && prior.holdFingerprint === state.holdFingerprint && prior.policyId === state.policy._id && prior.taskId === state.task._id && prior.taskRevision === state.task.revision && prior.technicalAttemptId === state.technical._id && (!state.policy.clinicalRequired || prior.clinicalAttemptId === state.clinical?._id)) return prior._id;
  const id = await ctx.db.insert("releaseRecords", { equipmentId: state.item._id, departmentId: state.item.departmentId, policyId: state.policy._id, taskId: state.task._id, taskRevision: state.task.revision, technicalAttemptId: state.technical._id, clinicalAttemptId: state.policy.clinicalRequired ? state.clinical?._id : undefined, holdFingerprint: state.holdFingerprint, actorId: state.actor._id, reason: requiredText(args.reason, "release justification", 500), at: Date.now() });
  await equipmentNotice(ctx, state.item._id, { departmentId: state.item.departmentId, title: "Return-to-service decision recorded", body: "An authorized release decision was recorded. Check current equipment status before use; later faults or holds can invalidate that decision." });
  await audit(ctx, state.actor, "equipment.release", id, args.reason, state.item.departmentId, undefined, "return-to-service"); return id;
} });
export const resolveHold = mutation({ args: { id: v.id("safetyHolds"), reason: v.string() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "hold"); const hold = await ctx.db.get(args.id); if (!hold || !actor.scope.includes(hold.departmentId)) deny();
  const { policy } = await equipmentContext(ctx, hold.equipmentId); if (!policy || !policy.releaseRoles.includes(actor.role)) deny("Approved institutional hold-clearance authority is required.");
  if (!hold.active) deny("Hold already resolved.");
  await ctx.db.patch(hold._id, { active: false, resolvedAt: Date.now(), resolvedBy: actor._id, resolutionReason: requiredText(args.reason, "hold resolution evidence", 500) }); await audit(ctx, actor, "hold.resolve", hold._id, args.reason, hold.departmentId, "active", "resolved");
  await equipmentNotice(ctx, hold.equipmentId, { departmentId: hold.departmentId, title: "Safety hold resolved — release still required", body: "An authorized hold resolution was recorded. Hold clearance does not release equipment for service." });
} });
