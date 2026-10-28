import type { WorkflowTask } from './maintenance-workflow';

export type ReportChronology = { createdAt: number; submittedAt?: number; submissionState?: 'draft' | 'submitted' };
const timestamp = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isFinite(new Date(value).getTime());
export function reportSubmissionAt(report: ReportChronology): number | null {
  return report.submissionState !== 'draft' && timestamp(report.submittedAt) && report.submittedAt >= report.createdAt ? report.submittedAt : null;
}
export type CompletionSource = { state: string; revision: number; createdAt: number; updatedAt: number };
export type CompletionEntry = { state: string; revision: number; at: number; actorId?: string; baseline?: boolean };
export function authoredCompletionAt(task: CompletionSource, entry: CompletionEntry | null): number | null {
  return task.state === 'Completed' && entry?.state === 'Completed' && !!entry.actorId && !entry.baseline && entry.revision === task.revision && timestamp(entry.at) && entry.at >= task.createdAt && entry.at <= task.updatedAt ? entry.at : null;
}
export type StatusEvent = { id: string; at: number; title: string; detail: string; kind: 'repair' | 'hold' | 'resolved' | 'release' | 'report' | 'verification' | 'administrative' };
export function maintenanceTimelineEvents(task: CompletionSource & WorkflowTask & { _id: string; cycle: number; parentTaskId?: string }, entry: CompletionEntry | null): StatusEvent[] {
  const completionAt = authoredCompletionAt(task, entry);
  if (completionAt !== null) {
    const events: StatusEvent[] = [{ id: task._id, at: completionAt, title: 'Repair completion recorded', detail: `Cycle ${task.cycle} · work revision ${task.revision}. Independent verification and equipment release are assessed separately.`, kind: 'repair' }];
    if (task.workflowPhase === 'closed') events.push({ id: `${task._id}:closed`, at: task.updatedAt, title: 'Work order closed', detail: 'Administrative closure recorded. This does not establish equipment availability.', kind: 'administrative' });
    return events;
  }
  return [{ id: task._id, at: task.updatedAt, title: task.state === 'Cancelled' ? 'Work order cancelled' : task.workflowPhase === 'closed' ? 'Work order closed' : task.parentTaskId ? 'Follow-up rework updated' : 'Maintenance record updated', detail: `Cycle ${task.cycle} · ${task.state}. ${task.state === 'Completed' ? 'Completion time is not recorded; this is the record update time.' : 'Record update time.'}`, kind: task.workflowPhase === 'closed' ? 'administrative' : 'repair' }];
}
