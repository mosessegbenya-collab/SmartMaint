import type { GenericId } from "convex/values";
import type { MutationCtx } from "./server";

type Notice = { departmentId: GenericId<"departments">; title: string; body: string };

// Internal helpers only: callers already authorized the operational change.
// Recheck recipient grants so notices never restore suspended/out-of-scope access.
export async function reportNotice(ctx: MutationCtx, reportId: GenericId<"faultReports">, title: string, body: string, equipmentTarget?: GenericId<'equipment'>) {
  const report = await ctx.db.get(reportId);
  if (!report || report.submissionState === "draft") return false;
  if (equipmentTarget && equipmentTarget !== report.equipmentId) return false;
  const recipient = await ctx.db.get(report.reporterId);
  if (!recipient || recipient.status !== "approved" || !recipient.scope.includes(report.departmentId) || !recipient.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) return false;
  await ctx.db.insert("notifications", { recipientId: recipient._id, departmentId: report.departmentId, title, body, targetKind: equipmentTarget ? 'equipment' : 'report', targetId: equipmentTarget ?? report._id, createdAt: Date.now(), dispatchState: "in_app" });
  return true;
}

export async function taskNotice(ctx: MutationCtx, taskId: GenericId<"maintenanceTasks">, title: string, body: string, equipmentTarget?: GenericId<'equipment'>) {
  const task = await ctx.db.get(taskId);
  if (!task?.assigneeId) return;
  if (equipmentTarget && equipmentTarget !== task.equipmentId) return;
  const recipient = await ctx.db.get(task.assigneeId);
  if (!recipient || recipient.status !== "approved" || !recipient.scope.includes(task.departmentId) || !recipient.capabilities.includes("repair")) return;
  await ctx.db.insert("notifications", { recipientId: recipient._id, departmentId: task.departmentId, title, body, targetKind: equipmentTarget ? 'equipment' : 'task', targetId: equipmentTarget ?? task._id, createdAt: Date.now(), dispatchState: "in_app" });
}

export async function equipmentNotice(ctx: MutationCtx, equipmentId: GenericId<"equipment">, notice: Notice) {
  // Notify the latest affected reporter and assigned technician. This is targeted
  // in-app communication, not a claim that all ward staff or external services were alerted.
  const report = await ctx.db.query("faultReports").withIndex("by_equipment", (q) => q.eq("equipmentId", equipmentId)).filter((q) => q.neq(q.field("submissionState"), "draft")).order("desc").first();
  const reporterNotified = report?.departmentId === notice.departmentId ? await reportNotice(ctx, report._id, notice.title, notice.body, equipmentId) : false;
  const task = await ctx.db.query("maintenanceTasks").withIndex("by_equipment", (q) => q.eq("equipmentId", equipmentId)).filter((q) => q.neq(q.field("assigneeId"), undefined)).order("desc").first();
  if (task?.departmentId === notice.departmentId && (!reporterNotified || task.assigneeId !== report?.reporterId)) await taskNotice(ctx, task._id, notice.title, notice.body, equipmentId);
}
