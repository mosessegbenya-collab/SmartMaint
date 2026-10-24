import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { EncryptedReportQueue, publicationFailure, type PendingPublication } from "@/domain/report-queue";
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
  const publishMutation = useMutation(staffApi.reporting.publish); const [rows, setRows] = useState<PendingPublication[]>([]); const [error, setError] = useState("");
  const update = async (change: (items: PendingPublication[]) => PendingPublication[]) => { const items = await queue.update(owner, change); setRows(items); return items; };
  const send = async (entry: PendingPublication) => {
    await update((items) => items.map((r) => r.id === entry.id ? { ...r, state: "SYNCING", retryCount: r.retryCount + 1, lastAttempt: Date.now(), updatedAt: Date.now() } : r));
    try { const id = await publishMutation({ id: entry.reportId as GenericId<"faultReports">, expectedRevision: entry.expectedRevision, expectedAttachmentRevision: entry.expectedAttachmentRevision ?? 0 }); await update((items) => items.map((r) => r.id === entry.id ? { ...r, state: "SYNCED", serverId: id, lastError: undefined, updatedAt: Date.now() } : r)); return id; }
    catch (failure) { const message = authErrorMessage(failure); await update((items) => items.map((r) => r.id === entry.id ? { ...r, state: publicationFailure(failure), lastError: message, updatedAt: Date.now() } : r)); throw failure; }
  };
  useEffect(() => {
    let active = true;
    void (async () => { try { const saved = await queue.load(owner); if (!active) return; setRows(saved); for (const entry of saved.filter((r) => ["PENDING", "SYNCING"].includes(r.state))) { if (!active) break; try { await send(entry); } catch { /* Failure/conflict remains visible; no silent repeated retries. */ } } } catch (failure) { if (active) setError(authErrorMessage(failure)); } })();
    return () => { active = false; };
    // A new instance mounts only after fresh authorization. Reconnect replays idempotent pending publications.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);
  const publish = async (reportId: GenericId<"faultReports">, expectedRevision: number, expectedAttachmentRevision = 0) => {
    const now = Date.now(); const entry: PendingPublication = { id: randomUUID(), owner, reportId, expectedRevision, expectedAttachmentRevision, createdAt: now, updatedAt: now, state: "PENDING", retryCount: 0 };
    const items = await update((saved) => { const existing = saved.find((r) => r.reportId === reportId && r.state !== "SYNCED"); return existing ? saved.map((r) => r.id === existing.id && r.state === "CONFLICT" ? { ...r, expectedRevision, expectedAttachmentRevision, state: "PENDING", lastError: undefined, updatedAt: now } : r) : [...saved.filter((r) => r.state !== "SYNCED"), entry]; });
    return await send(items.find((r) => r.reportId === reportId && r.state !== "SYNCED")!);
  };
  return <Context.Provider value={{ available: true, rows, error, publish, retry: async (entry) => { await send(entry); } }}>{children}</Context.Provider>;
}
export function ReportQueueScreen({ view = 'sync' }: { view?: string }) {
  const service = useReportQueue(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const selected = service.rows.filter((row) => view === 'upload-failed' ? row.state === 'FAILED' : view === 'conflict' ? row.state === 'CONFLICT' : view === 'queue' ? row.state !== 'SYNCED' : true);
  const states = [{ state: 'PENDING', title: 'Pending (saved locally)', route: 'queue', icon: 'document-text-outline' }, { state: 'SYNCING', title: 'Uploading', route: 'queue', icon: 'cloud-upload-outline' }, { state: 'FAILED', title: 'Failed', route: 'upload-failed', icon: 'alert-circle-outline' }, { state: 'CONFLICT', title: 'Conflicts', route: 'conflict', icon: 'sync-outline' }] as const;
  return <Screen title={view === 'upload-failed' ? 'Upload Failed' : view === 'conflict' ? 'Sync Conflict' : view === 'queue' ? 'Pending Sync Queue' : 'Sync Status'} subtitle={view === 'sync' ? 'View the current sync status and pending items.' : view === 'queue' ? 'Report submissions awaiting a server receipt.' : view === 'conflict' ? 'Review changed revisions before submitting again.' : 'Server receipt was not confirmed for these attempts.'}>
    <Notice tone={service.available ? 'success' : 'warning'}>{service.available ? 'Secure submission queue available for this approved account.' : 'Secure queue unavailable. Reconnect with an approved account on Android or iOS.'}</Notice>
    {(error || service.error) && <Notice tone="warning">{error || service.error}</Notice>}
    {view === 'sync' && <Card style={{ gap: 14 }}><Txt size={21} weight="700">Pending items</Txt>{states.map((item) => <LinkRow key={item.state} title={item.title} icon={item.icon} tail={<Badge label={String(service.rows.filter((r) => r.state === item.state).length)} tone={item.state === 'FAILED' ? 'danger' : 'info'} />} onPress={() => go(item.route)} />)}</Card>}
    {service.available && !selected.length && <Card><Txt muted>{view === 'conflict' ? 'No conflicting submissions.' : view === 'upload-failed' ? 'No failed submissions.' : 'No pending submissions in this selection.'}</Txt></Card>}
    {selected.map((r) => view === 'conflict' ? <PublicationConflict key={r.id} entry={r} /> : <Card key={r.id} style={{ gap: 12 }}><Row><Icon name={r.state === 'SYNCED' ? 'checkmark-circle' : r.state === 'FAILED' ? 'alert-circle' : 'cloud-upload-outline'} size={34} color={r.state === 'FAILED' ? '#C92E40' : '#0866E8'} /><View style={{ flex: 1, gap: 5 }}><Txt weight="700" size={18}>Fault report</Txt><Badge label={r.state} tone={r.state === 'FAILED' ? 'danger' : r.state === 'SYNCED' ? 'success' : 'warning'} /></View></Row><Detail label="Report" value={r.reportId} /><Detail label="Attempts" value={String(r.retryCount)} /><Detail label="Last updated" value={new Date(r.updatedAt).toLocaleString()} />{r.state !== 'SYNCED' && <Notice tone="warning">Server receipt not confirmed for this submission attempt.</Notice>}{r.lastError && <Notice tone="warning">{r.lastError}</Notice>}{r.state === 'SYNCED' && <Button label="View received report" onPress={() => go('report-detail', r.serverId)} />}{r.state === 'CONFLICT' ? <Button label="Review saved draft conflict" onPress={() => go('conflict')} /> : r.state === 'FAILED' && <Button label="Retry publication" icon="refresh-outline" loading={busy} disabled={!service.available || !service.retry} onPress={() => { setBusy(true); void service.retry?.(r).catch((failure) => setError(authErrorMessage(failure))).finally(() => setBusy(false)); }} />}</Card>)}
    <Txt size={12} muted>This queue retains submission attempts for already-saved server drafts. New offline drafts, offline photos and safety decisions are not stored here.</Txt>
  </Screen>;
}
function PublicationConflict({ entry }: { entry: PendingPublication }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: entry.reportId as GenericId<'faultReports'> });
  return <Card style={{ gap: 16 }}><Txt size={20} weight="700">{entry.reportId}</Txt><Row style={{ alignItems: 'flex-start' }}><View style={{ flex: 1, gap: 8 }}><Icon name="phone-portrait-outline" /><Txt weight="700">Local attempt</Txt><Txt muted>Draft revision {entry.expectedRevision}</Txt><Txt muted>Photo revision {entry.expectedAttachmentRevision ?? 0}</Txt><Txt size={12} muted>{new Date(entry.updatedAt).toLocaleString()}</Txt></View><View style={{ flex: 1, gap: 8 }}><Icon name="cloud-outline" /><Txt weight="700">Current server</Txt><Txt muted>{report ? `Draft revision ${report.revision ?? 1}` : 'Loading…'}</Txt><Txt muted>{report ? `Photo revision ${report.attachmentRevision ?? 0}` : 'Loading…'}</Txt><Txt muted>{report?.submissionState === 'draft' ? 'Saved draft' : report ? 'Submitted' : ''}</Txt></View></Row><Notice tone="warning">The saved draft or its photos changed. Review the latest server content before submitting again. This queue does not retain a separate copy of the draft fields.</Notice>{entry.lastError && <Txt size={12} muted>{entry.lastError}</Txt>}<Button label="Review latest saved draft" disabled={!report} onPress={() => go('resume-report', entry.reportId)} /></Card>;
}
