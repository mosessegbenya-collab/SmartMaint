import { Badge, Button, Card, Detail, Notice, Txt } from './ui';

export function InventoryIdentityBadge({ verified }: { verified: boolean }) {
  return <Badge label={verified ? 'Inventory identity verified' : 'Inventory identity unverified'} tone={verified ? 'info' : 'warning'} />;
}

export function EquipmentMatchCard({ equipment, emergency = false, onContinue }: {
  equipment: { assetId: string; name: string; model: string; location: string; identityVerified: boolean };
  emergency?: boolean; onContinue: () => void;
}) {
  return <Card style={{ gap: 12 }}>
    <Txt variant="section">Inventory match</Txt>
    <InventoryIdentityBadge verified={equipment.identityVerified} />
    <Txt size={20} weight="700">{equipment.name}</Txt>
    <Detail label="Asset ID" value={equipment.assetId} />
    <Detail label="Model" value={equipment.model} />
    <Detail label="Recorded location" value={equipment.location} />
    {!equipment.identityVerified && <Notice tone="warning">The identity of this record has not been verified. A search or scan match does not verify the physical equipment.</Notice>}
    <Txt variant="caption" muted>Compare the asset label and recorded details with the physical equipment. Identity verification does not establish availability; review current equipment status before use.</Txt>
    <Button label={emergency ? 'Continue urgent reporting' : 'Review equipment record'} onPress={onContinue} />
  </Card>;
}
