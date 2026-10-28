import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Card, Detail, Field, Notice, Txt } from '@/components/smart/ui';
import { StatusPanel } from '@/components/smart/status-ui';
import { releaseEditor, releaseNeedsReview, requireReviewedRelease, reviewRelease, type ReleaseEditor, type ReleaseSnapshot } from '@/domain/release-editor';
import { ConfirmAction } from './ui';

export function ReleaseDecisionControls({ current, onRelease }: {
  current: ReleaseSnapshot;
  onRelease: (editor: ReleaseEditor) => Promise<string>;
}) {
  const [editor, setEditor] = useState(() => releaseEditor(current));
  const [receipt, setReceipt] = useState<{ id: string; evidence: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const changed = releaseNeedsReview(editor, current);
  const receiptCurrent = receipt?.evidence === current.evidenceSnapshot;
  const locked = busy || !!receipt && !changed;
  const confirmationKey = `${current.equipmentId}:${current.evidenceSnapshot}:${current.canRelease}:${current.eligible}`;
  return <View style={{ gap: 14 }}>
    <StatusPanel title={current.available ? 'Released for service' : 'Not released for service'} detail={current.available ? 'The current release decision satisfies the recorded prerequisites. Later faults or safety holds can change this status.' : 'Do not infer availability from a completed repair or an individual verification pass.'} icon={current.available ? 'shield-checkmark' : 'alert-circle'} tone={current.available ? 'success' : 'warning'} />
    <Card style={{ gap: 14 }}>
      <Txt size={20} weight="800">Return-to-service prerequisites</Txt>
      <Detail label="Approved policy" value={current.policyReference ?? 'Not approved/configured'} />
      <Detail label="Current repair revision" value={current.expectedTaskRevision === null ? 'No completed repair' : String(current.expectedTaskRevision)} />
      {current.blockers.map((blocker, index) => <Notice key={blocker} tone="warning">Restriction {index + 1}: {blocker}</Notice>)}
      {current.available && <Notice tone="success">Current release confirmed by the staff service.</Notice>}
      {changed && <>
        <Notice tone="warning">Release evidence changed. Your justification is retained. Review the current prerequisites before authorizing return to service.</Notice>
        <Detail label="Previously reviewed policy" value={editor.reviewed.policyReference ?? 'Not approved/configured'} />
        <Detail label="Previously reviewed repair revision" value={editor.reviewed.expectedTaskRevision === null ? 'No completed repair' : String(editor.reviewed.expectedTaskRevision)} />
        <Detail label="Previously reviewed restrictions" value={editor.reviewed.blockers.join(' ') || 'No outstanding restrictions'} />
        <Notice>Changes to reports, verification evidence, inventory details or safety holds can require review even when the policy reference and repair revision look unchanged.</Notice>
        <ConfirmAction key={`review:${confirmationKey}`} label="Review current release prerequisites" title="Review updated release evidence?" detail="Your prepared justification stays in this form. This review does not release equipment. Current restrictions and institutional authority still apply." disabled={busy || !current.canRelease} onConfirm={async () => { setEditor(prior => reviewRelease(prior, current)); setReceipt(null); }} />
      </>}
      {!!receipt && <Notice tone={receiptCurrent ? 'info' : 'warning'}>{receiptCurrent ? 'Return-to-service decision recorded' : 'Earlier return-to-service decision recorded'}: {receipt.id}. Check the current equipment status above; a receipt does not override later restrictions.</Notice>}
      {(current.canRelease || !!editor.reason) && <Field label="Return-to-service justification" value={editor.reason} onChangeText={reason => setEditor(prior => ({ ...prior, reason }))} maxLength={500} multiline editable={!locked && current.canRelease} />}
      {current.canRelease && !current.available && <ConfirmAction key={`release:${confirmationKey}`} label="Authorize Return to Service" title="Release equipment for service?" detail="All current repairs, verifications, identity and holds are checked atomically by the server against the evidence you reviewed." disabled={locked || changed || !current.eligible || !editor.reason.trim() || current.expectedTaskRevision === null} onConfirm={async () => {
        if (pending.current) return;
        requireReviewedRelease(editor, current);
        pending.current = true; setBusy(true);
        try { const id = await onRelease(editor); setReceipt({ id, evidence: editor.reviewed.evidenceSnapshot }); }
        finally { pending.current = false; setBusy(false); }
      }} />}
    </Card>
  </View>;
}
