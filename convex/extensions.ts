import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, mutation } from "./_generated/server";
import { requireAccount, requiredText, deny, audit, activeDepartment } from "./lib/access";
import { taskAccess, equipmentAccess } from "./operations";
import { eligibility } from "./safety";
import { taskNotice, reportNotice } from "./lib/notifications";
import { csvCell } from "../src/domain/policy";
import { priority } from "./lib/validators";

export const importInventory = mutation({ args: { departmentId: v.id("departments"), operationId: v.string(), rows: v.array(v.object({ assetId: v.string(), name: v.string(), model: v.string(), location: v.string() })), reason: v.string() }, returns: v.array(v.id("equipment")), handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "reconcile", args.departmentId);
  if (actor.role !== "Administrator") deny("An authorized inventory administrator is required.");
  await activeDepartment(ctx, args.departmentId);
  const operationId = requiredText(args.operationId, "import operation", 100);
  if (!args.rows.length || args.rows.length > 25) deny("Import 1–25 inventory records at a time.");
  const rows = args.rows.map((r) => ({ assetId: requiredText(r.assetId, "asset identifier", 200), name: requiredText(r.name, "name", 120), model: requiredText(r.model, "model", 120), location: requiredText(r.location, "location", 160) }));
  if (new Set(rows.map((r) => r.assetId)).size !== rows.length) deny("The import contains duplicate asset identifiers.");
  const snapshot = JSON.stringify(rows.map((r) => [r.assetId, r.name, r.model, r.location]));
  const prior = await ctx.db.query("inventoryImports").withIndex("by_owner_operation", (q) => q.eq("ownerId", actor._id).eq("operationId", operationId)).unique();
  if (prior) { if (prior.departmentId !== args.departmentId || prior.snapshot !== snapshot) deny("This import operation already refers to different records."); return prior.equipmentIds; }
  for (const row of rows) if (await ctx.db.query("equipment").withIndex("by_asset", (q) => q.eq("assetId", row.assetId)).first()) deny("An import identifier already exists. Review the inventory before importing.");
  const equipmentIds = [];
  for (const row of rows) equipmentIds.push(await ctx.db.insert("equipment", { ...row, departmentId: args.departmentId, identityVerified: false, revision: 1 }));
  await ctx.db.insert("inventoryImports", { ownerId: actor._id, departmentId: args.departmentId, operationId, snapshot, equipmentIds });
  await audit(ctx, actor, "inventory.import", operationId, args.reason, args.departmentId, undefined, String(rows.length));
  return equipmentIds;
} });

export const preferences = query({ args: {}, returns: v.object({ revision: v.number(), reportUpdates: v.boolean(), maintenanceUpdates: v.boolean(), verificationUpdates: v.boolean(), syncNotices: v.boolean() }), handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  const saved = await ctx.db.query("notificationPreferences").withIndex("by_owner", (q) => q.eq("ownerId", actor._id)).unique();
  return { revision: saved?.revision ?? 0, reportUpdates: saved?.reportUpdates ?? true, maintenanceUpdates: saved?.maintenanceUpdates ?? true, verificationUpdates: saved?.verificationUpdates ?? true, syncNotices: saved?.syncNotices ?? true };
} });
export const savePreferences = mutation({ args: { expectedRevision: v.number(), reportUpdates: v.boolean(), maintenanceUpdates: v.boolean(), verificationUpdates: v.boolean(), syncNotices: v.boolean() }, returns: v.number(), handler: async (ctx, args) => {
  const actor = await requireAccount(ctx);
  const saved = await ctx.db.query("notificationPreferences").withIndex("by_owner", (q) => q.eq("ownerId", actor._id)).unique();
  const { expectedRevision, ...fields } = args;
  if ((saved?.revision ?? 0) !== expectedRevision) deny("Notification preferences changed; reload before saving.");
  const revision = expectedRevision + 1;
  if (saved) await ctx.db.patch(saved._id, { ...fields, revision });
  else await ctx.db.insert("notificationPreferences", { ownerId: actor._id, ...fields, revision });
  return revision;
} });

export const transition = mutation({ args: { id: v.id("maintenanceTasks"), expectedRevision: v.number(), expectedWorkflowRevision: v.number(), action: v.union(v.literal("accept"), v.literal("await_parts"), v.literal("resume"), v.literal("close")), reason: v.string() }, returns: v.null(), handler: async (ctx, args) => {
  const { actor, task } = await taskAccess(ctx, args.id, args.action === "close" ? "assign" : "repair");
  if (task.revision !== args.expectedRevision || (task.workflowRevision ?? 0) !== args.expectedWorkflowRevision) deny("Maintenance revision changed; reload before changing workflow.");
  const reason = requiredText(args.reason, "workflow reason", 500);
  if (args.action === "close") {
    const state = await eligibility(ctx, task.equipmentId);
    if (task.state !== "Completed" || task.workflowPhase === "closed" || state.blockers.length) deny("All repair chains and approved independent checks must pass before administrative closure.");
  } else {
    if (task.assigneeId !== actor._id || !["Assigned", "In progress"].includes(task.state)) deny("Only the current assigned technician can change active workflow.");
    if (args.action === "accept" && (task.state !== "Assigned" || task.workflowPhase)) deny("Only a new assignment can be accepted.");
    if (args.action === "resume" && task.workflowPhase !== "awaiting_parts") deny("This task is not awaiting parts.");
    if (args.action === "await_parts" && task.workflowPhase !== "accepted") deny("Accept or resume this assignment before awaiting parts.");
  }
  const workflowPhase = args.action === "close" ? "closed" as const : args.action === "await_parts" ? "awaiting_parts" as const : "accepted" as const;
  await ctx.db.patch(task._id, { workflowPhase, workflowRevision: (task.workflowRevision ?? 0) + 1, workflowReason: reason, updatedAt: Date.now() });
  await taskNotice(ctx, task._id, `Maintenance ${workflowPhase.replaceAll("_", " ")}`, reason);
  if (task.reportId) await reportNotice(ctx, task.reportId, "Maintenance workflow updated", "The authorized maintenance team recorded a workflow update. Equipment release is checked separately.");
  await audit(ctx, actor, "task.workflow", task._id, reason, task.departmentId, task.workflowPhase, workflowPhase);
  return null;
} });

