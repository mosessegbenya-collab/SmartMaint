import { v } from "convex/values";
import { query, mutation } from "./lib/server";
import { requireAccount, requiredText, staffId, policy, validGrant, inScope, audit, deny, protectLastAdministrator } from "./lib/access";
import { role, capability, requestStatus, accountStatus } from "./lib/validators";
import type { GenericId } from "convex/values";
import type { QueryCtx } from "./lib/server";
import type { AccountDoc } from "./lib/server";
import { paginationOptsValidator } from "convex/server";

async function applicationAccess(ctx: QueryCtx, id: GenericId<"registrationRequests">) {
  const actor = await requireAccount(ctx, "accounts");
  const request = await ctx.db.get(id);
  if (!request || !actor.scope.includes(request.departmentId)) deny("Application unavailable in your authorized scope.");
  return { actor, request };
}
async function accountAccess(ctx: QueryCtx, id: GenericId<"staffAccounts">, capability: "roles" | "suspend") {
  const actor = await requireAccount(ctx, capability);
  const target = await ctx.db.get(id);
  if (!target) deny("Staff account unavailable in your authorized scope.");
  inScope(actor, [target.departmentId, ...target.scope]);
  return { actor, target };
}
function accountView(r: AccountDoc) {
  return { id: r._id, name: r.fullName, staffId: r.verifiedStaffId, role: r.role, capabilities: r.capabilities, departmentId: r.departmentId, scope: r.scope, grantableRoles: r.grantableRoles, status: r.status, revision: r.revision };
}
function pageSize(numItems: number) { if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 100) deny("Choose a page size between 1 and 100."); }

export const applicationPage = query({ args: { status: requestStatus, departmentId: v.id("departments"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  await requireAccount(ctx, "accounts", args.departmentId);
  pageSize(args.paginationOpts.numItems);
  const department = await ctx.db.get(args.departmentId);
  const result = await ctx.db.query("registrationRequests").withIndex("by_status_department_submitted", (q) => q.eq("status", args.status).eq("departmentId", args.departmentId)).order("desc").paginate({ ...args.paginationOpts, maximumRowsRead: 1000, maximumBytesRead: 1024 * 1024 });
  return { ...result, page: result.page.map((r) => ({ id: r._id, name: r.fullName, staffId: r.requestedStaffId, email: r.email, department: department!.name, departmentId: r.departmentId, requestedRole: r.requestedRole, status: r.status, verificationStatus: r.verificationStatus, submittedAt: r.submittedAt })) };
} });
export const accountPage = query({ args: { departmentId: v.id("departments"), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, undefined, args.departmentId);
  if (!actor.capabilities.includes("roles") && !actor.capabilities.includes("suspend")) deny();
  pageSize(args.paginationOpts.numItems);
  const result = await ctx.db.query("staffAccounts").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).order("desc").paginate({ ...args.paginationOpts, maximumRowsRead: 1000, maximumBytesRead: 1024 * 1024 });
  return { ...result, page: result.page.filter((r) => r.scope.every((d) => actor.scope.includes(d))).map(accountView) };
} });
export const account = query({ args: { id: v.id("staffAccounts") }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.includes("roles") && !actor.capabilities.includes("suspend")) deny();
  const target = await ctx.db.get(args.id);
  if (!target) deny("Staff account unavailable in your authorized scope.");
  inScope(actor, [target.departmentId, ...target.scope]);
  return accountView(target);
} });
export const auditPage = query({ args: { departmentId: v.optional(v.id("departments")), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "audit", args.departmentId);
  if (!args.departmentId && actor.role !== "Administrator") deny();
  pageSize(args.paginationOpts.numItems);
  return await ctx.db.query("authorizationAudit").withIndex("by_department_at", (q) => q.eq("departmentId", args.departmentId)).order("desc").paginate({ ...args.paginationOpts, maximumRowsRead: 1000, maximumBytesRead: 1024 * 1024 });
} });

export const applications = query({ args: { status: requestStatus }, handler: async (ctx, args) => {
  const actor = await requireAccount(ctx, "accounts");
  const lists = await Promise.all(actor.scope.map((departmentId) => ctx.db.query("registrationRequests").withIndex("by_status_department", (q) => q.eq("status", args.status).eq("departmentId", departmentId)).order("desc").take(80)));
  const departments = await Promise.all(actor.scope.map((id) => ctx.db.get(id)));
  return lists.flat().sort((a, b) => b.submittedAt - a.submittedAt).map((r) => ({ id: r._id, name: r.fullName, staffId: r.requestedStaffId, email: r.email, departmentId: r.departmentId, department: departments.find((d) => d?._id === r.departmentId)?.name ?? "Unavailable department", requestedRole: r.requestedRole, status: r.status, verificationStatus: r.verificationStatus, submittedAt: r.submittedAt }));
} });
export const application = query({ args: { id: v.id("registrationRequests") }, handler: async (ctx, { id }) => {
  const { request } = await applicationAccess(ctx, id);
  const conflicts = await ctx.db.query("registrationRequests").withIndex("by_staff_id", (q) => q.eq("requestedStaffId", request.requestedStaffId)).collect();
  const existing = await ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", request.requestedStaffId)).first();
  const verifications = await ctx.db.query("staffVerifications").withIndex("by_request", (q) => q.eq("requestId", id)).collect();
  const history = await ctx.db.query("authorizationAudit").withIndex("by_target", (q) => q.eq("target", id)).collect();
  // No details about out-of-scope identities are exposed through conflict warnings.
  const currentPolicy = await policy(ctx);
  const department = await ctx.db.get(request.departmentId);
  return { ...request, department: department?.name ?? "Unavailable department", verificationEnabled: currentPolicy.manualVerificationEnabled, conflict: !!existing || conflicts.some((r) => r._id !== id && r.status === "pending"), verifications, history };
} });

