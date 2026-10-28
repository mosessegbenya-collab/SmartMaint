import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Badge, Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
import { reportRecovery } from "@/services/report-recovery";
import type { RecoveryDraft } from "@/domain/report-recovery";
import { useStaffAccess } from "./provider";
import { authErrorMessage } from "@/features/access/auth-policy";
import { ConfirmAction } from "./ui";

export function DeviceDrafts() {
  const { account } = useStaffAccess();
  const [items, setItems] = useState<RecoveryDraft[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    if (!account || !reportRecovery) return;
    void reportRecovery.list(account.id).then((rows) => { if (current) setItems(rows.filter((row) => account.scope.some((id) => id === row.departmentId))); }).catch((failure) => { if (current) setError(authErrorMessage(failure)); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [account]);
  return <Screen title="Device Draft Recovery" subtitle="Restore private work after fresh staff authorization.">
    <Notice>Device copies are not server receipts. Your current department permissions still apply; expired or revoked access cannot open these records.</Notice>
    {!reportRecovery ? <Notice>Encrypted device recovery is available in the Android/iOS app.</Notice> : loading ? <Notice>Reading encrypted device drafts…</Notice> : <>
      {!!error && <Notice tone="warning">{error}</Notice>}
      {!items.length && !error && <Card><Txt>No device drafts in your current authorized scope.</Txt></Card>}
      {items.map((item) => <Card key={item.operationId} style={{ gap: 12 }}><Badge label="Saved on this device" tone="warning" /><Txt size={18} weight="700">{item.fields.symptoms || "Untitled equipment report"}</Txt><Detail label="Equipment reference" value={item.equipmentId} /><Detail label="Last saved" value={new Date(item.updatedAt).toLocaleString()} /><Detail label="Unsent photos" value={item.photos.length} />
        <Button label="Review and restore" onPress={() => router.push({ pathname: "/flow/[view]", params: { view: item.server ? "resume-report" : item.fields.emergency ? "emergency-form" : "live-report", id: item.server?.id ?? item.equipmentId, recovery: item.operationId } })} />
        <ConfirmAction label="Discard device copy" title="Discard this private device draft?" detail="This removes the selected device fields and pending photos. It does not cancel a queued publication or delete a server report." danger onConfirm={async () => { if (!account || !reportRecovery) return; await reportRecovery.removeDraft(account.id, item.operationId, item); setItems((rows) => rows.filter((row) => row.operationId !== item.operationId)); }} />
      </Card>)}
    </>}
  </Screen>;
}
