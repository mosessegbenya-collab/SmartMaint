import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Detail, Field, LinkRow, Notice, Screen, Txt } from "@/components/smart/ui";
import { StatusPanel, TimelineItem } from "@/components/smart/status-ui";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";
import { ReleaseControls, ResolveHold } from "./safety-screens";

export function EquipmentStatusTimeline({ id }: { id: string }) {
  const result = useQuery(staffApi.workflows.equipmentStatus, { id: id as GenericId<"equipment"> });
  return <Screen title="Equipment Status Timeline" subtitle="Track recorded safety and maintenance activity for this asset.">
    {result ? <>
      <Card style={{ gap: 6 }}><Txt size={23} weight="800">{result.equipment.assetId}</Txt><Txt>{result.equipment.name}</Txt><Txt muted>{result.equipment.location}</Txt></Card>
      <ReleaseControls id={id} />
      <Txt size={19} weight="700">Status timeline</Txt>
      {!result.events.length && <Notice>No status events are recorded for this equipment.</Notice>}
      {result.events.map((event, index) => <TimelineItem key={event.id} title={event.title} detail={event.detail} at={event.at} icon={event.kind === "hold" ? "lock-closed-outline" : event.kind === "resolved" || event.kind === "release" ? "shield-checkmark-outline" : event.kind === "verification" ? "clipboard-outline" : event.kind === "repair" ? "construct-outline" : "document-text-outline"} tone={event.kind === "hold" ? "danger" : event.kind === "resolved" || event.kind === "release" ? "success" : "info"} last={index === result.events.length - 1} />)}
      <Txt muted size={11}>Recent overview: up to {result.limit} records per source and 100 displayed events. Verification entries cover the latest repair cycle. {result.limited ? "Additional history exists or may exist beyond these limits." : "Open maintenance history for individual work records."}</Txt>
      <LinkRow title="Equipment maintenance history" icon="time-outline" onPress={() => go("equipment-history", id)} />
    </> : <Notice>Loading authorized status history…</Notice>}
  </Screen>;
}
export function EquipmentHolds({ id, details = false }: { id: string; details?: boolean }) {
  const { hold } = useLocalSearchParams<{ hold?: string }>();
  const equipmentId = id as GenericId<"equipment">;
  const records = useQuery(staffApi.operations.holds, { equipmentId });
  const equipment = useQuery(staffApi.workflows.equipmentDetail, { id: equipmentId });
  const { account } = useStaffAccess();
  const create = useMutation(staffApi.operations.placeHold);
  const [reason, setReason] = useState("");
  const selected = hold ? records?.find((record) => record._id === hold) : records?.find((record) => record.active) ?? records?.[0];
  return <Screen title={details ? "Safety Hold Details" : "Equipment Safety Holds"} subtitle={details ? "Review the hold and its recorded resolution." : "Review active restrictions and previous safety holds."}>
    {equipment && <Card style={{ gap: 6 }}><Txt size={23} weight="800">{equipment.assetId}</Txt><Txt>{equipment.name}</Txt><Txt muted>{equipment.location}</Txt></Card>}
    {records === undefined ? <Notice>Loading authorized safety holds…</Notice> : details ? selected ? <>
      <StatusPanel title={selected.active ? "Active safety hold" : "Hold resolved"} detail={selected.active ? "Equipment use is restricted until an authorized review resolves this hold." : "This hold has been resolved. Check current release status before using the equipment."} icon={selected.active ? "alert-circle" : "checkmark-circle"} tone={selected.active ? "danger" : "success"} />
      <Card style={{ gap: 12 }}><Detail label="Hold reference" value={selected._id} /><Detail label="Raised by" value={selected.createdBy} /><Detail label="Date raised" value={new Date(selected.createdAt).toLocaleString()} /><Txt size={17} weight="700">Reason for hold</Txt><Txt>{selected.reason}</Txt>{selected.resolvedAt !== undefined && <><Detail label="Resolved" value={new Date(selected.resolvedAt).toLocaleString()} /><Detail label="Resolved by" value={selected.resolvedBy ?? "Not recorded"} /><Txt>{selected.resolutionReason}</Txt></>}</Card>
      {selected.active && <Card style={{ gap: 12 }}><Txt size={18} weight="700">Authorized hold review</Txt><ResolveHold id={selected._id} equipmentId={equipmentId} /></Card>}
      <Button label="View all safety holds" variant="secondary" onPress={() => go("holds", id)} />
    </> : <Notice>No matching safety hold is available for this equipment.</Notice> : <>
      <StatusPanel title={`${records.filter((record) => record.active).length} active safety hold(s)`} detail="Resolving a hold does not automatically authorize return to service." icon="lock-closed-outline" tone={records.some((record) => record.active) ? "danger" : "info"} />
      {!records.length && <Notice>No holds have been recorded. This does not establish equipment availability.</Notice>}
      {[...records].sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt).map((record) => <Card key={record._id} style={{ gap: 12 }}><Badge label={record.active ? "Active safety hold" : "Resolved"} tone={record.active ? "danger" : "success"} /><Txt>{record.reason}</Txt><Txt muted size={12}>{new Date(record.createdAt).toLocaleString()}</Txt><Button label="View hold details" variant="secondary" onPress={() => router.push({ pathname: "/flow/[view]", params: { view: "hold-detail", id, hold: record._id } })} /></Card>)}
      {!!account?.capabilities.includes("hold") && <Card style={{ gap: 12 }}><Txt size={19} weight="700">Place a safety hold</Txt><Field label="Reason for restriction" value={reason} onChangeText={setReason} multiline maxLength={500} /><ConfirmAction label="Place safety hold" title="Restrict this equipment?" detail="The hold blocks return to service and is recorded under your account." disabled={!reason.trim()} danger onConfirm={async () => { await create({ equipmentId, reason }); setReason(""); }} /></Card>}
    </>}
    <LinkRow title="Current release status" icon="shield-checkmark-outline" onPress={() => go("release", id)} />
    <LinkRow title="Equipment status timeline" icon="time-outline" onPress={() => go("status-timeline", id)} />
  </Screen>;
}