export const verify = mutation({ args: {
  id: v.id("registrationRequests"), expectedRevision: v.number(), outcome: v.union(v.literal("verified"), v.literal("failed")),
  verifiedStaffId: v.string(), verifiedFullName: v.string(), evidenceReference: v.string(),
}, handler: async (ctx, args) => {
  const { actor, request } = await applicationAccess(ctx, args.id);
  const currentPolicy = await policy(ctx);
  if (!currentPolicy.manualVerificationEnabled) deny("Institutional verification policy is not approved. Verification is disabled.");
  if (actor.identity === request.identity) deny("Self-verification is prohibited.");
  if (request.status !== "pending" || request.revision !== args.expectedRevision) deny("Application changed. Refresh before reviewing.");
  const verifiedStaffId = staffId(args.verifiedStaffId);
  const verifiedFullName = requiredText(args.verifiedFullName, "verified name", 120);
  const evidenceReference = requiredText(args.evidenceReference, "institutional evidence reference", 160);
  if (verifiedStaffId !== request.requestedStaffId) deny("Institutional Staff ID does not match the application.");
  if (args.outcome === "verified" && await ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", verifiedStaffId)).first()) deny("Staff identity is already linked to an account.");
  await ctx.db.insert("staffVerifications", { requestId: request._id, outcome: args.outcome,
    verifiedStaffId: args.outcome === "verified" ? verifiedStaffId : undefined,
    verifiedFullName: args.outcome === "verified" ? verifiedFullName : undefined,
    departmentId: request.departmentId, evidenceReference, policyReference: currentPolicy.institutionalPolicyReference,
    reviewerId: actor._id, operator: false, at: Date.now(),
  });
  await ctx.db.patch(request._id, { verificationStatus: args.outcome, revision: request.revision + 1 });
  await audit(ctx, actor, "application.verify", request._id, `Institutional evidence reference: ${evidenceReference}`, request.departmentId, request.verificationStatus, args.outcome);
} });

export const approve = mutation({ args: {
  id: v.id("registrationRequests"), expectedRevision: v.number(), approvedRole: role,
  capabilities: v.array(capability), scope: v.array(v.id("departments")), grantableRoles: v.array(role), reason: v.string(),
}, handler: async (ctx, args) => {
  const { actor, request } = await applicationAccess(ctx, args.id);
  if (actor.identity === request.identity) deny("Self-approval is prohibited.");
  if (request.status !== "pending" || request.revision !== args.expectedRevision) deny("Application was already reviewed or changed. Refresh.");
  if (request.verificationStatus !== "verified") deny("Institutional identity must be verified before approval.");
  const currentPolicy = await policy(ctx);
  if (!currentPolicy.manualVerificationEnabled) deny("Institutional verification is disabled.");
  const verification = await ctx.db.query("staffVerifications").withIndex("by_request", (q) => q.eq("requestId", request._id)).order("desc").first();
  if (!verification || verification.outcome !== "verified" || !verification.verifiedStaffId || !verification.verifiedFullName) deny("Verified institutional evidence is missing.");
  if (verification.policyReference !== currentPolicy.institutionalPolicyReference) deny("Verification must be repeated under the current approved policy.");
  await validGrant(ctx, actor, args.approvedRole, args.capabilities, args.scope, args.grantableRoles);
  if (!args.scope.includes(request.departmentId)) deny("Scope must include the verified staff department.");
  if (await ctx.db.query("staffAccounts").withIndex("by_staff_id", (q) => q.eq("verifiedStaffId", verification.verifiedStaffId!)).first()
    || await ctx.db.query("staffAccounts").withIndex("by_identity", (q) => q.eq("identity", request.identity)).first()) deny("Institutional identity is already linked to an account.");
  const now = Date.now();
  const id = await ctx.db.insert("staffAccounts", { identity: request.identity, clerkUserId: request.clerkUserId, email: request.email,
    verifiedStaffId: verification.verifiedStaffId, fullName: verification.verifiedFullName, departmentId: request.departmentId,
    role: args.approvedRole, capabilities: args.capabilities, scope: args.scope, grantableRoles: args.grantableRoles,
    status: "approved", approvedBy: actor._id, approvedAt: now, revision: 1, createdAt: now, updatedAt: now,
  });
  await ctx.db.patch(request._id, { status: "approved", accountId: id, reviewedBy: actor._id, reviewedAt: now, revision: request.revision + 1 });
  await audit(ctx, actor, "application.approve", request._id, args.reason, request.departmentId, "pending", "approved");
  await audit(ctx, actor, "account.create", id, args.reason, request.departmentId, undefined, args.approvedRole);
  await audit(ctx, actor, "account.grant", id, args.reason, request.departmentId, undefined, JSON.stringify({ capabilities: args.capabilities, scope: args.scope, grantableRoles: args.grantableRoles }));
  return id;
} });

export const reject = mutation({ args: { id: v.id("registrationRequests"), expectedRevision: v.number(), applicantReason: v.string() }, handler: async (ctx, args) => {
  const { actor, request } = await applicationAccess(ctx, args.id);
  if (actor.identity === request.identity) deny("Self-review is prohibited.");
  if (request.status !== "pending" || request.revision !== args.expectedRevision) deny("Application changed. Refresh.");
  const reason = requiredText(args.applicantReason, "applicant-visible reason", 300);
  await ctx.db.patch(request._id, { status: "rejected", rejectionReason: reason, reviewedBy: actor._id, reviewedAt: Date.now(), revision: request.revision + 1 });
  await audit(ctx, actor, "application.reject", request._id, reason, request.departmentId, "pending", "rejected");
} });

export const accounts = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx);
  if (!actor.capabilities.includes("roles") && !actor.capabilities.includes("suspend")) deny();
  const records = (await Promise.all(actor.scope.map((id) => ctx.db.query("staffAccounts").withIndex("by_department", (q) => q.eq("departmentId", id)).take(100)))).flat();
  return records.filter((r) => r.scope.every((d) => actor.scope.includes(d))).map((r) => ({ id: r._id, name: r.fullName, staffId: r.verifiedStaffId, role: r.role, capabilities: r.capabilities, departmentId: r.departmentId, scope: r.scope, grantableRoles: r.grantableRoles, status: r.status, revision: r.revision }));
} });

