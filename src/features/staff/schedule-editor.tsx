import { useRef, useState } from 'react';
import { Card, Detail, Field, Notice } from '@/components/smart/ui';
import { DateTimeField } from '@/components/smart/date-time-field';
import { ScheduleActivityAction } from '@/components/smart/schedule-activity';
import { requireReviewedSchedule, reviewSchedule, scheduleEditor, scheduleNeedsReview, type ScheduleSnapshot } from '@/domain/schedule-editor';
import { ConfirmAction } from './ui';

export function ScheduleEditorControls({ schedule, createTask, saveDate, setActivity }: {
  schedule: ScheduleSnapshot;
  createTask: () => Promise<unknown>;
  saveDate: (date: number, reason: string) => Promise<unknown>;
  setActivity: (active: boolean, reason: string) => Promise<unknown>;
}) {
  const [editor, setEditor] = useState(() => scheduleEditor(schedule));
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const changed = scheduleNeedsReview(editor, schedule);
  const run = async (action: () => Promise<unknown>) => {
    if (pending.current) return;
    requireReviewedSchedule(editor, schedule);
    pending.current = true; setBusy(true);
    try { await action(); } finally { pending.current = false; setBusy(false); }
  };
  return <>
    {changed && <Card style={{ gap: 12 }}>
      <Notice tone="warning">This schedule changed. Your prepared date and justification are retained. Review the current schedule before creating a task or changing its date or activity.</Notice>
      <Detail label="Reviewed / current revision" value={`${editor.reviewed.revision} / ${schedule.revision}`} />
      <Detail label="Previously reviewed activity" value={editor.reviewed.active ? 'Active' : 'Paused'} />
      <Detail label="Current activity" value={schedule.active ? 'Active' : 'Paused'} />
      <Detail label="Previously reviewed next due" value={new Date(editor.reviewed.nextDueAt).toLocaleString()} />
      <Detail label="Current next due" value={new Date(schedule.nextDueAt).toLocaleString()} />
      <Detail label="Your prepared next due" value={Number.isFinite(Date.parse(editor.due)) ? new Date(editor.due).toLocaleString() : 'Choose a date'} />
      <Detail label="Your prepared justification" value={editor.reason || 'Not entered'} />
      <ConfirmAction key={`keep:${schedule.revision}`} label="Keep prepared schedule fields" title="Use these fields with the current schedule?" detail="The prepared date and justification stay in this form. No task, date or activity change is submitted by this review." disabled={busy} onConfirm={async () => setEditor(prior => reviewSchedule(prior, schedule, true))} />
      <ConfirmAction key={`load:${schedule.revision}`} label="Load current schedule date" title="Replace prepared date and justification?" detail="The current recorded due date replaces your prepared date, and the justification is cleared. This does not change the server." disabled={busy} onConfirm={async () => setEditor(prior => reviewSchedule(prior, schedule, false))} />
    </Card>}
    <ConfirmAction key={`create:${schedule.revision}`} label="Create scheduled task" title="Create preventive maintenance task?" detail="The occurrence is deduplicated and the next scheduled date advances. Technician assignment remains required." disabled={busy || changed || !schedule.active} onConfirm={() => run(createTask)} />
    <DateTimeField label="Rescheduled next due" value={editor.due} onChange={due => setEditor(prior => ({ ...prior, due }))} disabled={busy} />
    <Field label="Rescheduling / pause reason" value={editor.reason} onChangeText={reason => setEditor(prior => ({ ...prior, reason }))} maxLength={500} editable={!busy} />
    <ConfirmAction key={`date:${schedule.revision}`} label="Save next due date" title="Reschedule future maintenance?" detail="Existing work orders retain their own due dates." disabled={busy || changed || !editor.reason.trim() || !Number.isFinite(Date.parse(editor.due))} onConfirm={() => run(() => saveDate(Date.parse(editor.due), editor.reason))} />
    <ScheduleActivityAction active={schedule.active} revision={schedule.revision} reason={editor.reason} disabled={busy || changed} onChange={active => run(() => setActivity(active, editor.reason))} />
  </>;
}
