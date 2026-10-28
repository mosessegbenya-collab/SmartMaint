import { Card, Detail, Notice } from '@/components/smart/ui';
import { WorkFieldComparison } from '@/components/smart/work-field-comparison';
import { workFields, workRevision, type WorkFields, type WorkSource } from '@/domain/work-editor';
import { ConfirmAction } from './ui';

export function WorkRevisionReview({ reviewed, current, local, canRepair, busy, keepLocal, loadServer }: {
  reviewed: WorkSource; current: WorkSource; local: WorkFields; canRepair: boolean; busy: boolean;
  keepLocal: () => void; loadServer: () => void;
}) {
  return <Card style={{ gap: 12 }}>
    <Notice tone="warning">This work order changed while you were editing. Your unsaved details are retained. Review all fields and the current assignment before continuing.</Notice>
    <Detail label="Reviewed work / workflow revision" value={`${reviewed.revision} / ${reviewed.workflowRevision ?? 0}`} /><Detail label="Current work / workflow revision" value={`${current.revision} / ${current.workflowRevision ?? 0}`} />
    <WorkFieldComparison local={local} current={workFields(current)} />
    {canRepair && <ConfirmAction key={`keep:${workRevision(current)}`} label="Keep reviewed local work" title="Keep these local work details?" detail="Your next save will replace the current server work fields with the local details shown here. Review every field, including the checklist. This does not save or complete maintenance." disabled={busy} onConfirm={async () => keepLocal()} />}
    <ConfirmAction key={`load:${workRevision(current)}`} label="Load current server work" title="Replace unsaved work details?" detail="The displayed server work replaces all local work fields and any pending part. This does not change the server." disabled={busy} onConfirm={async () => loadServer()} />
    {!canRepair && <Notice tone="warning">Your current assignment or this task state does not allow recording work. Local details remain available for comparison.</Notice>}
  </Card>;
}
