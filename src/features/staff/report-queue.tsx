import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState, Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { EncryptedReportQueue, type PendingPublication } from "@/domain/report-queue";
import { PublicationCoordinator, PublicationPaused, duePublication, MAX_PUBLICATION_ATTEMPTS } from "@/domain/publication-coordinator";
import { useCurrentTime } from "@/hooks/use-current-time";
import { staffApi } from "@/services/staff-api";
import { Badge, Button, Card, Detail, Icon, LinkRow, Notice, Row, Screen, Txt } from "@/components/smart/ui";
import { authErrorMessage } from "@/features/access/auth-policy";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";

const queue = new EncryptedReportQueue({ get: (key) => SecureStore.getItemAsync(key), set: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }), remove: (key) => SecureStore.deleteItemAsync(key) }, randomUUID);
type QueueApi = { available: boolean; rows: PendingPublication[]; error: string; publish?: (id: GenericId<"faultReports">, revision: number, attachmentRevision?: number) => Promise<GenericId<"faultReports">>; retry?: (entry: PendingPublication) => Promise<void> };
const Context = createContext<QueueApi>({ available: false, rows: [], error: "" });
export const useReportQueue = () => useContext(Context);
export function ReportQueueBoundary({ children }: { children: ReactNode }) {
  const access = useStaffAccess();
  if (Platform.OS === "web" || access.status !== "approved" || !access.account?.capabilities.includes("report") || !access.connected) return <Context.Provider value={{ available: false, rows: [], error: "" }}>{children}</Context.Provider>;
  return <NativeQueue key={access.account.id} owner={access.account.id}>{children}</NativeQueue>;
}
function NativeQueue({ children, owner }: { children: ReactNode; owner: string }) {
  const publishMutation = useMutation(staffApi.reporting.publish);
  const [rows, setRows] = useState<PendingPublication[]>([]);
  const [error, setError] = useState("");
  const [controller, setController] = useState<PublicationCoordinator | null>(null);
  useEffect(() => {
    let mounted = true;
    let active = AppState.currentState === "active";
    let loaded = false;
    let latest: PendingPublication[] = [];
    const worker = new PublicationCoordinator(queue, owner,
      (entry) => publishMutation({ id: entry.reportId as GenericId<"faultReports">, expectedRevision: entry.expectedRevision, expectedAttachmentRevision: entry.expectedAttachmentRevision ?? 0 }),
      () => mounted && active,
      (items) => { latest = items; if (mounted && active) setRows(items); }, Date.now, authErrorMessage);
    const subscription = AppState.addEventListener("change", (state) => { active = mounted && state === "active"; });
    let timer: ReturnType<typeof setTimeout>;
    const replay = async () => {
      if (!mounted) return;
      if (active) {
        if (!loaded) {
          try { await worker.load(); loaded = true; if (mounted && active) setController(worker); }
          catch (failure) {
            if (!(failure instanceof PublicationPaused)) { if (mounted) setError(authErrorMessage(failure)); return; }
          }
        }
        const entry = latest.find((item) => duePublication(item, Date.now()));
        if (entry) try { await worker.sendEntry(entry.id); } catch (failure) {
          if (mounted && active && !(failure instanceof PublicationPaused)) setError(authErrorMessage(failure));
        }
      }
      if (mounted) timer = setTimeout(() => { void replay(); }, 1000);
    };
    void replay();
    return () => { mounted = false; active = false; clearTimeout(timer); subscription.remove(); };
  }, [owner, publishMutation]);
  return <Context.Provider value={{ available: controller !== null, rows, error,
    publish: async (reportId, revision, attachmentRevision = 0) => { setError(""); if (!controller) throw Error("The private submission queue is not ready."); return await controller.enqueue(reportId, revision, attachmentRevision, randomUUID()) as GenericId<"faultReports">; },
    retry: async (entry) => { setError(""); if (!controller) throw Error("The private submission queue is not ready."); await controller.sendEntry(entry.id); },
  }}>{children}</Context.Provider>;
}

