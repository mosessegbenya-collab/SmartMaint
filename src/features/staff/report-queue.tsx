import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
import { useMutation } from "convex/react";
import type { GenericId } from "convex/values";
import { EncryptedReportQueue, publicationFailure, type PendingPublication } from "@/domain/report-queue";
import { staffApi } from "@/services/staff-api";
import { Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
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
export function ReportQueueScreen() {
  const service = useReportQueue(); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <Screen title="Report Synchronization"><Notice>This native encrypted queue retains confirmed submission attempts for already-saved server drafts. It does not support offline inventory lookup, new offline photo storage or safety decisions. Access and replay require fresh staff authorization.</Notice>{!service.available && <Notice>Native secure queue is unavailable in this state. Reconnect with an approved account on Android/iOS. Browser drafts remain server-backed.</Notice>}{(error || service.error) && <Notice tone="warning">{error || service.error}</Notice>}
    {service.rows.map((r) => <Card key={r.id} style={{ gap: 9 }}><Txt weight="700">{r.state}</Txt><Detail label="Report" value={r.reportId} /><Detail label="Attempts" value={String(r.retryCount)} />{r.lastError && <Notice tone="warning">{r.lastError}</Notice>}{r.state === "SYNCED" && <Button label="View received report" onPress={() => go("report-detail", r.serverId)} />}{r.state === "CONFLICT" ? <Button label="Review saved draft conflict" onPress={() => go("resume-report", r.reportId)} /> : r.state === "FAILED" && <Button label="Retry publication" loading={busy} onPress={() => { setBusy(true); void service.retry?.(r).catch((failure) => setError(authErrorMessage(failure))).finally(() => setBusy(false)); }} />}</Card>)}
  </Screen>;
}