export const overdue = mutation({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator }, returns: v.object({ isDone: v.boolean(), continueCursor: v.string(), notified: v.number() }), handler: async (ctx, args) => {
  await requireAccount(ctx, "assign", args.departmentId);
  if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) deny("Use a bounded page size.");
  const page = await ctx.db.query("maintenanceTasks").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).paginate(args.paginationOpts);
  let notified = 0;
  for (const task of page.page) if (!["Completed", "Cancelled"].includes(task.state) && task.dueAt < Date.now() && task.overdueNotifiedDueAt !== task.dueAt) {
    await taskNotice(ctx, task._id, "Maintenance overdue", "The maintenance due date has passed. Review the current task and escalation process.");
    await ctx.db.patch(task._id, { overdueNotifiedDueAt: task.dueAt }); notified++;
  }
  return { isDone: page.isDone, continueCursor: page.continueCursor, notified };
} });

export const editEquipment = mutation({ args: { id: v.id("equipment"), expectedRevision: v.number(), name: v.string(), model: v.string(), location: v.string(), reason: v.string() }, returns: v.number(), handler: async (ctx, args) => {
  const { actor, item } = await equipmentAccess(ctx, args.id);
  if (actor.role !== "Administrator" || !actor.capabilities.includes("reconcile")) deny("An authorized inventory administrator is required.");
  if ((item.revision ?? 1) !== args.expectedRevision) deny("Inventory revision changed; reload before editing.");
  const revision = args.expectedRevision + 1;
  await ctx.db.patch(item._id, { name: requiredText(args.name, "name", 120), model: requiredText(args.model, "model", 120), location: requiredText(args.location, "location", 160), revision });
  await audit(ctx, actor, "inventory.edit", item._id, args.reason, item.departmentId);
  return revision;
} });

// Every page reauthorizes; there is no 100-record historical export truncation.
export const exportPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator, from: v.optional(v.number()), to: v.optional(v.number()), priority: v.optional(priority) }, returns: v.object({ isDone: v.boolean(), continueCursor: v.string(), csv: v.string(), count: v.number(), ids: v.array(v.string()) }), handler: async (ctx, args) => {
  await requireAccount(ctx, "export", args.departmentId);
  if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100 || (args.from !== undefined && !Number.isFinite(args.from)) || (args.to !== undefined && !Number.isFinite(args.to)) || (args.from !== undefined && args.to !== undefined && args.from > args.to)) deny("Invalid export range or page size.");
  let records = ctx.db.query("faultReports").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).filter((q) => q.neq(q.field("submissionState"), "draft"));
  if (args.from !== undefined) records = records.filter((q) => q.gte(q.field("createdAt"), args.from!));
  if (args.to !== undefined) records = records.filter((q) => q.lte(q.field("createdAt"), args.to!));
  if (args.priority) records = records.filter((q) => q.or(q.eq(q.field("triagedPriority"), args.priority!), q.and(q.eq(q.field("triagedPriority"), undefined), q.eq(q.field("priority"), args.priority!))));
  const page = await records.order("desc").paginate(args.paginationOpts);
  return { isDone: page.isDone, continueCursor: page.continueCursor, count: page.page.length, ids: page.page.map((r) => String(r._id)), csv: page.page.map((r) => [r._id, r.equipmentId, r.category, r.triagedPriority ?? r.priority].map(csvCell).join(",")).join("\r\n") };
} });

export const metricsPage = query({ args: { departmentId: v.id("departments"), source: v.union(v.literal("equipment"), v.literal("faultReports"), v.literal("maintenanceTasks"), v.literal("safetyHolds"), v.literal("releaseRecords")), paginationOpts: paginationOptsValidator }, returns: v.object({ isDone: v.boolean(), continueCursor: v.string(), counts: v.record(v.string(), v.number()) }), handler: async (ctx, args) => {
  await requireAccount(ctx, "analytics", args.departmentId);
  if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) deny("Invalid metrics page size.");
  const page = await ctx.db.query(args.source).withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).paginate(args.paginationOpts);
  const counts: Record<string, number> = {};
  const add = (key: string, n = 1) => { counts[key] = (counts[key] ?? 0) + n; };
  for (const row of page.page) {
    if ("identityVerified" in row) { add("equipment"); if (row.identityVerified) add("verifiedIdentities"); if (![row.assetId, row.name, row.model, row.location].every((s) => s.trim())) add("incompleteRecords"); }
    else if ("symptoms" in row) { if (row.submissionState !== "draft") { add("reports"); add(row.triagedPriority ?? row.priority); } }
    else if ("diagnosis" in row) { if (row.state === "Completed") { add("completedRepairs"); add("recordedRepairElapsedMs", Math.max(0, row.updatedAt - row.createdAt)); } else if (row.state !== "Cancelled") add("openTasks"); }
    else if ("active" in row) { if (row.active) add("activeHolds"); }
    else if ("technicalAttemptId" in row) add("releaseDecisions");
  }
  return { isDone: page.isDone, continueCursor: page.continueCursor, counts };
} });
