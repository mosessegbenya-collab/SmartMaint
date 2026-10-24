import { v } from "convex/values";
import { query, mutation } from "./lib/server";
import type { AccountDoc, QueryCtx } from "./lib/server";
import type { GenericId } from "convex/values";
import { requireAccount, requiredText, audit, deny } from "./lib/access";
import { priority, causeAssessment } from "./lib/validators";
import { csvCell } from "../src/domain/policy";
import type { Capability } from "../src/domain/models";
import { equipmentNotice, reportNotice, taskNotice } from "./lib/notifications";

export async function equipmentAccess(ctx: QueryCtx, id: GenericId<"equipment">) {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.some((c) => ["report", "repair", "assign", "clinical", "technical", "analytics", "export", "reconcile", "hold"].includes(c))) deny();
  const item = await ctx.db.get(id);
  if (!item || !actor.scope.includes(item.departmentId)) deny("Equipment unavailable in your authorized scope.");
  return { actor, item };
}
export async function taskAccess(ctx: QueryCtx, id: GenericId<"maintenanceTasks">, capability: Capability) {
  const actor = await requireAccount(ctx, capability);
  const task = await ctx.db.get(id);
  if (!task || !actor.scope.includes(task.departmentId)) deny("Task unavailable in your authorized scope.");
  return { actor, task };
}
export async function reportAccess(ctx: QueryCtx, id: GenericId<"faultReports">, capability: Capability) {
  const actor = await requireAccount(ctx, capability);
  const report = await ctx.db.get(id);
  if (!report || !actor.scope.includes(report.departmentId)) deny("Report unavailable in your authorized scope.");
  if (report.submissionState === "draft") deny("A draft report cannot enter an operational workflow.");
  return { actor, report };
}
async function scopedReports(ctx: QueryCtx, actor: AccountDoc) {
  return (await Promise.all(actor.scope.map((id) => ctx.db.query("faultReports").withIndex("by_department", (q) => q.eq("departmentId", id)).filter((q) => q.neq(q.field("submissionState"), "draft")).order("desc").take(100)))).flat();
}
export const equipment = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.some((c) => ["report", "repair", "assign", "clinical", "technical", "analytics", "export", "reconcile", "hold"].includes(c))) deny();
  return (await Promise.all(actor.scope.map((id) => ctx.db.query("equipment").withIndex("by_department", (q) => q.eq("departmentId", id)).take(100)))).flat();
} });
export const reports = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) deny();
  const records = await scopedReports(ctx, actor);
  return actor.capabilities.some((c) => ["triage", "assign"].includes(c)) ? records : records.filter((r) => r.reporterId === actor._id);
} });
export const submitReport = mutation({ args: {
  equipmentId: v.id("equipment"), operationId: v.string(), category: v.string(), symptoms: v.string(), description: v.string(), priority,
  condition: v.string(), inUse: v.boolean(), noticedAt: v.number(),
}, handler: async (ctx, args) => {
  const { item } = await equipmentAccess(ctx, args.equipmentId);
  const actor = await requireAccount(ctx, "report", item.departmentId);
  const operationId = requiredText(args.operationId, "operation reference", 100);
  const previous = await ctx.db.query("faultReports").withIndex("by_reporter_operation", (q) => q.eq("reporterId", actor._id).eq("operationId", operationId)).unique();
  if (previous) return previous._id;
  if (!["Electrical/Power", "Mechanical/Physical", "Performance/Function", "Controls/Display", "Accessories/Connections", "Alarm/Safety Concern", "Other/Unknown"].includes(args.category)) deny("Invalid fault category.");
  if (!["Not functioning (reported)", "Functioning with concern", "Unknown"].includes(args.condition)) deny("Invalid reported condition.");
  if (!Number.isFinite(args.noticedAt) || args.noticedAt <= 0 || args.noticedAt > Date.now()) deny("Invalid noticed time.");
  if (args.description.length > 2000) deny("Description is too long.");
  return await ctx.db.insert("faultReports", { ...args, operationId, symptoms: requiredText(args.symptoms, "symptoms", 300), reporterId: actor._id, departmentId: item.departmentId, createdAt: Date.now() });
} });
export const triage = mutation({ args: { id: v.id("faultReports"), priority, reason: v.string() }, handler: async (ctx, args) => {
  const { actor, report } = await reportAccess(ctx, args.id, "triage");
  await ctx.db.patch(report._id, { triagedPriority: args.priority, triageReason: requiredText(args.reason, "triage reason", 500) });
  await reportNotice(ctx, report._id, "Fault report triaged", "The authorized maintenance team updated your report's triaged priority. Open the report for details.");
  await audit(ctx, actor, "report.triage", report._id, args.reason, report.departmentId, report.triagedPriority, args.priority);
} });
export const tasks = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.some((c) => ["repair", "assign", "technical", "clinical"].includes(c))) deny();
  const tasks = (await Promise.all(actor.scope.map((id) => ctx.db.query("maintenanceTasks").withIndex("by_department", (q) => q.eq("departmentId", id)).take(100)))).flat();
  return actor.capabilities.includes("assign") ? tasks : tasks.filter((t) => t.assigneeId === actor._id || (t.state === "Completed" && actor.capabilities.some((c) => ["technical", "clinical"].includes(c))));
} });
export const technicians = query({ args: { departmentId: v.id("departments") }, handler: async (ctx, args) => {
  await requireAccount(ctx, "assign", args.departmentId);
  return (await ctx.db.query("staffAccounts").withIndex("by_role_status", (q) => q.eq("role", "Biomedical Technician").eq("status", "approved")).collect())
    .filter((a) => a.scope.includes(args.departmentId) && a.capabilities.includes("repair"))
    .map((a) => ({ id: a._id, name: a.fullName, staffId: a.verifiedStaffId }));
} });
export const changeDue = mutation({ args: { id: v.id("maintenanceTasks"), expectedRevision: v.number(), dueAt: v.number(), reason: v.string() }, handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, "assign");
  if (task.revision !== args.expectedRevision || ["Completed", "Cancelled"].includes(task.state) || !Number.isFinite(args.dueAt) || args.dueAt <= Date.now()) deny("Task changed, is terminal, or the due date is invalid.");
  await ctx.db.patch(task._id, { dueAt: args.dueAt, revision: task.revision + 1, updatedAt: Date.now() });
  await audit(ctx, actor, "task.due", task._id, args.reason, task.departmentId, String(task.dueAt), String(args.dueAt));
} });
export const cancelTask = mutation({ args: { id: v.id("maintenanceTasks"), expectedRevision: v.number(), reason: v.string() }, handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, "assign");
  if (task.revision !== args.expectedRevision || ["Completed", "Cancelled"].includes(task.state)) deny("Task changed or is terminal.");
  await ctx.db.patch(task._id, { state: "Cancelled", revision: task.revision + 1, updatedAt: Date.now() });
  await audit(ctx, actor, "task.cancel", task._id, args.reason, task.departmentId, task.state, "Cancelled");
} });
export const createTask = mutation({ args: { reportId: v.id("faultReports"), dueAt: v.number() }, handler: async (ctx, args) => {
  const { actor, report } = await reportAccess(ctx, args.reportId, "assign");
  const item = await ctx.db.get(report.equipmentId);
  if (!item?.identityVerified) deny("Verified equipment identity is required for maintenance.");
  if (!Number.isFinite(args.dueAt) || args.dueAt <= Date.now()) deny("Choose a future due date.");
  const existing = await ctx.db.query("maintenanceTasks").withIndex("by_report", (q) => q.eq("reportId", report._id)).first();
  if (existing) return existing._id;
  const now = Date.now();
  const id = await ctx.db.insert("maintenanceTasks", { reportId: report._id, equipmentId: report.equipmentId, departmentId: report.departmentId,
    state: "Unassigned", dueAt: args.dueAt, diagnosis: "", notes: "", parts: [], cycle: 1, revision: 1, createdAt: now, updatedAt: now });
  await audit(ctx, actor, "task.create", id, "Authorized maintenance task created", report.departmentId, undefined, "Unassigned");
  return id;
} });
export const assign = mutation({ args: { id: v.id("maintenanceTasks"), expectedRevision: v.number(), assigneeId: v.id("staffAccounts"), dueAt: v.number(), reason: v.string() }, handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, "assign");
  if (task.revision !== args.expectedRevision || ["Completed", "Cancelled"].includes(task.state)) deny("Task changed or is terminal.");
  const assignee = await ctx.db.get(args.assigneeId);
  if (!assignee || assignee.status !== "approved" || assignee.role !== "Biomedical Technician" || !assignee.capabilities.includes("repair") || !assignee.scope.includes(task.departmentId)) deny("Choose an authorized technician in scope.");
  if (!Number.isFinite(args.dueAt) || args.dueAt <= Date.now()) deny("Choose a future due date.");
  await ctx.db.patch(task._id, { assigneeId: assignee._id, dueAt: args.dueAt, state: task.state === "Unassigned" ? "Assigned" : task.state, revision: task.revision + 1, updatedAt: Date.now() });
  await taskNotice(ctx, task._id, "Maintenance assigned", "A maintenance task has been assigned to you.");
  await audit(ctx, actor, "task.assign", task._id, args.reason, task.departmentId, task.assigneeId, assignee._id);
} });
export const recordWork = mutation({ args: { id: v.id("maintenanceTasks"), expectedRevision: v.number(), diagnosis: v.string(), diagnosisEvidence: v.optional(v.string()), causeAssessment: v.optional(causeAssessment), notes: v.string(), parts: v.array(v.string()), complete: v.boolean(), preventiveResults: v.optional(v.array(v.object({ label: v.string(), passed: v.boolean() }))) }, handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, "repair");
  if (task.assigneeId !== actor._id || task.revision !== args.expectedRevision || !["Assigned", "In progress"].includes(task.state)) deny("Only the assigned technician can update active work.");
  if (args.diagnosis.length > 2000 || args.notes.length > 4000 || args.parts.length > 30 || args.parts.some((p) => !p.trim() || p.length > 120)) deny("Invalid maintenance details.");
  const diagnosisEvidence = args.diagnosisEvidence === undefined ? task.diagnosisEvidence : args.diagnosisEvidence.trim();
  const cause = args.causeAssessment ?? task.causeAssessment;
  if ((diagnosisEvidence?.length ?? 0) > 2000 || (cause === 'Confirmed by testing' && !diagnosisEvidence)) deny('Record supporting evidence for a cause confirmed by testing. Evidence must be at most 2000 characters.');
  if (args.complete && !args.diagnosis.trim()) deny("Diagnosis is required before completion.");
  if (task.preventiveChecklist && (!args.preventiveResults || args.preventiveResults.length !== task.preventiveChecklist.length || args.preventiveResults.some((result, i) => result.label !== task.preventiveChecklist![i]) || (args.complete && args.preventiveResults.some((r) => !r.passed)))) deny("Record every scheduled checklist item; incomplete/failed checks cannot complete maintenance.");
  const next = args.complete ? "Completed" as const : "In progress" as const;
  // Preserve the original snapshot once, then every authorized revision. No public writer edits history.
  if (!await ctx.db.query("workEntries").withIndex("by_task", (q) => q.eq("taskId", task._id)).first()) {
    await ctx.db.insert("workEntries", { taskId: task._id, departmentId: task.departmentId, baseline: true, revision: task.revision, diagnosis: task.diagnosis, diagnosisEvidence: task.diagnosisEvidence, causeAssessment: task.causeAssessment, notes: task.notes, parts: task.parts, state: task.state, at: task.updatedAt });
  }
  await ctx.db.insert("workEntries", { taskId: task._id, departmentId: task.departmentId, actorId: actor._id, revision: task.revision + 1, diagnosis: args.diagnosis, diagnosisEvidence, causeAssessment: cause, notes: args.notes, parts: args.parts, state: next, at: Date.now(), preventiveResults: args.preventiveResults });
  await ctx.db.patch(task._id, { diagnosis: args.diagnosis, diagnosisEvidence, causeAssessment: cause, notes: args.notes, parts: args.parts, state: next, revision: task.revision + 1, updatedAt: Date.now(), preventiveResults: args.preventiveResults });
  if (args.complete && task.reportId) await reportNotice(ctx, task.reportId, "Repair completed — verification pending", "Repair work was recorded as complete. Independent verification and authorized release are still required.");
  await audit(ctx, actor, "task.work", task._id, "Maintenance work recorded; no equipment release granted", task.departmentId, task.state, next);
} });
export const submitVerification = mutation({ args: { id: v.id("maintenanceTasks"), kind: v.union(v.literal("technical"), v.literal("clinical")) }, handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, args.kind);
  if (task.assigneeId === actor._id) deny("Independent verification is required.");
  deny("Production verification checklists and release policies are not approved. No verification has been recorded.");
} });
export const holds = query({ args: { equipmentId: v.id("equipment") }, handler: async (ctx, args) => {
  await equipmentAccess(ctx, args.equipmentId);
  return await ctx.db.query("safetyHolds").withIndex("by_equipment", (q) => q.eq("equipmentId", args.equipmentId)).collect();
} });
export const placeHold = mutation({ args: { equipmentId: v.id("equipment"), reason: v.string() }, handler: async (ctx, args) => {
  const { item } = await equipmentAccess(ctx, args.equipmentId);
  const actor = await requireAccount(ctx, "hold", item.departmentId);
  const reason = requiredText(args.reason, "safety hold reason", 500);
  const id = await ctx.db.insert("safetyHolds", { equipmentId: item._id, departmentId: item.departmentId, active: true, reason, createdBy: actor._id, createdAt: Date.now() });
  await equipmentNotice(ctx, item._id, { departmentId: item.departmentId, title: "Equipment safety hold placed", body: "A safety hold now blocks return to service. Open the linked record and current equipment status." });
  await audit(ctx, actor, "hold.create", id, reason, item.departmentId, undefined, "active");
  return id;
} });
export const clearHold = mutation({ args: { id: v.id("safetyHolds") }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "hold");
  const hold = await ctx.db.get(args.id);
  if (!hold || !actor.scope.includes(hold.departmentId)) deny("Hold unavailable in your authorized scope.");
  deny("Approved hold-clearance policy is not configured. The safety hold remains active.");
} });
export const availability = query({ args: { equipmentId: v.id("equipment") }, handler: async (ctx, args) => {
  await equipmentAccess(ctx, args.equipmentId);
  return { available: false as const, reason: "Production release and independent verification policies are not configured." };
} });
export const reconcile = mutation({ args: { equipmentId: v.id("equipment") }, handler: async (ctx, args) => {
  const { item } = await equipmentAccess(ctx, args.equipmentId);
  await requireAccount(ctx, "reconcile", item.departmentId);
  deny("Authoritative equipment reconciliation policy is not configured.");
} });
export const analytics = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx, "analytics");
  const reports = await scopedReports(ctx, actor);
  return { scopeCount: actor.scope.length, reports: reports.length, highPriority: reports.filter((r) => (r.triagedPriority ?? r.priority) !== "Routine").length, truncatedAtPerDepartment: 100 };
} });
export const exportReports = query({ args: { departmentId: v.optional(v.id("departments")), from: v.optional(v.number()), to: v.optional(v.number()), priority: v.optional(priority) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "export", args.departmentId);
  if ((args.from !== undefined && !Number.isFinite(args.from)) || (args.to !== undefined && !Number.isFinite(args.to)) || (args.from !== undefined && args.to !== undefined && args.from > args.to)) deny("Choose a valid chronological date range.");
  const scoped = args.departmentId ? { ...actor, scope: [args.departmentId] } : actor;
  const reports = (await scopedReports(ctx, scoped)).filter((report) => (args.from === undefined || report.createdAt >= args.from) && (args.to === undefined || report.createdAt <= args.to) && (!args.priority || (report.triagedPriority ?? report.priority) === args.priority));
  return { csv: "Report,Equipment,Category,Priority\r\n" + reports.map((r) => [r._id, r.equipmentId, r.category, r.triagedPriority ?? r.priority].map(csvCell).join(",")).join("\r\n"), count: reports.length, truncatedAtPerDepartment: 100 };
} });
export const managementSummary = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx, "analytics");
  const limit = 100;
  const departments = await Promise.all(actor.scope.map(async (departmentId) => {
    const [inventory, reports, tasks, holds] = await Promise.all([
      ctx.db.query("equipment").withIndex("by_department", (q) => q.eq("departmentId", departmentId)).order("desc").take(limit),
      ctx.db.query("faultReports").withIndex("by_department", (q) => q.eq("departmentId", departmentId)).filter((q) => q.neq(q.field("submissionState"), "draft")).order("desc").take(limit),
      ctx.db.query("maintenanceTasks").withIndex("by_department", (q) => q.eq("departmentId", departmentId)).order("desc").take(limit),
      ctx.db.query("safetyHolds").withIndex("by_department", (q) => q.eq("departmentId", departmentId)).filter((q) => q.eq(q.field("active"), true)).take(limit),
    ]);
    return { inventory, reports, tasks, holds, limited: [inventory, reports, tasks, holds].some((rows) => rows.length === limit) };
  }));
  const inventory = departments.flatMap((d) => d.inventory);
  const reports = departments.flatMap((d) => d.reports);
  const tasks = departments.flatMap((d) => d.tasks);
  const complete = inventory.filter((e) => [e.assetId, e.name, e.model, e.location].every((s) => s.trim().length > 0));
  return {
    scopeCount: actor.scope.length, equipment: inventory.length, reports: reports.length,
    activeHolds: departments.reduce((n, d) => n + d.holds.length, 0),
    completedRepairs: tasks.filter((t) => t.state === "Completed").length,
    openTasks: tasks.filter((t) => !["Completed", "Cancelled"].includes(t.state)).length,
    verifiedIdentities: inventory.filter((e) => e.identityVerified).length,
    completeRecords: complete.length, incompleteRecords: inventory.length - complete.length,
    priorities: (["Urgent", "High", "Routine"] as const).map((priority) => ({ label: priority, count: reports.filter((r) => (r.triagedPriority ?? r.priority) === priority).length })),
    limit, limited: departments.some((d) => d.limited),
  };
} });
