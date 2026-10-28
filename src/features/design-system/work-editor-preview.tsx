import { useState } from 'react';
import { Button, Detail, Field, Notice, Screen } from '@/components/smart/ui';
import { workFields, workRevision, type WorkSource } from '@/domain/work-editor';
import { WorkRevisionReview } from '@/features/staff/work-revision-review';

const initial: WorkSource = { _id: 'FICTIONAL-WORK-ORDER', revision: 1, workflowRevision: 1, diagnosis: 'Fictional monitor restarts', diagnosisEvidence: 'Training measurement record', causeAssessment: 'Suspected cause', notes: 'Initial training inspection', parts: ['Training fuse'], preventiveChecklist: ['Inspect cable', 'Check alarm'] };

export function WorkEditorPreview() {
  const [current, setCurrent] = useState(initial);
  const [reviewed, setReviewed] = useState(initial);
  const [local, setLocal] = useState(() => workFields(initial));
  const [canRepair, setCanRepair] = useState(true);
  const changed = workRevision(current) !== workRevision(reviewed);
  return <Screen title="Work editor review" subtitle="Development component reference">
    <Notice>Fictional work only. No server, device draft or maintenance record is changed.</Notice>
    <Field label="Sample unsaved work notes" value={local.notes} onChangeText={notes => setLocal(prior => ({ ...prior, notes }))} multiline maxLength={4000} />
    <Button label="Simulate server work update" onPress={() => setCurrent(prior => ({ ...prior, revision: prior.revision + 1, diagnosis: 'Fictional server diagnosis changed', notes: 'Another training session recorded new findings', parts: ['Training cable'], preventiveResults: [{ label: 'Inspect cable', passed: true }, { label: 'Check alarm', passed: false }] }))} />
    <Button label="Simulate reassignment" variant="secondary" onPress={() => { setCanRepair(false); setCurrent(prior => ({ ...prior, revision: prior.revision + 1 })); }} />
    <Detail label="Local work notes retained" value={local.notes || 'Not recorded'} />
    {changed ? <WorkRevisionReview reviewed={reviewed} current={current} local={local} canRepair={canRepair} busy={false} keepLocal={() => setReviewed(current)} loadServer={() => { setLocal(workFields(current)); setReviewed(current); }} /> : <Notice tone={canRepair ? 'info' : 'warning'}>{canRepair ? 'Sample revision reviewed. No work has been saved.' : 'Sample assignment changed. Recording work is unavailable.'}</Notice>}
  </Screen>;
}
