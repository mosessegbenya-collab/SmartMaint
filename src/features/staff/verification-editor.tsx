import { useRef, useState } from 'react';
import { Card, Choices, Detail, Field, Notice } from '@/components/smart/ui';
import { DateTimeField } from '@/components/smart/date-time-field';
import { requireReviewedVerification, reviewVerification, verificationEditor, verificationNeedsReview, type VerificationEditor, type VerificationSnapshot } from '@/domain/verification-editor';
import { ConfirmAction } from './ui';

export function VerificationEditorControls({ current, independent, onSubmit, onReceived }: {
  current: VerificationSnapshot;
  independent: boolean;
  onSubmit: (editor: VerificationEditor) => Promise<string>;
  onReceived?: (id: string) => void;
}) {
  const [editor, setEditor] = useState(() => verificationEditor(current));
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState('');
  const pending = useRef(false);
  const changed = verificationNeedsReview(editor, current);
  const policy = editor.reviewed.policy;
  const locked = busy || !!received;
  const invalid = changed || !current.policy || !independent || current.task.state !== 'Completed' ||
    !editor.reference.trim() || (editor.outcome === 'pass'
      ? !policy?.checks.length || policy.checks.some(label => editor.checks[label] !== 'Pass')
      : !editor.notes.trim() || !Number.isFinite(Date.parse(editor.due)));
  return <>
    {changed && !received && <Card style={{ gap: 12 }}>
      <Notice tone="warning">The repair or policy changed. Your findings, evidence reference and rework date are retained. Review the current details and perform all checks again before recording a decision.</Notice>
      <Detail label="Reviewed / current repair revision" value={`${editor.reviewed.task.revision} / ${current.task.revision}`} />
      <Detail label="Previously reviewed diagnosis" value={editor.reviewed.task.diagnosis || 'Not recorded'} />
      <Detail label="Current diagnosis" value={current.task.diagnosis || 'Not recorded'} />
      <Detail label="Previously reviewed policy" value={policy?.approvalReference ?? 'Not configured'} />
      <Detail label="Current policy" value={current.policy?.approvalReference ?? 'Not configured'} />
      {current.policy?.checks.map((label, index) => <Detail key={label} label={`Current check ${index + 1}`} value={label} />)}
      <ConfirmAction key={JSON.stringify(current)} label="Review current repair and reset checks" title="Review this repair and policy?" detail="Your findings, evidence reference, outcome and rework date stay in this form. Every prepared check is reset to Not checked. This review does not record a safety decision." disabled={locked || !current.policy || current.task.state !== 'Completed'} onConfirm={async () => setEditor(prior => reviewVerification(prior, current))} />
    </Card>}
    {!current.policy && <Notice tone="warning">Institutional safety policy is not approved/configured. Verification is disabled. No illustrative checklist is used for a live safety decision.</Notice>}
    {!independent && <Notice tone="warning">Recorded repair contributors cannot verify this work. An independent authorized verifier is required.</Notice>}
    {policy && <>
      <Card style={{ gap: 10 }}><Detail label="Reviewed policy reference" value={policy.approvalReference} /><Detail label="Checks marked pass" value={`${policy.checks.filter(label => editor.checks[label] === 'Pass').length} / ${policy.checks.length}`} /><Notice>Every required check must pass before a pass decision can be recorded. Verification does not release equipment.</Notice></Card>
      {policy.checks.map(label => <Card key={label}><Choices label={label} values={['Not checked', 'Pass', 'Fail']} value={editor.checks[label] ?? 'Not checked'} disabled={locked || changed} onChange={value => setEditor(prior => ({ ...prior, checks: { ...prior.checks, [label]: value } }))} /></Card>)}
    </>}
    <Choices label="Verification outcome" values={['pass', 'fail', 'unable']} value={editor.outcome} disabled={locked} onChange={outcome => setEditor(prior => ({ ...prior, outcome }))} />
    <Field label="Findings / failure or inability reason" value={editor.notes} onChangeText={notes => setEditor(prior => ({ ...prior, notes }))} multiline maxLength={2000} editable={!locked} />
    <Field label="Evidence reference" value={editor.reference} onChangeText={reference => setEditor(prior => ({ ...prior, reference }))} maxLength={500} editable={!locked} />
    {editor.outcome !== 'pass' && <><Notice>A failed/unable decision creates linked rework and blocks return to service.</Notice><DateTimeField label="Required rework due date" value={editor.due} onChange={due => setEditor(prior => ({ ...prior, due }))} required disabled={locked} /></>}
    {!!received && <Notice>Verification recorded: {received}. This receipt does not establish current equipment release.</Notice>}
    <ConfirmAction key={`${current.task.revision}:${current.policy?.id ?? 'disabled'}`} label="Record verification" title="Record this safety decision?" detail="This creates an immutable decision tied to the reviewed policy, repair revision and your account. A pass does not release equipment." disabled={locked || invalid} onConfirm={async () => {
      if (pending.current) return;
      requireReviewedVerification(editor, current);
      if (editor.outcome !== 'pass' && Date.parse(editor.due) <= Date.now()) throw Error('Choose a future due date for linked rework. Your prepared fields are retained.');
      pending.current = true; setBusy(true);
      try { const id = await onSubmit(editor); setReceived(id); onReceived?.(id); }
      finally { pending.current = false; setBusy(false); }
    }} />
  </>;
}
