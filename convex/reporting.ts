import { v } from "convex/values";
import { mutation, query } from "./lib/server";
import { audit, deny, requireAccount, requiredText } from "./lib/access";
import { equipmentAccess } from "./operations";
import { priority } from "./lib/validators";

const fields = { equipmentId: v.id("equipment"), operationId: v.string(), category: v.string(), symptoms: v.string(), description: v.string(), priority, condition: v.string(), inUse: v.boolean(), noticedAt: v.number(), emergency: v.boolean() };
/** Read-only reconciliation never publishes or creates a report. */
export const publicationReceipt = query({ args: { id: v.id("faultReports"), expectedRevision: v.number(), expectedAttachmentRevision: v.number() }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "report"); const report = await ctx.db.get(args.id);
  if (!report || report.reporterId !== actor._id || !actor.scope.includes(report.departmentId)) deny();
  if (report.submissionState === "submitted") return report._id;
  if (report.submissionState !== "draft" || report.revision !== args.expectedRevision || (report.attachmentRevision ?? 0) !== args.expectedAttachmentRevision) deny("Draft or photo revision conflict: review the current server report.");
  return null;
} });
export const saveDraft = mutation({ args: { ...fields, expectedRevision: v.optional(v.number()) }, handler: async (ctx, args) => {
  const { item } = await equipmentAccess(ctx, args.equipmentId); const actor = await requireAccount(ctx, "report", item.departmentId);
  const operationId = requiredText(args.operationId, "operation reference", 100);
  if (!["Electrical/Power", "Mechanical/Physical", "Performance/Function", "Controls/Display", "Accessories/Connections", "Alarm/Safety Concern", "Other/Unknown"].includes(args.category)) deny("Choose a fault category.");
  if (!["Not functioning (reported)", "Functioning with concern", "Unknown"].includes(args.condition)) deny("Choose the reported condition.");
  if (!Number.isFinite(args.noticedAt) || args.noticedAt <= 0 || args.noticedAt > Date.now()) deny("Time noticed must be in the past.");
  if (args.description.length > 2000) deny("Description exceeds 2000 characters.");
  const data = { equipmentId: item._id, departmentId: item.departmentId, reporterId: actor._id, operationId, category: args.category, symptoms: requiredText(args.symptoms, "symptoms", 300), description: args.description.trim(), priority: args.emergency ? "Urgent" as const : args.priority, condition: args.condition, inUse: args.inUse, noticedAt: args.noticedAt, emergency: args.emergency };
  const prior = await ctx.db.query("faultReports").withIndex("by_reporter_operation", (q) => q.eq("reporterId", actor._id).eq("operationId", operationId)).unique();
  if (prior) {
    if (prior.submissionState !== "draft") deny("This report has already been submitted.");
    const identical = Object.entries(data).every(([key, value]) => prior[key as keyof typeof prior] === value);
    if (args.expectedRevision === undefined) {
      if (!identical) deny("Draft conflict: reload the current saved revision.");
      return { id: prior._id, revision: prior.revision ?? 1 };
    }
    if (args.expectedRevision !== prior.revision) {
      // The immediately preceding update may have committed before its response was lost.
      if (identical && prior.revision === args.expectedRevision + 1) return { id: prior._id, revision: prior.revision };
      deny("Draft conflict: another revision has been saved.");
    }
    if (prior.equipmentId !== item._id && await ctx.db.query("reportAttachments").withIndex("by_report", (q) => q.eq("reportId", prior._id)).filter((q) => q.eq(q.field("deletedAt"), undefined)).first()) deny("Remove existing photos before changing equipment identity.");
    const revision = (prior.revision ?? 1) + 1; await ctx.db.patch(prior._id, { ...data, revision }); return { id: prior._id, revision };
  }
  if (args.expectedRevision !== undefined) deny("Draft no longer exists. Review synchronization state.");
  const id = await ctx.db.insert("faultReports", { ...data, submissionState: "draft", revision: 1, createdAt: Date.now() }); return { id, revision: 1 };
} });
export const publish = mutation({ args: { id: v.id("faultReports"), expectedRevision: v.number(), expectedAttachmentRevision: v.optional(v.number()) }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "report"); const report = await ctx.db.get(args.id);
  if (!report || report.reporterId !== actor._id || !actor.scope.includes(report.departmentId)) deny();
  if (report.submissionState === "submitted") return report._id; // Idempotent retry after a lost receipt.
  if (report.submissionState !== "draft" || report.revision !== args.expectedRevision) deny("Draft conflict: review the current report before submitting.");
  if ((report.attachmentRevision ?? 0) !== (args.expectedAttachmentRevision ?? 0)) deny("Photo conflict: review the current attachments before submitting.");
  await equipmentAccess(ctx, report.equipmentId);
  await ctx.db.patch(report._id, { submissionState: "submitted", revision: args.expectedRevision + 1 });
  await ctx.db.insert("notifications", { recipientId: actor._id, departmentId: report.departmentId, title: report.emergency ? "Urgent report received" : "Fault report received", body: "Your report was recorded. This is an in-app receipt; external alert delivery is not confirmed.", targetKind: "report", targetId: report._id, createdAt: Date.now(), dispatchState: "in_app" });
  await audit(ctx, actor, "report.submit", report._id, report.emergency ? "Urgent report received; external escalation not confirmed" : "Fault report submitted after review", report.departmentId, "draft", "submitted");
  return report._id;
} });
