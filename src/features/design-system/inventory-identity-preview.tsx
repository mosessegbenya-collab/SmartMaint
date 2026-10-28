import { useState } from 'react';
import { Choices, Detail, Notice, Screen } from '@/components/smart/ui';
import { EquipmentMatchCard } from '@/components/smart/inventory-identity';

export function InventoryIdentityPreview() {
  const [identity, setIdentity] = useState<'Verified' | 'Unverified'>('Unverified');
  const [mode, setMode] = useState<'Review record' | 'Urgent reporting'>('Review record');
  const [continued, setContinued] = useState(0);
  return <Screen title="Inventory match review" subtitle="Development component reference">
    <Notice>Fictional inventory only. These controls do not scan, verify, report or release equipment.</Notice>
    <Choices label="Sample identity" values={['Verified', 'Unverified']} value={identity} onChange={setIdentity} />
    <Choices label="Sample next step" values={['Review record', 'Urgent reporting']} value={mode} onChange={setMode} />
    <EquipmentMatchCard equipment={{ assetId: 'FICTIONAL-MON-001', name: 'Training monitor', model: 'Training model', location: 'Fictional room', identityVerified: identity === 'Verified' }} emergency={mode === 'Urgent reporting'} onContinue={() => setContinued(n => n + 1)} />
    <Detail label="Sample continue callbacks" value={String(continued)} />
  </Screen>;
}
