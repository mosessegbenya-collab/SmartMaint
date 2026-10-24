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
  faultReports: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), reporterId: v.id("staffAccounts"), operationId: v.string(), category: v.string(), symptoms: v.string(), description: v.string(), priority, triagedPriority: v.optional(priority), triageReason: v.optional(v.string()), condition: v.string(), inUse: v.boolean(), noticedAt: v.number(), createdAt: v.number(), submissionState: v.optional(v.union(v.literal("draft"), v.literal("submitted"))), revision: v.optional(v.number()), attachmentRevision: v.optional(v.number()), emergency: v.optional(v.boolean()) })
    .index("by_department", ["departmentId"]).index("by_equipment", ["equipmentId"]).index("by_reporter_operation", ["reporterId", "operationId"])
    .index("by_department_reporter", ["departmentId", "reporterId"]),
  workEntries: defineTable({ taskId: v.id("maintenanceTasks"), departmentId: v.id("departments"), actorId: v.optional(v.id("staffAccounts")), baseline: v.optional(v.boolean()), revision: v.number(), diagnosis: v.string(), notes: v.string(), parts: v.array(v.string()), state: taskStatus, at: v.number(), preventiveResults: v.optional(v.array(v.object({ label: v.string(), passed: v.boolean() }))) }).index("by_task", ["taskId"]),
  notifications: defineTable({ requestKey: v.optional(v.string()), recipientId: v.id("staffAccounts"), departmentId: v.id("departments"), title: v.string(), body: v.string(), targetKind: v.union(v.literal("task"), v.literal("report"), v.literal("equipment")), targetId: v.string(), createdAt: v.number(), readAt: v.optional(v.number()), dispatchState: v.literal("in_app") }).index("by_recipient", ["recipientId"]).index("by_recipient_read", ["recipientId", "readAt"]).index("by_recipient_request", ["recipientId", "requestKey"]),
  provisionalReports: defineTable({ reporterId: v.id("staffAccounts"), departmentId: v.id("departments"), rawIdentifier: v.string(), equipmentType: v.string(), location: v.string(), symptoms: v.string(), priority, operationId: v.string(), createdAt: v.number(), status: v.literal("unverified") }).index("by_department", ["departmentId"]).index("by_reporter_operation", ["reporterId", "operationId"]),
  reportAttachments: defineTable({ reportId: v.id("faultReports"), departmentId: v.id("departments"), ownerId: v.id("staffAccounts"), storageId: v.id("_storage"), operationId: v.string(), contentType: v.string(), size: v.number(), createdAt: v.number(), deletedAt: v.optional(v.number()) }).index("by_report", ["reportId"]).index("by_owner_operation", ["ownerId", "operationId"]),
  maintenanceTasks: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), reportId: v.optional(v.id("faultReports")), state: taskStatus, assigneeId: v.optional(v.id("staffAccounts")), dueAt: v.number(), diagnosis: v.string(), notes: v.string(), parts: v.array(v.string()), cycle: v.number(), revision: v.number(), createdAt: v.number(), updatedAt: v.number(), parentTaskId: v.optional(v.id("maintenanceTasks")), failureAttemptId: v.optional(v.id("safetyAttempts")), scheduleId: v.optional(v.id("preventiveSchedules")), scheduledDueAt: v.optional(v.number()), preventiveChecklist: v.optional(v.array(v.string())), preventiveResults: v.optional(v.array(v.object({ label: v.string(), passed: v.boolean() }))) })
    .index("by_department", ["departmentId"]).index("by_equipment", ["equipmentId"]).index("by_report", ["reportId"]).index("by_parent", ["parentTaskId"]).index("by_schedule_due", ["scheduleId", "scheduledDueAt"]),
  preventiveSchedules: defineTable({ operationId: v.optional(v.string()), equipmentId: v.id("equipment"), departmentId: v.id("departments"), title: v.string(), approvedReference: v.string(), intervalDays: v.number(), nextDueAt: v.number(), checklist: v.array(v.string()), active: v.boolean(), revision: v.number(), createdBy: v.id("staffAccounts"), createdAt: v.number() }).index("by_department", ["departmentId"]).index("by_creator_operation", ["createdBy", "operationId"]),
  safetyPolicies: defineTable({ departmentId: v.id("departments"), active: v.boolean(), version: v.literal("smartmaint-safety-v1"), approvalReference: v.string(), technicalChecks: v.array(v.string()), clinicalChecks: v.array(v.string()), clinicalRequired: v.boolean(), releaseRoles: v.array(role), configuredAt: v.number() }).index("by_department_active", ["departmentId", "active"]),
  safetyAttempts: defineTable({ taskId: v.id("maintenanceTasks"), equipmentId: v.id("equipment"), departmentId: v.id("departments"), policyId: v.id("safetyPolicies"), taskRevision: v.number(), kind: v.union(v.literal("technical"), v.literal("clinical")), outcome: v.union(v.literal("pass"), v.literal("fail"), v.literal("unable")), checks: v.array(v.object({ label: v.string(), passed: v.boolean() })), notes: v.string(), evidenceReference: v.string(), actorId: v.id("staffAccounts"), at: v.number(), operationId: v.string() }).index("by_task", ["taskId"]).index("by_actor_operation", ["actorId", "operationId"]),
  releaseRecords: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), policyId: v.id("safetyPolicies"), taskId: v.id("maintenanceTasks"), taskRevision: v.number(), technicalAttemptId: v.id("safetyAttempts"), clinicalAttemptId: v.optional(v.id("safetyAttempts")), holdFingerprint: v.optional(v.string()), actorId: v.id("staffAccounts"), reason: v.string(), at: v.number() }).index("by_equipment", ["equipmentId"]),
  safetyHolds: defineTable({ equipmentId: v.id("equipment"), departmentId: v.id("departments"), active: v.boolean(), reason: v.string(), createdBy: v.id("staffAccounts"), createdAt: v.number(), resolvedAt: v.optional(v.number()), resolvedBy: v.optional(v.id("staffAccounts")), resolutionReason: v.optional(v.string()) })
    .index("by_department", ["departmentId"]).index("by_equipment", ["equipmentId"]),
});
