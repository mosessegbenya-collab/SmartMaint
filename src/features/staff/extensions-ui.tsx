import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { GenericId } from "convex/values";
import { Card, Detail, Field, Notice, Txt } from "@/components/smart/ui";
import { SettingToggle } from "@/components/smart/settings-ui";
import { staffApi } from "@/services/staff-api";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";
import { randomUUID } from "expo-crypto";

export function MaintenanceFlow({ task }: { task: FunctionReturnType<typeof staffApi.workflows.taskDetail> }) {
  const { account } = useStaffAccess(); const transition = useMutation(staffApi.extensions.transition); const [reason, setReason] = useState("");
  const own = account?.id === task.assigneeId && account?.capabilities.includes("repair");
  const actions: { action: "accept" | "await_parts" | "resume" | "close"; label: string }[] = [];
  if (own && task.state === "Assigned" && !task.workflowPhase) actions.push({ action: "accept", label: "Accept assignment" });
  if (own && ["Assigned", "In progress"].includes(task.state) && task.workflowPhase === "accepted") actions.push({ action: "await_parts", label: "Await parts" });
  if (own && task.workflowPhase === "awaiting_parts") actions.push({ action: "resume", label: "Resume after parts received" });
  if (account?.capabilities.includes("assign") && task.state === "Completed" && task.workflowPhase !== "closed") actions.push({ action: "close", label: "Close verified work order" });
  return <View style={{ gap: 9 }}><Detail label="Workflow" value={task.workflowPhase?.replaceAll("_", " ") ?? "Not accepted"} />{!!task.workflowReason && <Txt muted>{task.workflowReason}</Txt>}{task.workflowPhase === "awaiting_parts" && <Notice>Work is paused pending parts. Equipment is not released.</Notice>}{task.state === "Completed" && <Notice>Repair completion and administrative closure do not authorize equipment use.</Notice>}{actions.length > 0 && <><Field label="Workflow justification" value={reason} onChangeText={setReason} maxLength={500} />{actions.map(({ action, label }) => <ConfirmAction key={action} label={label} title={`${label}?`} detail="The server checks assignment, revisions and all required independent checks. This never records an equipment release." disabled={!reason.trim()} onConfirm={() => transition({ id: task._id, expectedRevision: task.revision, expectedWorkflowRevision: task.workflowRevision ?? 0, action, reason })} />)}</>}</View>;
}

export function StaffNotificationPreferences() {
  const saved = useQuery(staffApi.extensions.preferences); const save = useMutation(staffApi.extensions.savePreferences);
  const options = [{ key: "reportUpdates", label: "Report Updates" }, { key: "maintenanceUpdates", label: "Maintenance Updates" }, { key: "verificationUpdates", label: "Verification Updates" }, { key: "syncNotices", label: "Sync Notices" }] as const;
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  return <View style={{ gap: 12 }}><Notice>Saved for your approved account. Operational and safety records remain in your inbox. Push and email delivery are not configured.</Notice>{saved ? options.map(({ key, label }) => <SettingToggle key={key} title={label} detail="Remember this notification preference" icon="notifications-outline" value={saved[key]} disabled={busy} onChange={(value) => { setBusy(true); setError(""); const { revision, ...fields } = saved; void save({ ...fields, expectedRevision: revision, [key]: value }).catch((failure) => setError(failure instanceof Error ? failure.message : "Preference could not be saved")).finally(() => setBusy(false)); }} />) : <Notice>Loading saved preferences…</Notice>}{!!error && <Notice tone="warning">{error}</Notice>}</View>;
}

export function InventoryEdit({ id }: { id: GenericId<"equipment"> }) {
  const { account } = useStaffAccess();
  return account?.role === "Administrator" && account.capabilities.includes("reconcile") ? <InventoryEditLoader id={id} /> : null;
}
function InventoryEditLoader({ id }: { id: GenericId<"equipment"> }) {
  const item = useQuery(staffApi.workflows.equipmentDetail, { id });
  return item ? <InventoryEditForm key={`${id}:${item.revision ?? 1}`} item={item} /> : null;
}
function InventoryEditForm({ item }: { item: FunctionReturnType<typeof staffApi.workflows.equipmentDetail> }) {
  const edit = useMutation(staffApi.extensions.editEquipment); const [name, setName] = useState(item.name); const [model, setModel] = useState(item.model); const [location, setLocation] = useState(item.location); const [reason, setReason] = useState("");
  return <Card style={{ gap: 12 }}><Txt weight="700">Inventory corrections</Txt><Notice>Asset identity, department and verification status are preserved. This does not release equipment.</Notice><Field label="Equipment name" value={name} onChangeText={setName} maxLength={120} /><Field label="Model" value={model} onChangeText={setModel} maxLength={120} /><Field label="Location" value={location} onChangeText={setLocation} maxLength={160} /><Field label="Correction justification" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Save inventory corrections" title="Save these corrections?" detail="The current inventory revision and administrator access are checked by the server." disabled={!name.trim() || !model.trim() || !location.trim() || !reason.trim()} onConfirm={() => edit({ id: item._id, expectedRevision: item.revision ?? 1, name, model, location, reason })} /></Card>;
}

export function InventoryImport({ departmentId }: { departmentId: GenericId<"departments"> }) {
  const save = useMutation(staffApi.extensions.importInventory); const [input, setInput] = useState(""); const [reason, setReason] = useState(""); const [operationId, setOperation] = useState(randomUUID); const [message, setMessage] = useState("");
  return <Card style={{ gap: 12 }}><Txt size={20} weight="700">Import unverified inventory</Txt><Notice>Paste a JSON array with assetId, name, model and location. Import 1–25 records per batch. This never verifies an identity or releases equipment. Existing identifiers are not overwritten.</Notice><Field label="Inventory JSON array" value={input} onChangeText={(value) => { setInput(value); setOperation(randomUUID()); setMessage(""); }} multiline maxLength={25000} style={{ minHeight: 140 }} /><Field label="Import justification" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Import unverified inventory" title="Import these unverified records?" detail="The server validates the entire batch and rejects duplicates or out-of-scope access. A retry uses the same operation identity." disabled={!input.trim() || !reason.trim()} onConfirm={async () => { const rows: unknown = JSON.parse(input); if (!Array.isArray(rows) || rows.length < 1 || rows.length > 25 || rows.some((r) => !r || Object.keys(r).sort().join(',') !== 'assetId,location,model,name' || ![r.assetId, r.name, r.model, r.location].every((s) => typeof s === 'string'))) throw Error("Supply 1–25 objects containing only assetId, name, model and location strings."); const ids = await save({ departmentId, operationId, reason, rows }); setMessage(`${ids.length} unverified records imported. Independent identity reconciliation remains required.`); }} />{!!message && <Notice>{message}</Notice>}</Card>;
}
