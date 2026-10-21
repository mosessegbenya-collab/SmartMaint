import type { Account, CheckResult, DemoState, Equipment, FaultDraft, FaultReport, MaintenanceTask, Priority } from '../domain/models';

// These are integration contracts, not names of existing Convex functions.
// A future live implementation must derive the actor and scope on the server.
export interface EquipmentService {
  exactLookup(rawIdentifier: string): Promise<Equipment | null>;
  search(query: string): Promise<Equipment[]>;
}
export interface ReportService {
  submit(draft: FaultDraft): Promise<{ report: FaultReport; receipt: 'local' | 'server-confirmed' }>;
  list(): Promise<FaultReport[]>;
  triage(id: string, priority: Priority, reason: string): Promise<void>;
}
export interface MaintenanceService {
  list(): Promise<MaintenanceTask[]>;
  assign(id: string, technicianId: string, dueAt: string): Promise<void>;
  recordWork(id: string, diagnosis: string, notes: string, parts: string[]): Promise<void>;
  complete(id: string, operationId: string): Promise<void>;
}
export interface VerificationService {
  submit(taskId: string, kind: 'technical' | 'clinical', checks: Record<string, CheckResult>, reason: string, operationId: string): Promise<void>;
}
export interface AccountService {
  resolveApprovedAccount(): Promise<Account | null>;
  signOut(): Promise<void>;
}
export interface StateAdapter {
  readonly mode: 'development' | 'live' | 'unconfigured';
  snapshot(): DemoState;
}
