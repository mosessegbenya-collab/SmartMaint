import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { DEMO, requireDemoDeployment } from "./lib/development";
import { audit, deny, POLICY_VERSION } from "./lib/access";
import { allowedRoleCapabilities } from "../src/domain/role-policy";
import { roles } from "../src/domain/models";

/** Trusted deployment operator only. No public wrapper or scheduled bootstrap. */
export const prepare = internalMutation({ args: {}, returns: v.id("departments"), handler: async (ctx) => {
  requireDemoDeployment();
  const existing = await ctx.db.query("departments").withIndex("by_code", q => q.eq("code", DEMO.departmentCode)).unique();
  if (existing && (existing.name !== DEMO.departmentName || !existing.active || existing.classification !== DEMO.classification)) deny("Existing IT-DEMO conflicts with demo setup; no records changed.");
  const prior = await ctx.db.query("accessPolicy").withIndex("by_key", q => q.eq("key", "staff-access")).unique();
  if (prior && (prior.classification !== DEMO.classification || prior.developmentPolicyReference !== DEMO.policyReference || prior.developmentSetupReference !== DEMO.setupReference || prior.manualVerificationEnabled || prior.developmentReviewEnabled !== true || prior.version !== POLICY_VERSION)) deny("Existing policy conflicts with demo setup; no records changed.");
  if (!prior && await ctx.db.query("staffAccounts").first()) deny("Existing staff accounts require a separately reviewed setup.");
  const departmentId = existing?._id ?? await ctx.db.insert("departments", { code: DEMO.departmentCode, name: DEMO.departmentName, active: true, classification: DEMO.classification });
  if (await ctx.db.query("safetyPolicies").withIndex("by_department_active", q => q.eq("departmentId", departmentId).eq("active", true)).first()) deny("Demo requires disabled safety policy.");
  if (!existing) await audit(ctx, null, "demo.department", departmentId, `${DEMO.setupReference}: synthetic development department`, departmentId);
  if (!prior) {
    await ctx.db.insert("accessPolicy", { key: "staff-access", version: POLICY_VERSION, classification: DEMO.classification,
      institutionalPolicyReference: "", developmentPolicyReference: DEMO.policyReference, developmentSetupReference: DEMO.setupReference,
      manualVerificationEnabled: false, developmentReviewEnabled: true, configuredAt: Date.now() });
    await audit(ctx, null, "demo.policy", "staff-access", `${DEMO.setupReference}: ${DEMO.policyReference}; development review only, no institutional approval`, departmentId);
  }
  const assetId = "IT-DEMO-FICTIONAL-001";
  const equipment = await ctx.db.query("equipment").withIndex("by_asset", q => q.eq("assetId", assetId)).unique();
  if (equipment && equipment.departmentId !== departmentId) deny("Sample asset conflicts with existing data.");
  if (!equipment) {
    const id = await ctx.db.insert("equipment", { assetId, name: "Fictional training monitor — DEMO ONLY", model: "SIMULATED-IT-001", location: "Fictional training room", departmentId, identityVerified: true, revision: 1 });
    await audit(ctx, null, "demo.equipment", id, `${DEMO.setupReference}: fictional device, not clinical equipment or release evidence`, departmentId);
  }
  return departmentId;
} });

export const readiness = internalQuery({ args: {}, returns: v.object({ status: v.union(v.literal("not_prepared"), v.literal("awaiting_authenticated_application"), v.literal("ready"), v.literal("closed")), applicationId: v.union(v.id("registrationRequests"), v.null()), clerkUserId: v.union(v.string(), v.null()), accountId: v.union(v.id("staffAccounts"), v.null()) }), handler: async (ctx) => {
  requireDemoDeployment();
  const p = await ctx.db.query("accessPolicy").withIndex("by_key", q => q.eq("key", "staff-access")).unique();
  if (p?.classification !== DEMO.classification) return { status: "not_prepared" as const, applicationId: null, clerkUserId: null, accountId: null };
  const requests = await ctx.db.query("registrationRequests").withIndex("by_email", q => q.eq("email", DEMO.email)).take(2);
  if (requests.length > 1) deny("Multiple intended applications require operator review.");
  const r = requests[0];
  return { status: p.bootstrapCompletedAt !== undefined ? "closed" as const : r ? "ready" as const : "awaiting_authenticated_application" as const,
    applicationId: r?._id ?? null, clerkUserId: r?.clerkUserId ?? null, accountId: p.bootstrapAccountId ?? null };
} });

