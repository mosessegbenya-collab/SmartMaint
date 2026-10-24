import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query, mutation } from "./lib/server";
import type { QueryCtx, AccountDoc } from "./lib/server";
import type { GenericId } from "convex/values";
import { activeDepartment, audit, deny, requireAccount, requiredText } from "./lib/access";
import { equipmentAccess } from "./operations";
import { priority, taskStatus } from "./lib/validators";

function pageSize(n: number) { if (!Number.isInteger(n) || n < 1 || n > 100) deny("Choose a page size between 1 and 100."); }
function equipmentPermission(actor: AccountDoc) { if (!actor.capabilities.some((c) => ["report", "repair", "assign", "clinical", "technical", "analytics", "export", "reconcile", "hold"].includes(c))) deny(); }
function reportPermission(actor: AccountDoc) { if (!actor.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) deny(); }
function taskPermission(actor: AccountDoc) { if (!actor.capabilities.some((c) => ["repair", "assign", "technical", "clinical"].includes(c))) deny(); }
async function visibleTask(ctx: QueryCtx, id: GenericId<"maintenanceTasks">) {
  const actor = await requireAccount(ctx); taskPermission(actor);
  const task = await ctx.db.get(id);
  if (!task || !actor.scope.includes(task.departmentId) || !(actor.capabilities.includes("assign") || task.assigneeId === actor._id || (task.state === "Completed" && actor.capabilities.some((c) => ["technical", "clinical"].includes(c))))) deny("Task unavailable in your authorized scope.");
  return { actor, task };
}
export const equipmentPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator, search: v.optional(v.string()), searchBy: v.optional(v.union(v.literal('name'), v.literal('model'), v.literal('assetId'))) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId); equipmentPermission(actor); pageSize(args.paginationOpts.numItems);
  if (args.search?.trim()) {
    const term = requiredText(args.search, 'equipment search', 200);
    if (term.split(/\s+/).length > 16) deny('Use at most 16 search words.');
    if (args.searchBy === 'assetId') return await ctx.db.query('equipment').withIndex('by_asset', (q) => q.eq('assetId', term)).filter((q) => q.eq(q.field('departmentId'), args.departmentId)).paginate(args.paginationOpts);
    if (args.searchBy === 'model') return await ctx.db.query('equipment').withSearchIndex('search_model', (q) => q.search('model', term).eq('departmentId', args.departmentId)).paginate(args.paginationOpts);
    return await ctx.db.query('equipment').withSearchIndex('search_name', (q) => q.search('name', term).eq('departmentId', args.departmentId)).paginate(args.paginationOpts);
  }
  return await ctx.db.query("equipment").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).order("desc").paginate(args.paginationOpts);
} });
export const reportPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator, priority: v.optional(priority), submission: v.optional(v.union(v.literal("draft"), v.literal("submitted"))) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId); reportPermission(actor); pageSize(args.paginationOpts.numItems);
  const list = actor.capabilities.some((c) => ["triage", "assign"].includes(c))
    ? ctx.db.query("faultReports").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
    : ctx.db.query("faultReports").withIndex("by_department_reporter", (q) => q.eq("departmentId", args.departmentId).eq("reporterId", actor._id));
  const visible = list.filter((q) => q.or(q.neq(q.field("submissionState"), "draft"), q.eq(q.field("reporterId"), actor._id)));
  const prioritized = args.priority ? visible.filter((q) => q.or(q.and(q.eq(q.field("triagedPriority"), undefined), q.eq(q.field("priority"), args.priority!)), q.eq(q.field("triagedPriority"), args.priority!))) : visible;
  const selected = args.submission === "draft" ? prioritized.filter((q) => q.eq(q.field("submissionState"), "draft")) : args.submission === "submitted" ? prioritized.filter((q) => q.neq(q.field("submissionState"), "draft")) : prioritized;
  return await selected.order("desc").paginate({ ...args.paginationOpts, maximumRowsRead: 1000 });
} });
export const taskPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator, verification: v.optional(v.union(v.literal("technical"), v.literal("clinical"))), state: v.optional(taskStatus), overdueBefore: v.optional(v.number()) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId); taskPermission(actor); pageSize(args.paginationOpts.numItems);
  if (args.verification && !actor.capabilities.includes(args.verification)) deny("Approved verifier access is required.");
  const list = ctx.db.query("maintenanceTasks").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId));
  const visible = actor.capabilities.includes("assign") ? list : list.filter((q) => q.or(q.eq(q.field("assigneeId"), actor._id), ...(actor.capabilities.some((c) => ["technical", "clinical"].includes(c)) ? [q.eq(q.field("state"), "Completed")] : [])));
  const selected = args.verification ? visible.filter((q) => q.and(q.eq(q.field("state"), "Completed"), q.neq(q.field("assigneeId"), actor._id))) : visible;
  const byState = args.state ? selected.filter((q) => q.eq(q.field('state'), args.state!)) : selected;
  const byDue = args.overdueBefore !== undefined ? byState.filter((q) => q.and(q.lt(q.field('dueAt'), args.overdueBefore!), q.neq(q.field('state'), 'Completed'), q.neq(q.field('state'), 'Cancelled'))) : byState;
  const page = await byDue.order('desc').paginate({ ...args.paginationOpts, maximumRowsRead: 1000 });
  return { ...page, page: await Promise.all(page.page.map(async (task) => {
    const item = await ctx.db.get(task.equipmentId);
    return { ...task, equipment: item && item.departmentId === task.departmentId ? { assetId: item.assetId, name: item.name, location: item.location } : null };
  })) };
} });
export const equipmentHistory = query({ args: { id: v.id("equipment"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const { actor, item } = await equipmentAccess(ctx, args.id); pageSize(args.paginationOpts.numItems);
  const page = await ctx.db.query("maintenanceTasks").withIndex("by_equipment", (q) => q.eq("equipmentId", item._id)).order("desc").paginate(args.paginationOpts);
  return { ...page, page: page.page.map((task) => ({ id: task._id, state: task.state, cycle: task.cycle, dueAt: task.dueAt, updatedAt: task.updatedAt, preventive: !!task.scheduleId, rework: !!task.parentTaskId, canOpen: actor.capabilities.includes("assign") || (actor.capabilities.includes("repair") && task.assigneeId === actor._id) || (task.state === "Completed" && actor.capabilities.some((c) => ["technical", "clinical"].includes(c))) })) };
} });
export const equipmentDetail = query({ args: { id: v.id("equipment") }, handler: async (ctx, { id }) => (await equipmentAccess(ctx, id)).item });
export const reportDetail = query({ args: { id: v.id("faultReports") }, handler: async (ctx, { id }) => {
  const actor = await requireAccount(ctx); reportPermission(actor); const report = await ctx.db.get(id);
  if (!report || !actor.scope.includes(report.departmentId) || !(report.reporterId === actor._id || actor.capabilities.some((c) => ["triage", "assign"].includes(c)))) deny("Report unavailable in your authorized scope.");
  if (report.submissionState === "draft" && report.reporterId !== actor._id) deny("Drafts are private to their owner.");
  return report;
} });
export const taskDetail = query({ args: { id: v.id("maintenanceTasks") }, handler: async (ctx, { id }) => (await visibleTask(ctx, id)).task });
export const workHistory = query({ args: { id: v.id("maintenanceTasks"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await visibleTask(ctx, args.id); pageSize(args.paginationOpts.numItems);
  return await ctx.db.query("workEntries").withIndex("by_task", (q) => q.eq("taskId", args.id)).order("desc").paginate(args.paginationOpts);
} });
export const lookup = query({ args: { identifier: v.string() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx); equipmentPermission(actor);
  const identifier = requiredText(args.identifier, "equipment identifier", 200);
  const item = await ctx.db.query("equipment").withIndex("by_asset", (q) => q.eq("assetId", identifier)).unique();
  // No disclosure of the existence of records outside the current department scope.
  return item && actor.scope.includes(item.departmentId) ? item : null;
} });
export const registerEquipment = mutation({ args: { assetId: v.string(), name: v.string(), model: v.string(), location: v.string(), departmentId: v.id("departments"), evidenceReference: v.string() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "reconcile", args.departmentId);
  // Institutional inventory onboarding is restricted to administrators; technician reconciliation is distinct.
  if (actor.role !== "Administrator") deny("An authorized inventory administrator is required.");
  await activeDepartment(ctx, args.departmentId);
  const assetId = requiredText(args.assetId, "asset identifier", 200);
  if (await ctx.db.query("equipment").withIndex("by_asset", (q) => q.eq("assetId", assetId)).first()) deny("This identifier is already registered. Review existing inventory.");
  const reason = requiredText(args.evidenceReference, "inventory verification reference", 500);
  const id = await ctx.db.insert("equipment", { assetId, name: requiredText(args.name, "equipment name", 120), model: requiredText(args.model, "model", 120), location: requiredText(args.location, "location", 160), departmentId: args.departmentId, identityVerified: true });
  await audit(ctx, actor, "equipment.register", id, reason, args.departmentId, undefined, assetId);
  return id;
} });
export const submitProvisional = mutation({ args: { departmentId: v.id("departments"), rawIdentifier: v.string(), equipmentType: v.string(), location: v.string(), symptoms: v.string(), priority, operationId: v.string() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "report", args.departmentId);
  const operationId = requiredText(args.operationId, "operation reference", 100);
  const prior = await ctx.db.query("provisionalReports").withIndex("by_reporter_operation", (q) => q.eq("reporterId", actor._id).eq("operationId", operationId)).unique();
  if (prior) return prior._id;
  const normalizedIdentifier = requiredText(args.rawIdentifier, "original identifier", 200);
  if (args.rawIdentifier.length > 200) deny("Original identifier exceeds 200 characters.");
  const rawIdentifier = args.rawIdentifier;
  const known = await ctx.db.query("equipment").withIndex("by_asset", (q) => q.eq("assetId", normalizedIdentifier)).first();
  if (known && actor.scope.includes(known.departmentId)) deny("This identifier requires an authorized inventory lookup before provisional submission.");
  const id = await ctx.db.insert("provisionalReports", { ...args, rawIdentifier, operationId, equipmentType: requiredText(args.equipmentType, "equipment type", 120), location: requiredText(args.location, "location", 160), symptoms: requiredText(args.symptoms, "symptoms", 1000), reporterId: actor._id, status: "unverified", createdAt: Date.now() });
  await audit(ctx, actor, "report.provisional", id, "Unverified equipment report received; no inventory identity or release granted", args.departmentId);
  return id;
} });
export const provisionalPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId); if (!actor.capabilities.includes("reconcile")) reportPermission(actor); pageSize(args.paginationOpts.numItems);
  const list = ctx.db.query("provisionalReports").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId));
  return await (actor.capabilities.some((c) => ["triage", "assign", "reconcile"].includes(c)) ? list : list.filter((q) => q.eq(q.field("reporterId"), actor._id))).order("desc").paginate({ ...args.paginationOpts, maximumRowsRead: 1000 });
} });
export const inbox = query({ args: { paginationOpts: paginationOptsValidator, unreadOnly: v.optional(v.boolean()), targetKind: v.optional(v.union(v.literal('task'), v.literal('report'), v.literal('equipment'))) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx); pageSize(args.paginationOpts.numItems);
  const notices = args.unreadOnly ? ctx.db.query('notifications').withIndex('by_recipient_read', (q) => q.eq('recipientId', actor._id).eq('readAt', undefined)) : ctx.db.query('notifications').withIndex('by_recipient', (q) => q.eq('recipientId', actor._id));
  const scoped = notices.filter((q) => q.or(...actor.scope.map((id) => q.eq(q.field('departmentId'), id))));
  const selected = args.targetKind ? scoped.filter((q) => q.eq(q.field('targetKind'), args.targetKind!)) : scoped;
  return await selected.order('desc').paginate({ ...args.paginationOpts, maximumRowsRead: 1000 });
} });
export const markRead = mutation({ args: { id: v.id("notifications"), read: v.boolean() }, handler: async (ctx, { id, read }) => {
  const actor = await requireAccount(ctx); const notice = await ctx.db.get(id);
  if (!notice || notice.recipientId !== actor._id || !actor.scope.includes(notice.departmentId)) deny();
  await ctx.db.patch(id, { readAt: read ? Date.now() : undefined });
} });
export const hasUnreadNotice = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  return !!await ctx.db.query("notifications").withIndex("by_recipient_read", (q) => q.eq("recipientId", actor._id).eq("readAt", undefined)).filter((q) => q.or(...actor.scope.map((id) => q.eq(q.field("departmentId"), id)))).first();
} });
