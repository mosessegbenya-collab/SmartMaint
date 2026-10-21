import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { role, capability, accountStatus, requestStatus, priority, verificationStatus, taskStatus } from "./lib/validators";

export default defineSchema({
  departments: defineTable({ name: v.string(), code: v.string(), active: v.boolean() }).index("by_code", ["code"]),
  accessPolicy: defineTable({
    key: v.literal("staff-access"), version: v.string(), manualVerificationEnabled: v.boolean(),
    institutionalPolicyReference: v.string(), configuredAt: v.number(), bootstrapCompletedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
  staffAccounts: defineTable({
    identity: v.string(), clerkUserId: v.string(), email: v.string(), verifiedStaffId: v.string(), fullName: v.string(),
    departmentId: v.id("departments"), role, capabilities: v.array(capability), scope: v.array(v.id("departments")),
    grantableRoles: v.array(role), status: accountStatus,
    approvedBy: v.optional(v.id("staffAccounts")), approvedAt: v.number(),
    statusReason: v.optional(v.string()), statusChangedBy: v.optional(v.id("staffAccounts")), statusChangedAt: v.optional(v.number()),
    revision: v.number(), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_identity", ["identity"]).index("by_clerk_user", ["clerkUserId"]).index("by_staff_id", ["verifiedStaffId"])
    .index("by_department", ["departmentId"]).index("by_role_status", ["role", "status"]),
  registrationRequests: defineTable({
    identity: v.string(), clerkUserId: v.string(), email: v.string(), emailVerified: v.boolean(),
    requestedStaffId: v.string(), fullName: v.string(), departmentId: v.id("departments"), requestedRole: role,
    status: requestStatus, verificationStatus, submittedAt: v.number(), revision: v.number(),
    reviewedAt: v.optional(v.number()), reviewedBy: v.optional(v.id("staffAccounts")),
    rejectionReason: v.optional(v.string()), accountId: v.optional(v.id("staffAccounts")),
  }).index("by_identity", ["identity"]).index("by_status_department", ["status", "departmentId"])
    .index("by_status_department_submitted", ["status", "departmentId", "submittedAt"])
    .index("by_staff_id", ["requestedStaffId"]).index("by_department", ["departmentId"]),
  staffVerifications: defineTable({
    requestId: v.id("registrationRequests"), outcome: v.union(v.literal("verified"), v.literal("failed")),
    verifiedStaffId: v.optional(v.string()), verifiedFullName: v.optional(v.string()), departmentId: v.id("departments"),
    evidenceReference: v.string(), policyReference: v.string(), reviewerId: v.optional(v.id("staffAccounts")),
    operator: v.boolean(), at: v.number(),
  }).index("by_request", ["requestId"]).index("by_staff_id", ["verifiedStaffId"]),
  authorizationAudit: defineTable({
    actorId: v.optional(v.id("staffAccounts")), actorKind: v.union(v.literal("staff"), v.literal("operator"), v.literal("applicant")),
    action: v.string(), target: v.string(), departmentId: v.optional(v.id("departments")), at: v.number(),
    decision: v.union(v.literal("allowed"), v.literal("rejected")),
    from: v.optional(v.string()), to: v.optional(v.string()), reason: v.string(),
  }).index("by_department_at", ["departmentId", "at"]).index("by_target", ["target"]),
  equipment: defineTable({ assetId: v.string(), name: v.string(), model: v.string(), location: v.string(), departmentId: v.id("departments"), identityVerified: v.boolean() })
    .index("by_asset", ["assetId"]).index("by_department", ["departmentId"]),
  faultReports: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), reporterId: v.id("staffAccounts"), operationId: v.string(), category: v.string(), symptoms: v.string(), description: v.string(), priority, triagedPriority: v.optional(priority), triageReason: v.optional(v.string()), condition: v.string(), inUse: v.boolean(), noticedAt: v.number(), createdAt: v.number() })
    .index("by_department", ["departmentId"]).index("by_reporter_operation", ["reporterId", "operationId"]),
  maintenanceTasks: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), reportId: v.id("faultReports"), state: taskStatus, assigneeId: v.optional(v.id("staffAccounts")), dueAt: v.number(), diagnosis: v.string(), notes: v.string(), parts: v.array(v.string()), cycle: v.number(), revision: v.number(), createdAt: v.number(), updatedAt: v.number() })
    .index("by_department", ["departmentId"]).index("by_equipment", ["equipmentId"]).index("by_report", ["reportId"]),
  safetyHolds: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), active: v.boolean(), reason: v.string(), createdBy: v.id("staffAccounts"), createdAt: v.number() })
    .index("by_department", ["departmentId"]).index("by_equipment", ["equipmentId"]),
});
