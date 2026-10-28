import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Detail, Field, Notice, Screen } from '@/components/smart/ui';
import { hasUnsavedWork, workFields, workRevision, type WorkSource } from '@/domain/work-editor';
import { useWorkExit } from '@/hooks/use-work-exit';
import { WorkRevisionReview } from '@/features/staff/work-revision-review';

const initial: WorkSource = { _id: 'FICTIONAL-WORK-ORDER', revision: 1, workflowRevision: 1, diagnosis: 'Fictional monitor restarts', diagnosisEvidence: 'Training measurement record', causeAssessment: 'Suspected cause', notes: 'Initial training inspection', parts: ['Training fuse'], preventiveChecklist: ['Inspect cable', 'Check alarm'] };

export function WorkEditorPreview() {
  const [current, setCurrent] = useState(initial);
  const [reviewed, setReviewed] = useState(initial);
  const [local, setLocal] = useState(() => workFields(initial));
  const [canRepair, setCanRepair] = useState(true);
  const [recorded, setRecorded] = useState(() => workFields(initial));
  const [saving, setSaving] = useState(false);
  const dirty = hasUnsavedWork(local, recorded);
  const exitDialog = useWorkExit(dirty, saving);
  const changed = workRevision(current) !== workRevision(reviewed);
  return <Screen title="Work editor review" subtitle="Development component reference">
    {exitDialog}
    <Notice>Fictional work only. No server, device draft or maintenance record is changed.</Notice>
    <Detail label="Local work" value={dirty ? 'Unsaved changes' : 'No unsaved changes'} />
    <Button label="Make sample edit" disabled={saving} onPress={() => setLocal(prior => ({ ...prior, notes: 'Unsaved fictional repair findings' }))} />
    <Button label={saving ? 'Finish sample save' : 'Start sample save'} variant="secondary" onPress={() => { if (saving) setRecorded(local); setSaving(!saving); }} />
    <Button label="Leave work preview" variant="secondary" onPress={() => router.replace('/design-system')} />
    <Field label="Sample unsaved work notes" editable={!saving} value={local.notes} onChangeText={notes => setLocal(prior => ({ ...prior, notes }))} multiline maxLength={4000} />
    <Button label="Simulate server work update" onPress={() => setCurrent(prior => ({ ...prior, revision: prior.revision + 1, diagnosis: 'Fictional server diagnosis changed', notes: 'Another training session recorded new findings', parts: ['Training cable'], preventiveResults: [{ label: 'Inspect cable', passed: true }, { label: 'Check alarm', passed: false }] }))} />
    <Button label="Simulate reassignment" variant="secondary" onPress={() => { setCanRepair(false); setCurrent(prior => ({ ...prior, revision: prior.revision + 1 })); }} />
    <Detail label="Local work notes retained" value={local.notes || 'Not recorded'} />
    {changed ? <WorkRevisionReview reviewed={reviewed} current={current} local={local} canRepair={canRepair} busy={saving} keepLocal={() => { setReviewed(current); setRecorded(workFields(current)); }} loadServer={() => { setLocal(workFields(current)); setRecorded(workFields(current)); setReviewed(current); }} /> : <Notice tone={canRepair ? 'info' : 'warning'}>{canRepair ? 'Sample revision reviewed. Sample save controls only acknowledge local fictional fields.' : 'Sample assignment changed. Recording work is unavailable.'}</Notice>}
  </Screen>;
}
