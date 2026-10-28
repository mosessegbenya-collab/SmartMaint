import { useState } from 'react';
import { Card, Detail, Field, Notice, Screen } from '@/components/smart/ui';
import { ScheduleActivityAction, ScheduleStatus } from '@/components/smart/schedule-activity';

const due = Date.UTC(2026, 9, 27, 8);
export function PreventivePreview() {
  const [active, setActive] = useState(true);
  const [revision, setRevision] = useState(1);
  const [reason, setReason] = useState('Fictional training justification');
  const [preparedDate, setPreparedDate] = useState('2026-11-15');
  return <Screen title="Schedule activity" subtitle="Development component reference">
    <Notice>Fictional schedule only. These controls do not change server schedules, work orders or equipment availability.</Notice>
    <Card style={{ gap: 12 }}>
      <ScheduleStatus active={active} nextDueAt={due} now={Date.UTC(2026, 9, 28, 8)} />
      <Detail label="Recorded next due" value={new Date(due).toLocaleString()} />
      <Detail label="Sample revision" value={String(revision)} />
      <Field label="Prepared new date (not saved)" value={preparedDate} onChangeText={setPreparedDate} />
      <Field label="Activity justification" value={reason} onChangeText={setReason} maxLength={500} />
      <ScheduleActivityAction active={active} revision={revision} reason={reason} onChange={async value => { setActive(value); setRevision(prior => prior + 1); }} />
    </Card>
  </Screen>;
}