export function ReportQueueScreen({ view = 'sync' }: { view?: string }) {
  const now = useCurrentTime(1000);
  const service = useReportQueue(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const selected = service.rows.filter((row) => view === 'upload-failed' ? row.state === 'FAILED' : view === 'conflict' ? row.state === 'CONFLICT' : view === 'queue' ? row.state !== 'SYNCED' : true);
  const states = [{ state: 'PENDING', title: 'Pending (saved locally)', route: 'queue', icon: 'document-text-outline' }, { state: 'SYNCING', title: 'Uploading', route: 'queue', icon: 'cloud-upload-outline' }, { state: 'FAILED', title: 'Failed', route: 'upload-failed', icon: 'alert-circle-outline' }, { state: 'CONFLICT', title: 'Conflicts', route: 'conflict', icon: 'sync-outline' }] as const;
  return <Screen title={view === 'upload-failed' ? 'Upload Failed' : view === 'conflict' ? 'Sync Conflict' : view === 'queue' ? 'Pending Sync Queue' : 'Sync Status'} subtitle={view === 'sync' ? 'View the current sync status and pending items.' : view === 'queue' ? 'Report submissions awaiting a server receipt.' : view === 'conflict' ? 'Review changed revisions before submitting again.' : 'Server receipt was not confirmed for these attempts.'}>
    <Notice tone={service.available ? 'success' : 'warning'}>{service.available ? 'Secure submission queue available for this approved account.' : 'Secure queue unavailable. Reconnect with an approved account on Android or iOS.'}</Notice>
    {!!(error || service.error) && <Notice tone="warning">{error || service.error}</Notice>}
    {view === 'sync' && <Card style={{ gap: 14 }}><Txt size={21} weight="700">Pending items</Txt>{states.map((item) => <LinkRow key={item.state} title={item.title} icon={item.icon} tail={<Badge label={String(service.rows.filter((r) => r.state === item.state).length)} tone={item.state === 'FAILED' ? 'danger' : 'info'} />} onPress={() => go(item.route)} />)}</Card>}
    {service.available && !selected.length && <Card><Txt muted>{view === 'conflict' ? 'No conflicting submissions.' : view === 'upload-failed' ? 'No failed submissions.' : 'No pending submissions in this selection.'}</Txt></Card>}
    {selected.map((r) => view === 'conflict' ? <PublicationConflict key={r.id} entry={r} /> : <Card key={r.id} style={{ gap: 12 }}><Row><Icon name={r.state === 'SYNCED' ? 'checkmark-circle' : r.state === 'FAILED' ? 'alert-circle' : 'cloud-upload-outline'} size={34} color={r.state === 'FAILED' ? '#C92E40' : '#0866E8'} /><View style={{ flex: 1, gap: 5 }}><Txt weight="700" size={18}>Fault report</Txt><Badge label={r.state} tone={r.state === 'FAILED' ? 'danger' : r.state === 'SYNCED' ? 'success' : 'warning'} /></View></Row><Detail label="Report" value={r.reportId} /><Detail label="Attempts" value={`${r.retryCount} / ${MAX_PUBLICATION_ATTEMPTS}`} />{!!r.nextRetryAt && <Detail label="Next automatic retry" value={new Date(r.nextRetryAt).toLocaleString()} />}{r.state === "FAILED" && !r.retryable && <Notice tone="warning">Automatic retry stopped. Review the saved draft and current access before submitting again.</Notice>}<Detail label="Last updated" value={new Date(r.updatedAt).toLocaleString()} />{r.state !== 'SYNCED' && <Notice tone="warning">Server receipt not confirmed for this submission attempt.</Notice>}{!!r.lastError && <Notice tone="warning">{r.lastError}</Notice>}{r.state === 'SYNCED' && <Button label="View received report" onPress={() => go('report-detail', r.serverId)} />}{r.state === 'CONFLICT' ? <Button label="Review saved draft conflict" onPress={() => go('conflict')} /> : r.state === 'FAILED' && <Button label="Retry publication" icon="refresh-outline" loading={busy} disabled={!service.available || !service.retry || !duePublication(r, now)} onPress={() => { setBusy(true); void service.retry?.(r).catch((failure) => setError(authErrorMessage(failure))).finally(() => setBusy(false)); }} />}</Card>)}
    <LinkRow title="Recover device drafts and photos" icon="document-text-outline" onPress={() => go("device-drafts")} />
    <Txt size={12} muted>Only a matching server receipt confirms submission. Automatic foreground retries are bounded; conflicts and rejections require review. Safety decisions are never queued offline.</Txt>
  </Screen>;
}
function PublicationConflict({ entry }: { entry: PendingPublication }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: entry.reportId as GenericId<'faultReports'> });
  return <Card style={{ gap: 16 }}><Txt size={20} weight="700">{entry.reportId}</Txt><Row style={{ alignItems: 'flex-start' }}><View style={{ flex: 1, gap: 8 }}><Icon name="phone-portrait-outline" /><Txt weight="700">Local attempt</Txt><Txt muted>Draft revision {entry.expectedRevision}</Txt><Txt muted>Photo revision {entry.expectedAttachmentRevision ?? 0}</Txt><Txt size={12} muted>{new Date(entry.updatedAt).toLocaleString()}</Txt></View><View style={{ flex: 1, gap: 8 }}><Icon name="cloud-outline" /><Txt weight="700">Current server</Txt><Txt muted>{report ? `Draft revision ${report.revision ?? 1}` : 'Loading…'}</Txt><Txt muted>{report ? `Photo revision ${report.attachmentRevision ?? 0}` : 'Loading…'}</Txt><Txt muted>{report?.submissionState === 'draft' ? 'Saved draft' : report ? 'Submitted' : ''}</Txt></View></Row><Notice tone="warning">The saved draft or its photos changed. Review the latest server content before submitting again. This queue does not retain a separate copy of the draft fields.</Notice>{!!entry.lastError && <Txt size={12} muted>{entry.lastError}</Txt>}<Button label="Review latest saved draft" disabled={!report} onPress={() => go('resume-report', entry.reportId)} /></Card>;
}