export const bootstrap = internalMutation({ args: { applicationId: v.id("registrationRequests"), clerkUserId: v.string(), setupReference: v.literal("DEMO-ADMIN-20261026-001") }, returns: v.id("staffAccounts"), handler: async (ctx, args) => {
  requireDemoDeployment();
  const p = await ctx.db.query("accessPolicy").withIndex("by_key", q => q.eq("key", "staff-access")).unique();
  if (p?.classification !== DEMO.classification || p.developmentPolicyReference !== DEMO.policyReference || p.developmentSetupReference !== args.setupReference || p.manualVerificationEnabled || p.developmentReviewEnabled !== true || p.version !== POLICY_VERSION) deny("Prepared development policy is required.");
  const department = await ctx.db.query("departments").withIndex("by_code", q => q.eq("code", DEMO.departmentCode)).unique();
  if (!department?.active || department.classification !== DEMO.classification) deny("Prepared development department is required.");
  const r = await ctx.db.get(args.applicationId);
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN?.replace(/\/$/, "");
  if (!issuer || !r || !r.emailVerified || r.email !== DEMO.email || !r.clerkUserId.startsWith("user_") || r.clerkUserId !== args.clerkUserId
    || r.identity !== `${issuer}|${args.clerkUserId}` || r.classification !== DEMO.classification || r.departmentId !== department._id
    || r.fullName !== DEMO.name || r.requestedStaffId !== DEMO.staffId || r.requestedRole !== "Administrator") deny("The actual intended verified Clerk applicant is required.");
  if (p.bootstrapCompletedAt !== undefined) {
    const original = p.bootstrapAccountId ? await ctx.db.get(p.bootstrapAccountId) : null;
    if (p.bootstrapApplicationId !== r._id || !original || original.clerkUserId !== args.clerkUserId || original.identity !== r.identity || original.classification !== DEMO.classification || r.accountId !== original._id) deny("Development bootstrap is closed.");
    // Receipt acknowledgement only: never recreate, change grants, or lift suspension.
    return original._id;
  }
  if (r.status !== "pending" || await ctx.db.query("staffAccounts").first()) deny("Development bootstrap is closed or applicant changed.");
  const now = Date.now();
  const id = await ctx.db.insert("staffAccounts", { identity: r.identity, clerkUserId: r.clerkUserId, email: r.email, fullName: DEMO.name, verifiedStaffId: DEMO.staffId,
    classification: DEMO.classification, departmentId: department._id, role: "Administrator", systemRole: "SYSTEM_ADMINISTRATOR",
    capabilities: allowedRoleCapabilities("Administrator", DEMO.classification), scope: [department._id], grantableRoles: [...roles], status: "approved", approvedAt: now, revision: 1, createdAt: now, updatedAt: now });
  await ctx.db.insert("staffVerifications", { requestId: r._id, classification: DEMO.classification, outcome: "verified", verifiedStaffId: DEMO.staffId, verifiedFullName: DEMO.name,
    departmentId: department._id, evidenceReference: `${args.setupReference}: development declaration only; not institutional evidence`, policyReference: DEMO.policyReference, operator: true, at: now });
  await ctx.db.patch(r._id, { status: "approved", verificationStatus: "verified", accountId: id, reviewedAt: now, revision: r.revision + 1 });
  await ctx.db.patch(p._id, { bootstrapCompletedAt: now, bootstrapApplicationId: r._id, bootstrapAccountId: id });
  await audit(ctx, null, "demo.bootstrap", id, `${args.setupReference}: verified Clerk identity; demo staff declaration, not institutional approval`, department._id, undefined, "SYSTEM_ADMINISTRATOR");
  const item = await ctx.db.query("equipment").withIndex("by_asset", q => q.eq("assetId", "IT-DEMO-FICTIONAL-001")).unique();
  if (!item || item.departmentId !== department._id) deny("Prepared fictional sample is required.");
  const reportId = await ctx.db.insert("faultReports", { equipmentId: item._id, departmentId: department._id, reporterId: id, operationId: DEMO.setupReference,
    category: "Electrical/Power", symptoms: "FICTIONAL DEMO: training monitor will not power on", description: "Synthetic training record. No patient or real equipment involved.", priority: "Routine", condition: "Unknown", inUse: false, noticedAt: now, createdAt: now });
  const taskId = await ctx.db.insert("maintenanceTasks", { equipmentId: item._id, departmentId: department._id, reportId, state: "Assigned", assigneeId: id,
    dueAt: now + 7 * 86400000, diagnosis: "", notes: "FICTIONAL DEMO training task; clinical verification and release disabled.", parts: [], cycle: 1, revision: 1, createdAt: now, updatedAt: now });
  await audit(ctx, null, "demo.workflows", taskId, `${args.setupReference}: fictional report and assigned maintenance training task`, department._id);
  return id;
} });
