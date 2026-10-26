import type { Role, Capability } from "./models";
export const POLICY_VERSION = "smartmaint-role-policy-v1";
// Proposal from PLAN.md. An authorized operator must approve this exact version on the backend.
export const roleCapabilities: Record<Role, Capability[]> = {
  Clinician: ["report", "clinical"],
  "Biomedical Technician": ["report", "repair", "technical", "triage", "reconcile"],
  "Unit Head": ["report", "assign", "triage", "hold", "analytics"],
  "Maintenance Supervisor": ["report", "assign", "triage", "hold", "analytics"],
  "Equipment Department Head": ["analytics", "export"],
  "Technical Services Director": ["analytics", "export"],
  Administrator: ["accounts", "roles", "suspend", "reconcile", "audit", "analytics", "export"],
  "Registration Approver": ["accounts"],
};

/** Server must independently validate the deployment and demo record markers. */
export function allowedRoleCapabilities(role: Role, classification?: "development-demo"): Capability[] {
  return classification === "development-demo" && role === "Administrator"
    ? [...roleCapabilities.Administrator, "report", "assign", "repair", "triage"]
    : roleCapabilities[role];
}
