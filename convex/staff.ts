import { v } from "convex/values";
import { query, mutation } from "./lib/server";
import { identity, requiredText, staffId, activeDepartment, audit, deny, POLICY_VERSION, roleCapabilities } from "./lib/access";
import { role } from "./lib/validators";

export const departments = query({ args: {}, handler: async (ctx) => {
  await identity(ctx);
  return (await ctx.db.query("departments").collect()).filter((d) => d.active).map((d) => ({ id: d._id, name: d.name, label: `${d.name} · ${d.code}` }));
} });

export const resolve = query({ args: { cacheKey: v.optional(v.string()) }, handler: async (ctx, args) => {
  if (args.cacheKey && args.cacheKey.length > 100) deny("Invalid resolution request.");
  const user = await ctx.auth.getUserIdentity();
  if (!user) return { status: "unauthenticated" as const };
  if (user.emailVerified !== true || typeof user.email !== "string") return { status: "identity_unverified" as const };
  const account = await ctx.db.query("staffAccounts").withIndex("by_identity", (q) => q.eq("identity", user.tokenIdentifier)).unique();
  const request = await ctx.db.query("registrationRequests").withIndex("by_identity", (q) => q.eq("identity", user.tokenIdentifier)).unique();
  if (account && account.status !== "approved") return { status: account.status };
  const policy = await ctx.db.query("accessPolicy").withIndex("by_key", (q) => q.eq("key", "staff-access")).unique();
  if (account) {
    if (!policy || policy.version !== POLICY_VERSION) return { status: "unconfigured" as const };
    const allowed = roleCapabilities[account.role];
    if (account.clerkUserId !== user.subject || !allowed || !account.scope.length || account.scope.length > 20 || !account.scope.includes(account.departmentId)
      || new Set(account.scope).size !== account.scope.length || new Set(account.capabilities).size !== account.capabilities.length
      || account.capabilities.some((c) => !allowed.includes(c))) return { status: "authorization_error" as const };
    for (const id of [account.departmentId, ...account.scope]) if (!(await ctx.db.get(id))?.active) return { status: "authorization_error" as const };
    return { status: "approved" as const, account: {
      id: account._id, name: account.fullName, staffId: account.verifiedStaffId, email: user.email,
      departmentId: account.departmentId, role: account.role, capabilities: account.capabilities,
      scope: account.scope, grantableRoles: account.grantableRoles, revision: account.revision,
    } };
  }
  if (!request) return { status: "no_application" as const };
  const department = await ctx.db.get(request.departmentId);
  return { status: request.status === "approved" ? "authorization_error" as const : request.status, application: {
    id: request._id, fullName: request.fullName, staffId: request.requestedStaffId, email: request.email,
    departmentId: request.departmentId, department: department?.name ?? "Unavailable department", requestedRole: request.requestedRole,
    verificationStatus: request.verificationStatus, submittedAt: request.submittedAt, revision: request.revision,
    rejectionReason: request.rejectionReason,
  } };
} });

export const submit = mutation({ args: {
  fullName: v.string(), staffId: v.string(), departmentId: v.id("departments"), requestedRole: role,
  previousRevision: v.optional(v.number()),
}, handler: async (ctx, args) => {
  const user = await identity(ctx);
  const name = requiredText(args.fullName, "full name", 120);
  const normalizedId = staffId(args.staffId);
  await activeDepartment(ctx, args.departmentId);
  if (await ctx.db.query("staffAccounts").withIndex("by_identity", (q) => q.eq("identity", user.tokenIdentifier)).unique()) deny("This identity already has a staff account. Contact an administrator.");
  if (await ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", normalizedId)).first()) deny("This Staff ID cannot be used. Contact an administrator.");
  const old = await ctx.db.query("registrationRequests").withIndex("by_identity", (q) => q.eq("identity", user.tokenIdentifier)).unique();
  if (old?.status === "pending") {
    if (old.fullName === name && old.requestedStaffId === normalizedId && old.departmentId === args.departmentId && old.requestedRole === args.requestedRole) return old._id;
    deny("A pending application already exists. It cannot be replaced during review.");
  }
  const data = { identity: user.tokenIdentifier, clerkUserId: user.subject, email: user.email, emailVerified: true,
    fullName: name, requestedStaffId: normalizedId, departmentId: args.departmentId, requestedRole: args.requestedRole,
    status: "pending" as const, verificationStatus: "unverified" as const, submittedAt: Date.now(), revision: (old?.revision ?? 0) + 1,
  };
  let id;
  if (old) {
    if (old.status !== "rejected" || args.previousRevision !== old.revision) deny("Application changed. Refresh before resubmitting.");
    id = old._id;
    await ctx.db.replace(id, data);
  } else id = await ctx.db.insert("registrationRequests", data);
  await audit(ctx, null, "application.submit", id, "Authenticated staff application submitted", args.departmentId, old?.status, "pending", "applicant");
  return id;
} });
