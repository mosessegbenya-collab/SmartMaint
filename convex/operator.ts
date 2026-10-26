import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { roles } from "../src/domain/models";
import { activeDepartment, requiredText, staffId, policy, audit, deny, POLICY_VERSION, roleCapabilities } from "./lib/access";

// No public wrappers, HTTP endpoints or scheduled callers expose these functions.
// Deployment/dashboard operator authority is required; never run from the mobile client.
export const configureDepartments = internalMutation({ args: {
  departments: v.array(v.object({ code: v.string(), name: v.string() })), authorizationReference: v.string(),
}, handler: async (ctx, args) => {
  const reason = requiredText(args.authorizationReference, "operator authorization reference");
  if (!args.departments.length || args.departments.length > 20) deny("Supply 1–20 approved departments.");
  const ids = [];
  for (const item of args.departments) {
    const code = requiredText(item.code, "department code", 40).toUpperCase();
    const name = requiredText(item.name, "department name", 100);
    const existing = await ctx.db.query("departments").withIndex("by_code", (q) => q.eq("code", code)).unique();
    const id = existing?._id ?? await ctx.db.insert("departments", { code, name, active: true });
    if (existing && existing.name !== name) deny("Existing department differs. Use an approved migration procedure.");
    ids.push(id);
    if (!existing) await audit(ctx, null, "operator.department", id, reason, id, undefined, "active");
  }
  return ids;
} });

export const configurePolicy = internalMutation({ args: {
  approvedRolePolicyVersion: v.string(), institutionalPolicyReference: v.string(), manualVerificationEnabled: v.boolean(),
}, handler: async (ctx, args) => {
  if (args.approvedRolePolicyVersion !== POLICY_VERSION) deny("Review and approve the exact role/capability policy version.");
  const reference = requiredText(args.institutionalPolicyReference, "approved institutional policy reference");
  const existing = await ctx.db.query("accessPolicy").withIndex("by_key", (q) => q.eq("key", "staff-access")).unique();
  const data = { key: "staff-access" as const, version: POLICY_VERSION, institutionalPolicyReference: reference, manualVerificationEnabled: args.manualVerificationEnabled, configuredAt: Date.now() };
  if (existing) await ctx.db.patch(existing._id, data);
  else await ctx.db.insert("accessPolicy", data);
  await audit(ctx, null, "operator.policy", "staff-access", reference, undefined, existing?.institutionalPolicyReference, reference);
} });

export const bootstrapAdministrator = internalMutation({ args: {
  applicationId: v.id("registrationRequests"), clerkUserId: v.string(), institutionalAuthorizationReference: v.string(),
  verifiedStaffId: v.string(), verifiedFullName: v.string(), scope: v.array(v.id("departments")),
}, returns: v.id("staffAccounts"), handler: async (ctx, args) => {
  const currentPolicy = await policy(ctx);
  if (!currentPolicy.manualVerificationEnabled) deny("Approved institutional verification policy is required before bootstrap.");
  const intendedSubject = process.env.SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT;
  const approvedReference = process.env.SMARTMAINT_BOOTSTRAP_AUTHORIZATION_REFERENCE;
  if (!intendedSubject || !approvedReference || args.institutionalAuthorizationReference !== approvedReference) deny("Explicit operator bootstrap authorization is not configured.");
  const request = await ctx.db.get(args.applicationId);
  if (!request || !request.emailVerified || request.clerkUserId !== intendedSubject || args.clerkUserId !== intendedSubject
    || request.email.trim().toLowerCase() !== "moses.segbenya@ucc.edu.gh") deny("Bootstrap requires the allowlisted, authenticated and email-verified applicant.");
  // A retry acknowledges only the original grant; it never restores or changes access.
  if (currentPolicy.bootstrapCompletedAt !== undefined) {
    const original = currentPolicy.bootstrapAccountId ? await ctx.db.get(currentPolicy.bootstrapAccountId) : null;
    if (currentPolicy.bootstrapApplicationId !== request._id || !original || request.accountId !== original._id
      || original.clerkUserId !== intendedSubject || original.identity !== request.identity
      || original.systemRole !== "SYSTEM_ADMINISTRATOR" || original.verifiedStaffId !== staffId(args.verifiedStaffId)
      || original.fullName !== args.verifiedFullName.trim() || original.scope.length !== args.scope.length
      || original.scope.some((id) => !args.scope.includes(id))) deny("First-administrator bootstrap is already closed.");
    return original._id;
  }
  if (await ctx.db.query("staffAccounts").first()) deny("First-administrator bootstrap is already closed.");
  if (request.status !== "pending") deny("Bootstrap requires a pending application.");
  const verifiedStaffId = staffId(args.verifiedStaffId);
  if (verifiedStaffId !== request.requestedStaffId) deny("Verified institutional identity must match the applicant.");
  if (!args.scope.length || args.scope.length > 20 || !args.scope.includes(request.departmentId) || new Set(args.scope).size !== args.scope.length) deny("Supply explicit authorized department scope.");
  for (const id of args.scope) await activeDepartment(ctx, id);
  const fullName = requiredText(args.verifiedFullName, "verified full name", 120);
  const now = Date.now();
  const id = await ctx.db.insert("staffAccounts", { identity: request.identity, clerkUserId: request.clerkUserId, email: request.email,
    verifiedStaffId, fullName, departmentId: request.departmentId, role: "Administrator", systemRole: "SYSTEM_ADMINISTRATOR", capabilities: roleCapabilities.Administrator,
    scope: args.scope, grantableRoles: [...roles], status: "approved", approvedAt: now, revision: 1, createdAt: now, updatedAt: now,
  });
  await ctx.db.insert("staffVerifications", { requestId: request._id, outcome: "verified", verifiedStaffId, verifiedFullName: fullName,
    departmentId: request.departmentId, evidenceReference: approvedReference, policyReference: currentPolicy.institutionalPolicyReference, operator: true, at: now,
  });
  await ctx.db.patch(request._id, { status: "approved", verificationStatus: "verified", accountId: id, reviewedAt: now, revision: request.revision + 1 });
  await ctx.db.patch(currentPolicy._id, { bootstrapCompletedAt: now, bootstrapApplicationId: request._id, bootstrapAccountId: id });
  await audit(ctx, null, "operator.bootstrap", id, approvedReference, request.departmentId, undefined, "SYSTEM_ADMINISTRATOR");
  return id;
} });
