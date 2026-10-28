import { useState } from 'react';
import { Button, Detail, Notice, Screen } from '@/components/smart/ui';
import { ReleaseDecisionControls } from '@/features/staff/release-editor';
import type { ReleaseSnapshot } from '@/domain/release-editor';

export function ReleaseReviewPreview() {
  const [current, setCurrent] = useState<ReleaseSnapshot>({ equipmentId: 'FICTIONAL-EQUIPMENT', evidenceSnapshot: 'FICTIONAL-EVIDENCE', expectedTaskRevision: 3, policyReference: 'FICTIONAL COMPONENT EXAMPLE ONLY', blockers: ['An authorized return-to-service decision is required.'], eligible: true, available: false, canRelease: true });
  const [writes, setWrites] = useState(0);
  return <Screen title="Release evidence review" subtitle="Development component reference">
    <Notice>Fictional local data only. No institutional policy is approved, server record changed or equipment released by this preview.</Notice>
    <Button label="Simulate evidence change" onPress={() => setCurrent(prior => ({ ...prior, evidenceSnapshot: `${prior.evidenceSnapshot}-next`, available: false }))} />
    <Button label={current.eligible ? 'Simulate safety hold' : 'Simulate hold resolution'} variant="secondary" onPress={() => setCurrent(prior => ({ ...prior, evidenceSnapshot: `${prior.evidenceSnapshot}-hold`, eligible: !prior.eligible, available: false, blockers: prior.eligible ? ['An active safety hold remains.'] : ['An authorized return-to-service decision is required.'] }))} />
    <Detail label="Sample release callbacks" value={String(writes)} />
    <ReleaseDecisionControls current={current} onRelease={async () => { setWrites(n => n + 1); return 'FICTIONAL-LOCAL-RECEIPT'; }} />
  </Screen>;
}
