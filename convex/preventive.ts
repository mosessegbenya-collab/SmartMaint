import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./lib/server";
import { audit, deny, requireAccount, requiredText } from "./lib/access";
import { equipmentAccess } from "./operations";

export const page = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId); if (!actor.capabilities.some((c) => ["assign", "repair"].includes(c))) deny();
  if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100) deny("Invalid page size.");
  return await ctx.db.query("preventiveSchedules").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).order("desc").paginate(args.paginationOpts);
} });
export const create = mutation({ args: { equipmentId: v.id("equipment"), title: v.string(), approvedReference: v.string(), intervalDays: v.number(), nextDueAt: v.number(), checklist: v.array(v.string()), operationId: v.optional(v.string()) }, handler: async (ctx, args) => {
  const { item } = await equipmentAccess(ctx, args.equipmentId); const actor = await requireAccount(ctx, "assign", item.departmentId);
  const operationId = args.operationId === undefined ? undefined : requiredText(args.operationId, "operation reference", 100);
  if (operationId) {
    const previous = await ctx.db.query("preventiveSchedules").withIndex("by_creator_operation", (q) => q.eq("createdBy", actor._id).eq("operationId", operationId)).unique();
    if (previous) {
      if (previous.equipmentId !== item._id) deny("This operation reference belongs to another schedule.");
      return previous._id;
    }
  }
  if (!item.identityVerified) deny("Verified inventory is required.");
  if (!Number.isInteger(args.intervalDays) || args.intervalDays < 1 || args.intervalDays > 3650 || !Number.isFinite(args.nextDueAt) || args.nextDueAt <= Date.now()) deny("Choose a future due date and interval of 1–3650 days.");
  if (!args.checklist.length || args.checklist.length > 30 || new Set(args.checklist).size !== args.checklist.length || args.checklist.some((r) => !r.trim() || r.length > 160)) deny("Supply 1–30 distinct approved maintenance checklist items.");
  const id = await ctx.db.insert("preventiveSchedules", { ...args, operationId, title: requiredText(args.title, "schedule title", 120), approvedReference: requiredText(args.approvedReference, "approved maintenance schedule reference", 200), departmentId: item.departmentId, active: true, revision: 1, createdBy: actor._id, createdAt: Date.now() });
  await audit(ctx, actor, "preventive.create", id, args.approvedReference, item.departmentId); return id;
} });
export const materialize = mutation({ args: { id: v.id("preventiveSchedules"), expectedRevision: v.number(), scheduledDueAt: v.number() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "assign"); const schedule = await ctx.db.get(args.id); if (!schedule || !actor.scope.includes(schedule.departmentId)) deny();
  const previous = await ctx.db.query("maintenanceTasks").withIndex("by_schedule_due", (q) => q.eq("scheduleId", schedule._id).eq("scheduledDueAt", args.scheduledDueAt)).unique();
  if (previous) return previous._id;
  if (!schedule.active || schedule.revision !== args.expectedRevision || schedule.nextDueAt !== args.scheduledDueAt) deny("Schedule changed or is paused; reload before creating its task.");
  const { item } = await equipmentAccess(ctx, schedule.equipmentId); if (!item.identityVerified) deny();
  const now = Date.now(); const id = await ctx.db.insert("maintenanceTasks", { equipmentId: item._id, departmentId: schedule.departmentId, scheduleId: schedule._id, scheduledDueAt: schedule.nextDueAt, preventiveChecklist: schedule.checklist, state: "Unassigned", dueAt: schedule.nextDueAt, diagnosis: "", notes: "", parts: [], cycle: 1, revision: 1, createdAt: now, updatedAt: now });
  await ctx.db.patch(schedule._id, { nextDueAt: schedule.nextDueAt + schedule.intervalDays * 86400000, revision: schedule.revision + 1 });
  await audit(ctx, actor, "preventive.task", id, schedule.approvedReference, schedule.departmentId, schedule._id, "Unassigned"); return id;
} });
export const reschedule = mutation({ args: { id: v.id("preventiveSchedules"), expectedRevision: v.number(), nextDueAt: v.number(), active: v.boolean(), reason: v.string() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "assign"); const schedule = await ctx.db.get(args.id); if (!schedule || !actor.scope.includes(schedule.departmentId)) deny();
  if (schedule.revision !== args.expectedRevision || !Number.isFinite(args.nextDueAt) || args.nextDueAt <= Date.now()) deny("Schedule changed or due date is invalid.");
  await ctx.db.patch(schedule._id, { nextDueAt: args.nextDueAt, active: args.active, revision: schedule.revision + 1 });
  await audit(ctx, actor, "preventive.reschedule", schedule._id, args.reason, schedule.departmentId, String(schedule.nextDueAt), String(args.nextDueAt));
} });

// Activity changes preserve overdue obligations and every existing occurrence.
export const setActivity = mutation({
  args: { id: v.id('preventiveSchedules'), expectedRevision: v.number(), active: v.boolean(), reason: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const actor = await requireAccount(ctx, 'assign');
    const schedule = await ctx.db.get(args.id);
    if (!schedule || !actor.scope.includes(schedule.departmentId)) deny();
    if (schedule.revision !== args.expectedRevision) deny('Schedule changed; review its current activity before continuing.');
    const reason = requiredText(args.reason, 'schedule activity justification', 500);
    if (schedule.active === args.active) return schedule.revision;
    const revision = schedule.revision + 1;
    await ctx.db.patch(schedule._id, { active: args.active, revision });
    await audit(ctx, actor, 'preventive.activity', schedule._id, reason, schedule.departmentId, schedule.active ? 'Active' : 'Paused', args.active ? 'Active' : 'Paused');
    return revision;
  },
});
