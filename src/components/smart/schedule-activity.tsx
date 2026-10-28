import { Badge, Notice } from './ui';
import { preventiveStatus } from '@/domain/preventive-status';
import { ConfirmAction } from '@/features/staff/ui';

export function ScheduleStatus({ active, nextDueAt, now }: { active: boolean; nextDueAt: number; now: number }) {
  const status = preventiveStatus({ active, nextDueAt }, now);
  return <><Badge {...status} />{!active && <Notice>Schedule paused. The recorded due date is retained; existing work orders are not cancelled. Resuming can restore an overdue status.</Notice>}</>;
}

export function ScheduleActivityAction({ active, revision, reason, onChange }: { active: boolean; revision: number; reason: string; onChange: (active: boolean) => Promise<unknown> }) {
  return <ConfirmAction key={`${active}:${revision}`} label={active ? 'Pause schedule' : 'Resume schedule'} title={active ? 'Pause this maintenance schedule?' : 'Resume this maintenance schedule?'} detail="The recorded next due date stays unchanged. Prepared date edits are not applied. Existing work orders are not cancelled, and resuming can restore an overdue status." disabled={!reason.trim()} onConfirm={() => onChange(!active)} />;
}
