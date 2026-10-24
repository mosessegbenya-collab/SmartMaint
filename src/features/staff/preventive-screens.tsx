import { useState } from "react";
import { randomUUID } from "expo-crypto";
import { useMutation, usePaginatedQuery } from "convex/react";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Detail, Field, Notice, Screen, Txt } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";
import { OperationalList, ScopeSelect } from "./operational-screens";
import { useCurrentTime } from "@/hooks/use-current-time";

export function PreventiveSchedules() {
  const { account } = useStaffAccess(); const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  if (!account?.capabilities.some((c) => ["repair", "assign"].includes(c))) return <Screen title="Schedule access restricted"><Notice>Maintenance or assignment capability is required.</Notice></Screen>;
  return <Screen title="Preventive Maintenance"><ScopeSelect value={department} onChange={setDepartment} /><Notice>Scheduled task creation is an explicit supervisor action. No background scheduler or completion notification is implied.</Notice>{department && <SchedulePage department={department} />}</Screen>;
}
function SchedulePage({ department }: { department: GenericId<"departments"> }) {
  const page = usePaginatedQuery(staffApi.preventive.page, { departmentId: department }, { initialNumItems: 20 });
  return <>{page.results.map((r) => <ScheduleRow key={`${r._id}:${r.revision}`} schedule={r} />)}{page.status === "LoadingFirstPage" && <Notice>Loading authorized schedules…</Notice>}{page.status !== "Exhausted" && <Button label="Load more schedules" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}</>;
}
function ScheduleRow({ schedule }: { schedule: FunctionReturnType<typeof staffApi.preventive.page>["page"][number] }) {
  const now = useCurrentTime();
  const { account } = useStaffAccess(); const create = useMutation(staffApi.preventive.materialize); const reschedule = useMutation(staffApi.preventive.reschedule); const [due, setDue] = useState(new Date(schedule.nextDueAt).toISOString()); const [reason, setReason] = useState("");
  return <Card style={{ gap: 10 }}><Txt weight="700" size={20}>{schedule.title}</Txt><Badge label={!schedule.active ? "Paused" : schedule.nextDueAt < now ? "Overdue" : "Scheduled"} tone={schedule.nextDueAt < now ? "danger" : "info"} /><Detail label="Next due" value={new Date(schedule.nextDueAt).toLocaleString()} /><Detail label="Interval" value={`${schedule.intervalDays} days`} /><Detail label="Approved procedure" value={schedule.approvedReference} /><Detail label="Checklist" value={schedule.checklist.join("\n")} />
    {account?.capabilities.includes("assign") && <><ConfirmAction label="Create scheduled task" title="Create preventive maintenance task?" detail="The occurrence is deduplicated and the next scheduled date advances. Technician assignment remains required." disabled={!schedule.active} onConfirm={async () => { const taskId = await create({ id: schedule._id, expectedRevision: schedule.revision, scheduledDueAt: schedule.nextDueAt }); go("live-task", taskId); }} /><DateTimeField label="Rescheduled next due" value={due} onChange={setDue} /><Field label="Rescheduling / pause reason" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Save next due date" title="Reschedule future maintenance?" detail="Existing work orders retain their own due dates." disabled={!reason.trim()} onConfirm={() => reschedule({ id: schedule._id, expectedRevision: schedule.revision, nextDueAt: Date.parse(due), active: schedule.active, reason })} /><ConfirmAction label={schedule.active ? "Pause schedule" : "Resume schedule"} title="Change schedule activity?" detail="Existing tasks are not cancelled by this action." disabled={!reason.trim()} onConfirm={() => reschedule({ id: schedule._id, expectedRevision: schedule.revision, nextDueAt: Date.parse(due), active: !schedule.active, reason })} /></>}
  </Card>;
}
export function PreventiveCreate({ id }: { id?: string }) {
  const { account } = useStaffAccess(); const create = useMutation(staffApi.preventive.create); const [title, setTitle] = useState(""); const [reference, setReference] = useState(""); const [interval, setInterval] = useState(""); const [due, setDue] = useState(""); const [checklist, setChecklist] = useState(""); const [created, setCreated] = useState(""); const [operationId] = useState(randomUUID);
  if (!id) return <OperationalList kind="equipment" />;
  if (!account?.capabilities.includes("assign")) return <Screen title="Schedule creation restricted"><Notice>Supervisor assignment capability is required.</Notice></Screen>;
  return <Screen title="Schedule Preventive Maintenance"><Notice>Enter the actual approved equipment maintenance procedure and its reference. Do not invent clinical or technical safety checklists here.</Notice><Field label="Schedule title" value={title} onChangeText={setTitle} maxLength={120} /><Field label="Approved procedure reference" value={reference} onChangeText={setReference} maxLength={200} /><Field label="Interval in days" value={interval} onChangeText={setInterval} keyboardType="number-pad" /><DateTimeField label="First due date" value={due} onChange={setDue} required /><Field label="Approved maintenance checklist (one item per line)" value={checklist} onChangeText={setChecklist} multiline maxLength={4800} />{!!created && <Notice>Schedule created: {created}</Notice>}<ConfirmAction label="Create maintenance schedule" title="Create this approved schedule?" detail="It will be scoped to the selected equipment and audited under your account." disabled={!title.trim() || !reference.trim() || !checklist.trim() || !due || !interval || !!created} onConfirm={async () => setCreated(await create({ operationId, equipmentId: id as GenericId<"equipment">, title, approvedReference: reference, intervalDays: Number(interval), nextDueAt: Date.parse(due), checklist: checklist.split("\n").map((s) => s.trim()).filter(Boolean) }))} /><Button label="View schedules" variant="secondary" onPress={() => go("preventive-schedules")} /></Screen>;
}
