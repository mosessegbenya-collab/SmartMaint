import { v } from "convex/values";

export const role = v.union(v.literal("Clinician"), v.literal("Biomedical Technician"), v.literal("Unit Head"), v.literal("Maintenance Supervisor"), v.literal("Equipment Department Head"), v.literal("Technical Services Director"), v.literal("Administrator"), v.literal("Registration Approver"));
export const capability = v.union(v.literal("report"), v.literal("repair"), v.literal("assign"), v.literal("triage"), v.literal("technical"), v.literal("clinical"), v.literal("accounts"), v.literal("roles"), v.literal("suspend"), v.literal("reconcile"), v.literal("audit"), v.literal("analytics"), v.literal("export"), v.literal("hold"));
export const accountStatus = v.union(v.literal("approved"), v.literal("suspended"), v.literal("revoked"));
export const requestStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"));
export const priority = v.union(v.literal("Urgent"), v.literal("High"), v.literal("Routine"));
export const verificationStatus = v.union(v.literal("unverified"), v.literal("verified"), v.literal("failed"));
export const taskStatus = v.union(v.literal("Unassigned"), v.literal("Assigned"), v.literal("In progress"), v.literal("Completed"), v.literal("Cancelled"));
