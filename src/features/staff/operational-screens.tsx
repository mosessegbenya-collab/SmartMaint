import { useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Linking } from "react-native";
import { randomUUID } from "expo-crypto";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Select, Txt } from "@/components/smart/ui";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction } from "./ui";
import { ReportPhotos } from "./report-photos";
import { ReleaseControls, ResolveHold } from "./safety-screens";

export function ScopeSelect({ value, onChange }: { value: GenericId<"departments"> | null; onChange: (id: GenericId<"departments">) => void }) {
  const { account } = useStaffAccess(); const departments = useQuery(staffApi.staff.departments);
  const choices = departments?.filter((d) => account?.scope.includes(d.id)) ?? [];
  return <Select label="Department" values={choices.map((d) => d.label)} value={choices.find((d) => d.id === value)?.label ?? ""} onChange={(label) => { const selected = choices.find((d) => d.label === label); if (selected) onChange(selected.id); }} />;
}
function More({ status, load, busy }: { status: string; load: () => void; busy: boolean }) {
  return status === "LoadingFirstPage" ? <Notice>Loading authorized records…</Notice> : status === "Exhausted" ? <Txt muted size={12}>All records in this selection are shown.</Txt> : <Button label="Load more" loading={busy} disabled={status !== "CanLoadMore"} variant="secondary" onPress={load} />;
}
export function OperationalList({ kind, verification }: { kind: "equipment" | "reports" | "tasks" | "provisional"; verification?: "technical" | "clinical" }) {
  const { account } = useStaffAccess(); const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  return <Screen title={verification ? `${verification === "technical" ? "Technical" : "Clinical"} Verification Queue` : kind === "equipment" ? "Equipment" : kind === "reports" ? "Fault Reports" : kind === "provisional" ? "Provisional Reports" : "Maintenance Tasks"} back={false}>
    {verification && <Notice>Completed repairs by other staff in your authorized department. Open a repair to review its recorded decisions and current approved policy.</Notice>}
    <ScopeSelect value={department} onChange={setDepartment} />
    {kind === "equipment" && <Button label="Scan or enter equipment ID" onPress={() => go("scan")} />}
    {kind === "reports" && account?.capabilities.includes("report") && <Button label="Report a fault" onPress={() => go("scan")} />}
    {kind === "reports" && <LinkRow title="Unverified equipment reports" onPress={() => go("live-provisional-reports")} />}
    {department && (kind === "equipment" ? <EquipmentPage department={department} /> : kind === "reports" ? <ReportPage department={department} /> : kind === "tasks" ? <TaskPage department={department} verification={verification} /> : <ProvisionalPage department={department} />)}
  </Screen>;
}
function EquipmentPage({ department }: { department: GenericId<"departments"> }) {
  const page = usePaginatedQuery(staffApi.workflows.equipmentPage, { departmentId: department }, { initialNumItems: 20 });
  return <>{page.results.map((r) => <LinkRow key={r._id} title={r.assetId} detail={`${r.name} · ${r.location}`} onPress={() => go("live-equipment", r._id)} />)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></>;
}
function ReportPage({ department }: { department: GenericId<"departments"> }) {
  const [priority, setPriority] = useState<"All" | "Urgent" | "High" | "Routine">("All"); const [submission, setSubmission] = useState<"All" | "Drafts" | "Submitted">("All");
  const page = usePaginatedQuery(staffApi.workflows.reportPage, { departmentId: department, priority: priority === "All" ? undefined : priority, submission: submission === "All" ? undefined : submission === "Drafts" ? "draft" : "submitted" }, { initialNumItems: 20 });
  return <><Choices label="Effective priority" values={["All", "Urgent", "High", "Routine"]} value={priority} onChange={setPriority} /><Choices label="Report status" values={["All", "Drafts", "Submitted"]} value={submission} onChange={setSubmission} />{page.results.map((r) => <LinkRow key={r._id} title={`${r.submissionState === "draft" ? "Draft · " : ""}${r.symptoms}`} detail={`${r.triagedPriority ?? r.priority} · ${new Date(r.createdAt).toLocaleString()}`} onPress={() => go("report-detail", r._id)} />)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></>;
}
function TaskPage({ department, verification }: { department: GenericId<"departments">; verification?: "technical" | "clinical" }) {
  const page = usePaginatedQuery(staffApi.workflows.taskPage, { departmentId: department, verification }, { initialNumItems: 20 });
  return <>{page.results.map((r) => <LinkRow key={r._id} title={r.state} detail={`Due ${new Date(r.dueAt).toLocaleString()} · ${r._id}`} onPress={() => go(verification ? `${verification}-verification` : "live-task", r._id)} />)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></>;
}
export function EquipmentHistory({ id }: { id: string }) {
  const page = usePaginatedQuery(staffApi.workflows.equipmentHistory, { id: id as GenericId<"equipment"> }, { initialNumItems: 20 });
  return <Screen title="Equipment Maintenance Timeline"><Notice>Repair completion does not establish return to service. Current release status is shown on the equipment record.</Notice>{page.results.map((r) => <Card key={r.id} style={{ gap: 8 }}><Badge label={r.state} /><Detail label="Cycle" value={String(r.cycle)} /><Detail label="Work type" value={r.rework ? "Follow-up rework" : r.preventive ? "Preventive maintenance" : "Fault repair"} /><Detail label="Updated" value={new Date(r.updatedAt).toLocaleString()} />{r.canOpen && <Button label="Open maintenance record" onPress={() => go("live-task", r.id)} />}</Card>)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /><Button label="Current equipment status" onPress={() => go("live-equipment", id)} /></Screen>;
}
function ProvisionalPage({ department }: { department: GenericId<"departments"> }) {
  const page = usePaginatedQuery(staffApi.workflows.provisionalPage, { departmentId: department }, { initialNumItems: 20 });
  return <>{page.results.map((r) => <Card key={r._id} style={{ gap: 8 }}><Badge label="Unverified identity" tone="warning" /><Txt weight="700">{r.rawIdentifier}</Txt><Detail label="Equipment" value={r.equipmentType} /><Detail label="Location" value={r.location} /><Detail label="Symptoms" value={r.symptoms} /><Detail label="Reference" value={r._id} /><Notice>Institutional reconciliation is required. This report does not establish inventory identity or equipment availability.</Notice></Card>)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></>;
}
export function ReportDetail({ id }: { id: string }) {
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
  const { account } = useStaffAccess(); const [priority, setPriority] = useState<"Urgent" | "High" | "Routine">("High"); const [reason, setReason] = useState("");
  const triage = useMutation(staffApi.operations.triage);
  return <Screen title="Fault Report Details">{report ? <>
    <Card style={{ gap: 10 }}><Detail label="Reference" value={report._id} /><Txt size={23} weight="700">{report.symptoms}</Txt><Detail label="Category" value={report.category} /><Detail label="Description" value={report.description || "Not supplied"} /><Detail label="Reported condition" value={report.condition} /><Detail label="Reported priority" value={report.priority} /><Detail label="Triaged priority" value={report.triagedPriority ?? "Not triaged"} /><Detail label="Time noticed" value={new Date(report.noticedAt).toLocaleString()} /></Card>
    <Button label="View equipment" variant="secondary" onPress={() => go("live-equipment", report.equipmentId)} />
    {report.submissionState === "draft" && report.reporterId === account?.id && <Button label="Continue saved draft" onPress={() => go("resume-report", report._id)} />}
    <ReportPhotos reportId={report._id} />
    {report.submissionState !== "draft" && account?.capabilities.includes("assign") && <Button label="Create maintenance task" onPress={() => go("live-task-create", report._id)} />}
    {report.submissionState !== "draft" && account?.capabilities.includes("triage") && <Card style={{ gap: 10 }}><Txt weight="700">Authorized triage</Txt><Choices label="Priority" values={["Urgent", "High", "Routine"]} value={priority} onChange={setPriority} /><Field label="Triage justification" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Save triage" title="Confirm triage?" detail="The reporter's original priority is preserved." disabled={!reason.trim()} onConfirm={() => triage({ id: report._id, priority, reason })} /></Card>}
  </> : <Notice>Loading authorized report…</Notice>}</Screen>;
}
export function EquipmentRecord({ id }: { id: string }) {
  const { account } = useStaffAccess();
  const item = useQuery(staffApi.workflows.equipmentDetail, { id: id as GenericId<"equipment"> });
  return <Screen title="Equipment Details">{item ? <><Card style={{ gap: 9 }}><Txt size={24} weight="800">{item.assetId}</Txt><Detail label="Equipment" value={item.name} /><Detail label="Model" value={item.model} /><Detail label="Location" value={item.location} /><Badge label={item.identityVerified ? "Verified inventory identity" : "Unverified identity"} tone="info" /></Card><ReleaseControls id={item._id} />{account?.capabilities.includes("report") && <Button label="Report fault" onPress={() => go("live-report", item._id)} />}{account?.capabilities.includes("assign") && <LinkRow title="Schedule preventive maintenance" onPress={() => go("preventive-create", item._id)} />}<LinkRow title="Maintenance timeline" onPress={() => go("equipment-history", item._id)} /><LinkRow title="Safety holds" onPress={() => go("holds", item._id)} /></> : <Notice>Loading authorized equipment…</Notice>}</Screen>;
}
export function HoldControls({ id }: { id: string }) {
  const equipmentId = id as GenericId<"equipment">; const holds = useQuery(staffApi.operations.holds, { equipmentId }); const { account } = useStaffAccess(); const create = useMutation(staffApi.operations.placeHold); const [reason, setReason] = useState("");
  return <Screen title="Equipment Safety Holds"><Notice>Active holds block return to service. Clearance requires approved institutional policy and explicit authority; resolution does not release equipment.</Notice>
    {holds?.length === 0 && <Notice>No holds recorded. This does not confirm equipment availability.</Notice>}
    {holds?.map((r) => <Card key={r._id} style={{ gap: 8 }}><Badge label={r.active ? "Active safety hold" : "Resolved"} tone={r.active ? "danger" : "success"} /><Txt>{r.reason}</Txt><Detail label="Responsible account" value={r.createdBy} /><Detail label="Created" value={new Date(r.createdAt).toLocaleString()} />{r.active && <ResolveHold id={r._id} equipmentId={r.equipmentId} />}</Card>)}
    {account?.capabilities.includes("hold") && <><Field label="Safety hold reason" value={reason} onChangeText={setReason} maxLength={500} /><ConfirmAction label="Place safety hold" title="Place equipment on hold?" detail="This protective action is recorded under your account and does not release equipment." disabled={!reason.trim()} danger onConfirm={async () => { await create({ equipmentId, reason }); setReason(""); }} /></>}
  </Screen>;
}
export function WorkHistory({ id }: { id: string }) {
  const page = usePaginatedQuery(staffApi.workflows.workHistory, { id: id as GenericId<"maintenanceTasks"> }, { initialNumItems: 20 });
  return <Card style={{ gap: 10 }}><Txt size={20} weight="700">Work history</Txt>{page.results.map((r) => <Card key={r._id} style={{ gap: 7 }}><Detail label="Revision" value={String(r.revision)} /><Badge label={r.state} /><Detail label="Diagnosis" value={r.diagnosis || "Not recorded"} /><Detail label="Notes" value={r.notes || "Not recorded"} /><Detail label="Parts" value={r.parts.join(", ") || "None recorded"} /><Detail label="Recorded" value={new Date(r.at).toLocaleString()} /></Card>)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></Card>;
}
export function NotificationInbox() {
  const page = usePaginatedQuery(staffApi.workflows.inbox, {}, { initialNumItems: 20 }); const mark = useMutation(staffApi.workflows.markRead);
  return <Screen title="Notifications" back={false}><Notice>In-app notices only. Push/email dispatch and confirmed delivery are not configured.</Notice>{page.results.map((r) => <Card key={r._id} style={{ gap: 8 }}><Badge label={r.readAt ? "Read" : "Unread"} tone="info" /><Txt weight="700">{r.title}</Txt><Txt>{r.body}</Txt><Button label="Open record" onPress={() => go(r.targetKind === "task" ? "live-task" : r.targetKind === "report" ? "report-detail" : "live-equipment", r.targetId)} /><ConfirmAction label={r.readAt ? "Mark unread" : "Mark read"} title="Update notification?" detail="This changes only your inbox state." onConfirm={() => mark({ id: r._id, read: !r.readAt })} /></Card>)}<More status={page.status} busy={page.isLoading} load={() => page.loadMore(20)} /></Screen>;
}
export function EquipmentRegistry() {
  const { account } = useStaffAccess(); const register = useMutation(staffApi.workflows.registerEquipment); const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  const [assetId, setAsset] = useState(""); const [name, setName] = useState(""); const [model, setModel] = useState(""); const [location, setLocation] = useState(""); const [reference, setReference] = useState(""); const [created, setCreated] = useState("");
  if (account?.role !== "Administrator" || !account.capabilities.includes("reconcile")) return <Screen title="Registry access restricted"><Notice>An authorized inventory administrator is required.</Notice></Screen>;
  return <Screen title="Equipment Registry"><Notice>Register only independently verified institutional inventory. Never use this form to approve a provisional report without the required review.</Notice><ScopeSelect value={department} onChange={setDepartment} />
    <Field label="Exact asset / QR identifier" value={assetId} onChangeText={setAsset} maxLength={200} /><Field label="Equipment name" value={name} onChangeText={setName} maxLength={120} /><Field label="Model" value={model} onChangeText={setModel} maxLength={120} /><Field label="Location" value={location} onChangeText={setLocation} maxLength={160} /><Field label="Inventory verification reference" value={reference} onChangeText={setReference} maxLength={500} />
    {created && <Notice>Equipment registered: {created}</Notice>}<ConfirmAction label="Register verified inventory" title="Confirm verified inventory?" detail="This creates a scoped inventory identity and an audit event. It does not release the equipment." disabled={!department || !assetId.trim() || !name.trim() || !model.trim() || !location.trim() || !reference.trim()} onConfirm={async () => { const id = await register({ assetId, name, model, location, departmentId: department!, evidenceReference: reference }); setCreated(id); }} />
  </Screen>;
}
export function EquipmentLookup({ scan = false, emergency = false }: { scan?: boolean; emergency?: boolean }) {
  const { account } = useStaffAccess();
  const [permission, requestPermission] = useCameraPermissions(); const [input, setInput] = useState(""); const [identifier, setIdentifier] = useState(""); const [scanning, setScanning] = useState(scan);
  const result = useQuery(staffApi.workflows.lookup, identifier ? { identifier } : "skip");
  const [lookupError, setLookupError] = useState("");
  const find = () => { if (!input.trim() || input.length > 200 || /[\u0000-\u001f]/.test(input)) { setIdentifier(""); setLookupError("Use 1–200 printable characters from the equipment label."); return; } setLookupError(""); setScanning(false); setIdentifier(input.trim()); };
  return <Screen title={scan ? "Scan Equipment QR" : "Find Equipment"}>
    {scanning && (!permission?.granted ? <><Notice>Camera access is needed to scan equipment. You can enter the asset ID manually.</Notice><Button label="Allow camera" onPress={() => void requestPermission()} />{permission?.canAskAgain === false && <Button label="Open device settings" onPress={() => void Linking.openSettings()} />}</> : <CameraView style={{ height: 250, borderRadius: 20 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => { setScanning(false); setInput(data); setIdentifier(""); if (data.trim() && data.length <= 200 && !/[\u0000-\u001f]/.test(data)) { setIdentifier(data.trim()); setLookupError(""); } else setLookupError("QR identifier must contain 1–200 printable characters. Use manual entry if needed."); }} />)}
    <Field label="Exact equipment identifier" value={input} onChangeText={(value) => { setInput(value); setIdentifier(""); setLookupError(""); }} maxLength={200} autoCapitalize="none" /><Button label="Look up equipment" disabled={!input.trim()} onPress={find} /><Button label={scanning ? "Use manual entry" : "Scan QR code"} variant="secondary" onPress={() => { setIdentifier(""); setLookupError(""); setScanning(!scanning); }} />
    {lookupError && <Notice tone="warning">{lookupError}</Notice>}
    {identifier && result === undefined && <Notice>Checking authorized inventory…</Notice>}
    {result && <Card style={{ gap: 9 }}><Txt weight="700">{result.name}</Txt><Detail label="Asset" value={result.assetId} /><Detail label="Location" value={result.location} /><Button label="Confirm equipment" onPress={() => go(emergency ? "emergency-form" : "live-equipment", result._id)} /></Card>}
    {identifier && result === null && <><Notice>No equipment matches in your authorized scope. A scan does not create or verify inventory.</Notice>{account?.capabilities.includes("report") && <Button label="Report unverified equipment" onPress={() => go("provisional", input)} />}</>}
  </Screen>;
}
export function ProvisionalForm({ identifier }: { identifier: string }) {
  const { account } = useStaffAccess(); const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null); const [type, setType] = useState(""); const [location, setLocation] = useState(""); const [symptoms, setSymptoms] = useState(""); const [operationId] = useState(randomUUID); const [received, setReceived] = useState(""); const submit = useMutation(staffApi.workflows.submitProvisional);
  if (!account?.capabilities.includes("report")) return <Screen title="Reporting restricted"><Notice>Approved fault-reporting permission is required.</Notice></Screen>;
  return <Screen title="Provisional Equipment Report"><Notice>Unverified identity. Institutional review is required; this does not create verified equipment or confirm availability.</Notice><Detail label="Original identifier" value={identifier} /><ScopeSelect value={department} onChange={setDepartment} /><Field label="Equipment type" value={type} onChangeText={setType} maxLength={120} /><Field label="Location" value={location} onChangeText={setLocation} maxLength={160} /><Field label="Symptoms" value={symptoms} onChangeText={setSymptoms} multiline maxLength={1000} />{received ? <><Notice>Unverified report received: {received}</Notice><Button label="View provisional reports" onPress={() => go("live-provisional-reports")} /></> : <ConfirmAction label="Submit unverified report" title="Submit provisional report?" detail="This creates a real report for authorized review, never a verified equipment record." disabled={!department || !identifier || !type.trim() || !location.trim() || !symptoms.trim()} onConfirm={async () => { setReceived(await submit({ departmentId: department!, rawIdentifier: identifier, equipmentType: type, location, symptoms, priority: "High", operationId })); }} />}</Screen>;
}
