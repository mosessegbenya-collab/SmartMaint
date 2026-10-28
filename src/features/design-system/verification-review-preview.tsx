import { useState } from 'react';
import { Button, Detail, Notice, Screen } from '@/components/smart/ui';
import { VerificationEditorControls } from '@/features/staff/verification-editor';

export function VerificationReviewPreview() {
  const [current, setCurrent] = useState({ task: { _id: 'FICTIONAL-REPAIR', revision: 1, state: 'Completed', diagnosis: 'Fictional initial findings', cycle: 1 }, policy: { id: 'FICTIONAL-POLICY-1', approvalReference: 'FICTIONAL COMPONENT EXAMPLE ONLY', checks: ['Fictional component check'] } });
  const [writes, setWrites] = useState(0);
  return <Screen title="Verification revision review" subtitle="Development component reference">
    <Notice>Fictional local data only. These controls do not approve policy, perform safety checks, contact the server or release equipment.</Notice>
    <Button label="Simulate repair change" onPress={() => setCurrent(prior => ({ ...prior, task: { ...prior.task, revision: prior.task.revision + 1, diagnosis: 'Fictional updated repair findings' } }))} />
    <Button label="Simulate policy replacement" variant="secondary" onPress={() => setCurrent(prior => ({ ...prior, policy: { ...prior.policy, id: `${prior.policy.id}-next`, approvalReference: 'FICTIONAL REPLACEMENT EXAMPLE ONLY' } }))} />
    <Detail label="Sample decision callbacks" value={String(writes)} />
    <VerificationEditorControls current={current} independent onSubmit={async () => { setWrites(n => n + 1); return 'FICTIONAL-LOCAL-RECEIPT'; }} />
  </Screen>;
}
