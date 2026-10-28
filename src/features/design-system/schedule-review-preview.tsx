import { useState } from 'react';
import { Button, Card, Detail, Notice, Screen } from '@/components/smart/ui';
import { ScheduleStatus } from '@/components/smart/schedule-activity';
import { ScheduleEditorControls } from '@/features/staff/schedule-editor';

export function ScheduleReviewPreview() {
  const [schedule, setSchedule] = useState({ _id: 'FICTIONAL-SCHEDULE', revision: 1, active: true, nextDueAt: Date.UTC(2026, 9, 27, 8) });
  const [writes, setWrites] = useState(0);
  return <Screen title="Schedule revision review" subtitle="Development component reference">
    <Notice>Fictional schedule and local callbacks only. No server, private storage or maintenance record is changed.</Notice>
    <Button label="Simulate incoming schedule change" onPress={() => setSchedule(prior => ({ ...prior, revision: prior.revision + 1, active: false, nextDueAt: Date.UTC(2026, 10, 10, 8) }))} />
    <Detail label="Sample action callbacks" value={String(writes)} />
    <Card style={{ gap: 12 }}>
      <ScheduleStatus {...schedule} now={Date.UTC(2026, 9, 28, 8)} />
      <Detail label="Current recorded due" value={new Date(schedule.nextDueAt).toLocaleString()} />
      <ScheduleEditorControls schedule={schedule}
        createTask={async () => { setWrites(n => n + 1); }}
        saveDate={async nextDueAt => { setWrites(n => n + 1); setSchedule(prior => ({ ...prior, nextDueAt, revision: prior.revision + 1 })); }}
        setActivity={async active => { setWrites(n => n + 1); setSchedule(prior => ({ ...prior, active, revision: prior.revision + 1 })); }} />
    </Card>
  </Screen>;
}