export const changeRole = mutation({ args: { id: v.id("staffAccounts"), expectedRevision: v.number(), role, capabilities: v.array(capability), scope: v.array(v.id("departments")), grantableRoles: v.array(role), reason: v.string() }, handler: async (ctx, args) => {
  const { actor, target } = await accountAccess(ctx, args.id, "roles");
  if (target._id === actor._id) deny("You cannot change your own authorization.");
  if (target.revision !== args.expectedRevision || target.status === "revoked") deny("Account changed or revoked. Refresh.");
  await validGrant(ctx, actor, args.role, args.capabilities, args.scope, args.grantableRoles);
  if (!args.scope.includes(target.departmentId)) deny("Scope must include the verified staff department.");
  await protectLastAdministrator(ctx, target);
  await ctx.db.patch(target._id, { role: args.role, capabilities: args.capabilities, scope: args.scope, grantableRoles: args.grantableRoles, revision: target.revision + 1, updatedAt: Date.now() });
  await audit(ctx, actor, "account.role", target._id, args.reason, target.departmentId, target.role, args.role);
  await audit(ctx, actor, "account.scope", target._id, args.reason, target.departmentId, JSON.stringify(target.scope), JSON.stringify(args.scope));
  await audit(ctx, actor, "account.capabilities", target._id, args.reason, target.departmentId, JSON.stringify(target.capabilities), JSON.stringify(args.capabilities));
  await audit(ctx, actor, "account.delegation", target._id, args.reason, target.departmentId, JSON.stringify(target.grantableRoles), JSON.stringify(args.grantableRoles));
} });

export const changeStatus = mutation({ args: { id: v.id("staffAccounts"), expectedRevision: v.number(), status: accountStatus, reason: v.string() }, handler: async (ctx, args) => {
  const { actor, target } = await accountAccess(ctx, args.id, "suspend");
  if (actor._id === target._id) deny("You cannot change your own access status.");
  if (target.revision !== args.expectedRevision || target.status === args.status) deny("Account changed. Refresh.");
  if (target.status === "revoked") deny("Revocation is final. An authorized identity revalidation procedure is required.");
  if (args.status !== "approved") await protectLastAdministrator(ctx, target);
  await ctx.db.patch(target._id, { status: args.status, statusReason: requiredText(args.reason, "justification", 500), statusChangedBy: actor._id, statusChangedAt: Date.now(), revision: target.revision + 1, updatedAt: Date.now() });
  await audit(ctx, actor, "account.status", target._id, args.reason, target.departmentId, target.status, args.status);
} });

export const auditHistory = query({ args: {}, handler: async (ctx) => {
  const actor = await requireAccount(ctx, "audit");
  const scoped = (await Promise.all(actor.scope.map((id) => ctx.db.query("authorizationAudit").withIndex("by_department_at", (q) => q.eq("departmentId", id)).order("desc").take(100)))).flat();
  const operator = actor.role === "Administrator" ? await ctx.db.query("authorizationAudit").withIndex("by_department_at", (q) => q.eq("departmentId", undefined)).order("desc").take(100) : [];
  return [...scoped, ...operator].sort((a, b) => b.at - a.at);
} });
