export const roles = [
  "Clinician",
  "Biomedical Technician",
  "Unit Head",
  "Maintenance Supervisor",
  "Equipment Department Head",
  "Technical Services Director",
  "Administrator",
  "Registration Approver",
] as const;
export type Role = (typeof roles)[number];
export type Capability =
  | "report"
  | "repair"
  | "assign"
  | "triage"
  | "technical"
  | "clinical"
  | "accounts"
  | "roles"
  | "suspend"
  | "reconcile"
  | "audit"
  | "analytics"
  | "export"
  | "hold";
export interface Account {
  id: string;
  name: string;
  role: Role;
  status: "approved" | "pending" | "suspended";
  scope: string[];
  capabilities: Capability[];
}
export type Priority = "Urgent" | "High" | "Routine";
export type SyncState =
  | "Saved locally"
  | "Pending synchronization"
  | "Uploading"
  | "Simulated acknowledgment"
  | "Rejected"
  | "Failed";
export interface Equipment {
  id: string;
  name: string;
  model: string;
  location: string;
  department: string;
  verified: boolean;
  asset: "ventilator" | "pump" | "monitor";
  releasePolicy: boolean;
}
export interface Attachment {
  id: string;
  uri: string;
  status: "Local only" | "Failed";
}
export interface FaultDraft {
  operationId: string;
  equipmentId: string;
  category: string;
  symptoms: string;
  description: string;
  priority: Priority;
  condition: string;
  inUse: boolean | null;
  noticedAt: string;
  photos: Attachment[];
  unverified: boolean;
  provisional?: { type: string; location: string; notes: string };
}
export interface FaultReport extends FaultDraft {
  department: string;
  equipmentProvisional: boolean;
  linkedEquipmentId?: string;
  id: string;
  ownerId: string;
  createdAt: string;
  sync: SyncState;
  triagedPriority?: Priority;
  triageReason?: string;
}
export type TaskState =
  "Unassigned" | "Assigned" | "In progress" | "Completed" | "Cancelled";
export interface MaintenanceTask {
  id: string;
  equipmentId: string;
  reportId: string;
  state: TaskState;
  assigneeId?: string;
  dueAt: string;
  diagnosis: string;
  notes: string;
  parts: string[];
  cycle: number;
  parentId?: string;
}
export type CheckResult = "Pass" | "Fail" | "Unable to Verify";
export interface VerificationAttempt {
  id: string;
  taskId: string;
  cycle: number;
  kind: "technical" | "clinical";
  actorId: string;
  at: string;
  outcome: CheckResult;
  checks: Record<string, CheckResult>;
  reason: string;
}
export interface SafetyHold {
  id: string;
  equipmentId: string;
  active: boolean;
  reason: string;
  actorId: string;
  createdAt: string;
}
export interface AuditEvent {
  id: string;
  actorId: string;
  at: string;
  action: string;
  recordId: string;
}
export interface QueueOperation {
  id: string;
  ownerId: string;
  reportId: string;
  state: SyncState;
  attempts: number;
  nextRetryAt?: string;
  failure?: "transient" | "auth" | "validation" | "permission";
}
export interface Registration {
  id: string;
  name: string;
  email: string;
  staffId: string;
  requestedRole: Role;
  state: "Pending" | "Approved" | "Rejected" | "Suspended";
}
export interface Notification {
  id: string;
  title: string;
  detail: string;
  read: boolean;
  kind: "System" | "Urgent" | "High";
}
export interface DemoState {
  reports: FaultReport[];
  tasks: MaintenanceTask[];
  attempts: VerificationAttempt[];
  holds: SafetyHold[];
  queue: QueueOperation[];
  audit: AuditEvent[];
  applications: Registration[];
  notifications: Notification[];
}
