import { v } from "convex/values";
import type { GenericId } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action, internalMutation, internalQuery, mutation, query } from "./lib/server";
import type { QueryCtx } from "./lib/server";
import { audit, deny, identity, requireAccount, requiredText } from "./lib/access";
import { photoDimensions } from "../src/domain/photo-validation";
import { finishStoredEvidence } from "./lib/evidence_storage";

const MAX_BYTES = 2 * 1024 * 1024;
async function reportAccess(ctx: QueryCtx, id: GenericId<"faultReports">, write = false) {
  const actor = await requireAccount(ctx); const report = await ctx.db.get(id);
  if (!report || !actor.scope.includes(report.departmentId) || !actor.capabilities.some((c) => ["report", "triage", "assign"].includes(c)) || !(report.reporterId === actor._id || actor.capabilities.some((c) => ["triage", "assign"].includes(c)))) deny("Report attachment access is not authorized.");
  if (write && !actor.capabilities.includes("report")) deny();
  if (write && report.submissionState !== "draft") deny("Submitted report evidence is immutable. Only private draft photos may be edited.");
  if (report.submissionState === "draft" && report.reporterId !== actor._id) deny("Draft photos are private to their owner.");
  return { actor, report };
}
export const authorizeUpload = internalQuery({ args: { reportId: v.id("faultReports") }, handler: async (ctx, { reportId }) => {
  await reportAccess(ctx, reportId, true); return true;
} });
export const finishUpload = internalMutation({ args: { reportId: v.id("faultReports"), storageId: v.id("_storage"), operationId: v.string(), contentType: v.string(), size: v.number() }, handler: async (ctx, args) => {
  const { actor, report } = await reportAccess(ctx, args.reportId, true);
  const prior = await ctx.db.query("reportAttachments").withIndex("by_owner_operation", (q) => q.eq("ownerId", actor._id).eq("operationId", args.operationId)).unique();
  if (prior) { if (prior.reportId !== report._id || prior.deletedAt) deny("This upload operation cannot be reused."); return { id: prior._id, storageId: prior.storageId }; }
  const existing = await ctx.db.query("reportAttachments").withIndex("by_report", (q) => q.eq("reportId", report._id)).filter((q) => q.eq(q.field("deletedAt"), undefined)).take(6);
  if (existing.length >= 5) deny("A report supports at most five equipment photos.");
  const id = await ctx.db.insert("reportAttachments", { ...args, departmentId: report.departmentId, ownerId: actor._id, createdAt: Date.now() });
  await ctx.db.patch(report._id, { attachmentRevision: (report.attachmentRevision ?? 0) + 1 });
  await audit(ctx, actor, "attachment.create", id, "Equipment photo stored through authenticated upload action", report.departmentId);
  return { id, storageId: args.storageId };
} });
export const list = query({ args: { reportId: v.id("faultReports") }, handler: async (ctx, { reportId }) => {
  const { report } = await reportAccess(ctx, reportId);
  const rows = await ctx.db.query("reportAttachments").withIndex("by_report", (q) => q.eq("reportId", reportId)).filter((q) => q.eq(q.field("deletedAt"), undefined)).take(5);
  // Never expose permanent public storage URLs or raw storage IDs.
  return { revision: report.attachmentRevision ?? 0, items: rows.map((r) => ({ id: r._id, contentType: r.contentType, size: r.size, createdAt: r.createdAt })) };
} });
export const readMetadata = internalQuery({ args: { id: v.id("reportAttachments") }, handler: async (ctx, { id }) => {
  await requireAccount(ctx); const item = await ctx.db.get(id); if (!item || item.deletedAt) deny("Attachment unavailable."); await reportAccess(ctx, item.reportId); return { storageId: item.storageId, contentType: item.contentType };
} });
export const uploadReference = internalQuery({ args: { reportId: v.id("faultReports"), operationId: v.string(), storageId: v.id("_storage") }, handler: async (ctx, args) => {
  const { actor } = await reportAccess(ctx, args.reportId);
  const prior = await ctx.db.query("reportAttachments").withIndex("by_owner_operation", (q) => q.eq("ownerId", actor._id).eq("operationId", args.operationId)).unique();
  return !!prior && prior.reportId === args.reportId && prior.storageId === args.storageId && !prior.deletedAt;
} });
const authorize = makeFunctionReference<"query", { reportId: GenericId<"faultReports"> }, boolean>("attachments:authorizeUpload");
const finish = makeFunctionReference<"mutation", { reportId: GenericId<"faultReports">; storageId: GenericId<"_storage">; operationId: string; contentType: string; size: number }, { id: GenericId<"reportAttachments">; storageId: GenericId<"_storage"> }>("attachments:finishUpload");
const metadata = makeFunctionReference<"query", { id: GenericId<"reportAttachments"> }, { storageId: GenericId<"_storage">; contentType: string }>("attachments:readMetadata");
const reference = makeFunctionReference<"query", { reportId: GenericId<"faultReports">; operationId: string; storageId: GenericId<"_storage"> }, boolean>("attachments:uploadReference");
export const upload = action({ args: { reportId: v.id("faultReports"), operationId: v.string(), contentType: v.string(), base64: v.string() }, handler: async (ctx, args): Promise<{ id: GenericId<"reportAttachments"> }> => {
  await identity(ctx);
  await ctx.runQuery(authorize, { reportId: args.reportId });
  const operationId = requiredText(args.operationId, "upload operation", 100);
  if (!["image/jpeg", "image/png", "image/webp"].includes(args.contentType) || args.base64.length > Math.ceil(MAX_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(args.base64)) deny("Select a JPEG, PNG or WebP photo no larger than 2 MB.");
  let bytes: Uint8Array;
  try { bytes = Uint8Array.from(atob(args.base64), (char) => char.charCodeAt(0)); } catch { deny("Invalid photo encoding."); }
  if (!bytes.length || bytes.length > MAX_BYTES) deny("Photo exceeds the size limit.");
  const valid = args.contentType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : args.contentType === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
    : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!valid) deny("Photo contents do not match the declared image type.");
  if (!photoDimensions(bytes, args.contentType)) deny("Choose a valid equipment photo no larger than 4096 × 4096 pixels.");
  const storageId = await ctx.storage.store(new Blob([bytes as BlobPart], { type: args.contentType }));
  const result = await finishStoredEvidence(
    () => ctx.runMutation(finish, { reportId: args.reportId, storageId, operationId, contentType: args.contentType, size: bytes.length }),
    () => ctx.runQuery(reference, { reportId: args.reportId, storageId, operationId }),
    () => ctx.storage.delete(storageId),
  );
  if (result.storageId !== storageId) await ctx.storage.delete(storageId);
  return { id: result.id };
} });
export const read = action({ args: { id: v.id("reportAttachments") }, handler: async (ctx, args): Promise<{ dataUri: string }> => {
  await identity(ctx); const row = await ctx.runQuery(metadata, args); const blob = await ctx.storage.get(row.storageId);
  if (!blob || blob.size > MAX_BYTES) deny("Attachment unavailable.");
  const bytes = new Uint8Array(await blob.arrayBuffer()); let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  // The caller must be authorized on every read; there is no reusable public file URL.
  return { dataUri: `data:${row.contentType};base64,${btoa(binary)}` };
} });
export const remove = mutation({ args: { id: v.id("reportAttachments") }, handler: async (ctx, { id }) => {
  await requireAccount(ctx); const item = await ctx.db.get(id); if (!item || item.deletedAt) deny("Attachment unavailable."); const { actor, report } = await reportAccess(ctx, item.reportId, true);
  await ctx.storage.delete(item.storageId); await ctx.db.patch(id, { deletedAt: Date.now() }); await ctx.db.patch(report._id, { attachmentRevision: (report.attachmentRevision ?? 0) + 1 }); await audit(ctx, actor, "attachment.delete", id, "Equipment photo removed by authorized report editor", report.departmentId);
} });
