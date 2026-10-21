import { ConvexError } from "convex/values";
import type { GenericId } from "convex/values";
import type { Role, Capability } from "../../src/domain/models";
import type { QueryCtx, MutationCtx, AccountDoc } from "./server";
import { roles } from "../../src/domain/models";

import { POLICY_VERSION, roleCapabilities } from "../../src/domain/role-policy";
export { POLICY_VERSION, roleCapabilities } from "../../src/domain/role-policy";
export function deny(message = "Access is not authorized."): never { throw new ConvexError(message); }
export function requiredText(value: string, label: string, max = 160) {
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f]/.test(text)) deny(`Enter a valid ${label}.`);
  return text;
}
export function staffId(value: string) {
  const normalized = requiredText(value, "Staff ID", 64).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9/-]*$/.test(normalized)) deny("Staff ID contains unsupported characters.");
  return normalized;
}
export async function identity(ctx: QueryCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user || !user.subject || !user.tokenIdentifier) deny("Sign in to continue.");
  if (user.emailVerified !== true || typeof user.email !== "string") deny("A verified Clerk email is required.");
  return user as typeof user & { email: string };
}
export async function policy(ctx: QueryCtx) {
  const value = await ctx.db.query("accessPolicy").withIndex("by_key", (q) => q.eq("key", "staff-access")).unique();
  if (!value || value.version !== POLICY_VERSION) deny("Institutional access policy is not configured.");
  return value;
}
export async function activeDepartment(ctx: QueryCtx, id: GenericId<"departments">) {
  const dept = await ctx.db.get(id);
  if (!dept?.active) deny("Department is not authorized.");
  return dept;
}
export async function currentAccount(ctx: QueryCtx) {
  const user = await identity(ctx);
  await policy(ctx);
  const account = await ctx.db.query("staffAccounts").withIndex("by_identity", (q) => q.eq("identity", user.tokenIdentifier)).unique();
  if (!account || account.status !== "approved") deny("An active approved staff account is required.");
  if (account.clerkUserId !== user.subject || !roleCapabilities[account.role] || !account.scope.length || account.scope.length > 20 || !account.scope.includes(account.departmentId)
    || new Set(account.scope).size !== account.scope.length || new Set(account.capabilities).size !== account.capabilities.length
    || account.capabilities.some((c) => !roleCapabilities[account.role].includes(c))) deny("Account authorization is invalid.");
  await activeDepartment(ctx, account.departmentId);
  for (const department of account.scope) await activeDepartment(ctx, department);
  return account;
}
export async function requireAccount(ctx: QueryCtx, capability?: Capability, departmentId?: GenericId<"departments">) {
  const account = await currentAccount(ctx);
  if (capability && !account.capabilities.includes(capability)) deny();
  if (departmentId && !account.scope.includes(departmentId)) deny("Record is outside your department scope.");
  return account;
}
export function inScope(actor: AccountDoc, departments: GenericId<"departments">[]) {
  if (!departments.length || departments.some((d) => !actor.scope.includes(d))) deny("Scope exceeds your authorized departments.");
}
export async function validGrant(ctx: QueryCtx, actor: AccountDoc, primaryRole: Role, capabilities: Capability[], scope: GenericId<"departments">[], grantableRoles: Role[]) {
  if (scope.length > 20 || new Set(grantableRoles).size !== grantableRoles.length) deny("Invalid grant size.");
  if (!actor.grantableRoles.includes(primaryRole)) deny("You cannot grant this role.");
  inScope(actor, scope);
  for (const id of scope) await activeDepartment(ctx, id);
  if (new Set(scope).size !== scope.length || new Set(capabilities).size !== capabilities.length || capabilities.some((c) => !roleCapabilities[primaryRole].includes(c))) deny("Invalid capability or scope grant.");
  if (grantableRoles.length && (!capabilities.includes("accounts") || !actor.capabilities.includes("roles") || grantableRoles.some((r) => !actor.grantableRoles.includes(r)))) deny("Invalid approval delegation.");
  if (primaryRole === "Administrator" && (roleCapabilities.Administrator.some((c) => !capabilities.includes(c)) || roles.some((r) => !grantableRoles.includes(r)))) deny("Administrator must retain the approved administrator capability and delegation set.");
}
export async function audit(ctx: MutationCtx, actor: AccountDoc | null, action: string, target: string, reason: string, departmentId?: GenericId<"departments">, from?: string, to?: string, actorKind: "staff" | "operator" | "applicant" = actor ? "staff" : "operator") {
  await ctx.db.insert("authorizationAudit", { actorId: actor?._id, actorKind, action, target, reason: requiredText(reason, "justification", 500), departmentId, from, to, at: Date.now(), decision: action === "application.reject" ? "rejected" : "allowed" });
}
export async function protectLastAdministrator(ctx: QueryCtx, target: AccountDoc) {
  if (target.role !== "Administrator" || target.status !== "approved") return;
  const admins = await ctx.db.query("staffAccounts").withIndex("by_role_status", (q) => q.eq("role", "Administrator").eq("status", "approved")).collect();
  if (admins.length <= 1) deny("The last active administrator cannot lose access.");
}
