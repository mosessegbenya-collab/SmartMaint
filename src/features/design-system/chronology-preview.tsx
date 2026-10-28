import { useState } from 'react';
import { Card, Choices, Notice, Screen, Txt } from '@/components/smart/ui';
import { ReportTimingDetails } from '@/components/smart/report-timing';
import { EquipmentEventTimeline } from '@/components/smart/equipment-event-timeline';
import { maintenanceTimelineEvents } from '@/domain/event-chronology';

const createdAt = Date.parse('2026-10-27T08:00:00Z'), submittedAt = Date.parse('2026-10-28T10:00:00Z');
const task = { _id: 'FICTIONAL-TASK', state: 'Completed' as const, workflowPhase: 'closed' as const, revision: 2, createdAt, updatedAt: Date.parse('2026-10-28T14:00:00Z'), cycle: 1 };

export function ChronologyPreview() {
  const [example, setExample] = useState('Recorded event times');
  const older = example === 'Older records';
  const events = maintenanceTimelineEvents(task, older ? null : { state: 'Completed', revision: 2, actorId: 'FICTIONAL-TECHNICIAN', at: submittedAt });
  return <Screen title="Recorded event times" subtitle="Development component reference">
    <Notice>Fictional timestamps only. No report, repair, verification or equipment release is recorded by these controls.</Notice>
    <Choices label="Chronology example" values={['Recorded event times', 'Older records']} value={example} onChange={setExample} />
    <Card style={{ gap: 12 }}><Txt variant="section">Report chronology</Txt><ReportTimingDetails report={{ createdAt, submittedAt: older ? undefined : submittedAt, submissionState: 'submitted' }} /></Card>
    <Notice>Repair completion and administrative closure are separate events. Neither establishes current equipment availability.</Notice>
    <EquipmentEventTimeline events={[...events].sort((a, b) => b.at - a.at)} />
  </Screen>;
}
