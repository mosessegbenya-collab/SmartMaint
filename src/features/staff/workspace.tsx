import { useState, type ComponentType } from "react";
import { Platform, Share } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { randomUUID } from "expo-crypto";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Section, Select, Txt } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import type { Priority } from "@/domain/models";
import { useApp } from "@/state/app-state";
import { useIdentity } from "@/features/access/identity";
import { useStaffAccess } from "./provider";
import { tabItems } from "@/navigation/tabs";
import { go } from "@/navigation/go";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { StaffAdministration, StaffApplicationReview, StaffRoleAssignment, StaffAccounts, StaffAudit } from "./administration";
import { ConfirmAction } from "./ui";

export function StaffWorkspaceRoute({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
  const { account, mode } = useApp();
  if (mode === "locked" || !account) return <Redirect href="/access/pending" />;
  if (!tabItems(account).some((tab) => tab.name === screen)) return <Restricted />;
  if (mode === "preview") return <Preview />;
  if (screen === "home") return <LiveHome />;
  if (screen === "accounts") return <StaffAdministration />;
  if (screen === "equipment") return <LiveEquipment />;
  if (screen === "reports") return <LiveReports />;
  if (screen === "tasks") return <LiveTasks />;
  if (screen === "profile") return <LiveProfile />;
  return <Screen title="Notifications" back={false}><Notice>Staff notifications are not configured. Application status updates are available from your account screen.</Notice></Screen>;
}
function Restricted() { return <Screen title="Access restricted"><Notice>This destination is outside your approved staff access.</Notice></Screen>; }
function LiveHome() {
  const { account } = useStaffAccess();
  return <Screen title={account?.role === "Clinician" || account?.role === "Biomedical Technician" ? "Home" : "Overview"} subtitle="Approved staff workspace" back={false}>
    <Card style={{ gap: 8 }}><Txt size={26} weight="800">Hello, {account?.name}</Txt><Badge label={account?.role ?? "Staff"} tone="info" /><Txt muted>Access is limited to your authorized departments and capabilities.</Txt></Card>
    {account?.capabilities.includes("report") && <LinkRow title="Report a Fault" detail="Submit a report for authorized equipment" icon="warning-outline" onPress={() => go("live-report")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Fault reports" icon="document-text-outline" onPress={() => go("live-reports")} />}
    {account?.capabilities.some((c) => ["assign", "repair", "technical", "clinical"].includes(c)) && <LinkRow title="Maintenance tasks" icon="construct-outline" onPress={() => go("live-tasks")} />}
    {account?.capabilities.includes("accounts") && <LinkRow title="Staff Applications" detail="Institutional identity and access review" icon="people-outline" onPress={() => router.push("/workspace/accounts")} />}
    {account?.capabilities.includes("audit") && <LinkRow title="Authorization Audit" icon="shield-checkmark-outline" onPress={() => go("staff-audit")} />}
    {account?.capabilities.includes("analytics") && <LinkRow title="Department Summary" icon="bar-chart-outline" onPress={() => go("live-analytics")} />}
    {account?.capabilities.includes("export") && <LinkRow title="Authorized Reports Export" icon="download-outline" onPress={() => go("live-export")} />}
    <Notice>Equipment release, clinical checklists and safety-hold clearance remain unavailable until their production policies are approved.</Notice>
  </Screen>;
}
function LiveEquipment() {
  const records = useQuery(staffApi.operations.equipment);
  return <Screen title="Equipment" subtitle="Records in your authorized departments" back={false}>
    {records === undefined && <Notice>Loading equipment…</Notice>}
    {records?.length === 0 && <Notice>No equipment records are available in your scope. No demonstration records are used here.</Notice>}
    {records?.map((e) => <LinkRow key={e._id} title={e.assetId} detail={`${e.name}\n${e.location}`} onPress={() => go("live-equipment", e._id)} />)}
    <Txt size={11} muted>Up to 100 records per authorized department.</Txt>
  </Screen>;
}
function EquipmentDetail({ id }: { id: string }) {
  const records = useQuery(staffApi.operations.equipment);
  const item = records?.find((r) => r._id === id);
  if (!item) return <Screen title="Equipment"><Notice>{records ? "Equipment unavailable in your scope." : "Loading equipment…"}</Notice></Screen>;
  return <Screen title="Equipment Details"><Card style={{ gap: 9 }}><Txt size={24} weight="800">{item.assetId}</Txt><Detail label="Equipment" value={item.name} /><Detail label="Location" value={item.location} /><Detail label="Identity" value={item.identityVerified ? "Verified inventory record" : "Not verified"} /></Card><Notice tone="warning">Availability cannot be confirmed while production release policy is unconfigured.</Notice><Button label="Report a fault" onPress={() => go("live-report", item._id)} /></Screen>;
}
function LiveReports() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) return account?.capabilities.includes("analytics") ? <Analytics /> : account?.capabilities.includes("export") ? <Export /> : <Restricted />;
  return <ReportList />;
}
function ReportList() {
  const records = useQuery(staffApi.operations.reports);
  const { account } = useStaffAccess();
  return <Screen title="Fault Reports" back={false}>
    {account?.capabilities.includes("report") && <Button label="Report a fault" onPress={() => go("live-report")} />}
    {records === undefined && <Notice>Loading authorized reports…</Notice>}
    {records?.length === 0 && <Notice>No reports are available for your account and department scope.</Notice>}
    {records?.map((r) => <Card key={r._id} style={{ gap: 9 }}><Txt weight="700">{r.symptoms}</Txt><Badge label={r.triagedPriority ?? r.priority} tone="warning" /><Detail label="Reference" value={r._id} /><Detail label="Category" value={r.category} /><Txt muted size={12}>{new Date(r.createdAt).toLocaleString()}</Txt>
      {account?.capabilities.includes("assign") && <Button label="Create maintenance task" variant="secondary" onPress={() => go("live-task-create", r._id)} />}
    </Card>)}
    <Txt size={11} muted>Up to 100 recent reports per authorized department. Clinicians see their own reports.</Txt>
  </Screen>;
}
function ReportForm({ id }: { id?: string }) {
  const records = useQuery(staffApi.operations.equipment);
  const submit = useMutation(staffApi.operations.submitReport);
  const { connected } = useStaffAccess();
  const [selectedId, setSelectedId] = useState(id ?? "");
  const [category, setCategory] = useState(""); const [symptoms, setSymptoms] = useState("");
  const [description, setDescription] = useState(""); const [priority, setPriority] = useState<Priority>("High");
  const [condition, setCondition] = useState(""); const [inUse, setInUse] = useState("");
  const [noticedAt, setNoticedAt] = useState(() => new Date().toISOString());
  const [operationId, setOperationId] = useState(randomUUID); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const labels = records?.map((r) => `${r.assetId} · ${r.name}`) ?? [];
  const send = async () => {
    if (!connected || busy) return;
    const equipment = records?.find((r) => r._id === selectedId);
    if (!equipment || !inUse) { setMessage("Choose equipment and confirm whether it is in use."); return; }
    setBusy(true); setMessage("");
    try { const result = await submit({ equipmentId: equipment._id, operationId, category, symptoms, description, priority, condition, inUse: inUse === "Yes", noticedAt: Date.parse(noticedAt) }); setSubmitted(result); }
    catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); }
  };
  if (submitted) return <Screen title="Report Received"><Card style={{ gap: 12 }}><Badge label="Server received" tone="success" /><Detail label="Report reference" value={submitted} /><Txt>Your report was recorded by the staff service. It does not establish maintenance acceptance or equipment availability.</Txt></Card><Button label="View reports" onPress={() => go("live-reports")} /><Button label="Report another fault" variant="secondary" onPress={() => { setSubmitted(null); setOperationId(randomUUID()); setCategory(""); setSymptoms(""); setDescription(""); setCondition(""); setInUse(""); setNoticedAt(new Date().toISOString()); }} /></Screen>;
  return <Screen title="Report a Fault" subtitle="Submit equipment information through your approved staff account.">
    <Select label="Equipment" values={labels} value={records?.find((r) => r._id === selectedId) ? `${records.find((r) => r._id === selectedId)!.assetId} · ${records.find((r) => r._id === selectedId)!.name}` : ""} onChange={(label) => setSelectedId(records?.find((r) => `${r.assetId} · ${r.name}` === label)?._id ?? "")} />
    <Select label="Fault category" values={["Electrical/Power", "Mechanical/Physical", "Performance/Function", "Controls/Display", "Accessories/Connections", "Alarm/Safety Concern", "Other/Unknown"]} value={category} onChange={setCategory} />
    <Field label="Specific symptoms" value={symptoms} onChangeText={setSymptoms} maxLength={300} />
    <Field label="Full description (optional)" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    <Choices label="Suggested priority" values={["Urgent", "High", "Routine"]} value={priority} onChange={setPriority} />
    <Select label="Reported condition" values={["Not functioning (reported)", "Functioning with concern", "Unknown"]} value={condition} onChange={setCondition} />
    <Choices label="Equipment in use?" values={["Yes", "No"]} value={inUse} onChange={setInUse} />
    <DateTimeField label="Time noticed" value={noticedAt} onChange={setNoticedAt} />
    <Notice>Live attachment uploads are not configured. This report contains text only.</Notice>
    {message && <Notice>{message}</Notice>}
    <Button label="Submit report" loading={busy} disabled={!connected || !records?.length} onPress={() => void send()} />
  </Screen>;
}
function LiveTasks() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["assign", "repair", "clinical", "technical"].includes(c))) return <Restricted />;
  return <TaskList />;
}
function TaskList() {
  const records = useQuery(staffApi.operations.tasks);
  return <Screen title="Maintenance Tasks" back={false}>
    {records === undefined && <Notice>Loading authorized maintenance tasks…</Notice>}
    {records?.length === 0 && <Notice>No maintenance tasks in your authorized scope.</Notice>}
    {records?.map((r) => <LinkRow key={r._id} title={r.state} detail={`Due ${new Date(r.dueAt).toLocaleString()}\n${r._id}`} onPress={() => go("live-task", r._id)} />)}
  </Screen>;
}
function TaskLoader({ id }: { id: string }) {
  const tasks = useQuery(staffApi.operations.tasks); const task = tasks?.find((t) => t._id === id);
  if (!task) return <Screen title="Maintenance task"><Notice>{tasks ? "Task unavailable in your scope." : "Loading task…"}</Notice></Screen>;
  return <TaskForm key={`${task._id}:${task.revision}`} task={task} />;
}
function TaskForm({ task }: { task: FunctionReturnType<typeof staffApi.operations.tasks>[number] }) {
  const { account } = useStaffAccess();
  const save = useMutation(staffApi.operations.recordWork);
  const [diagnosis, setDiagnosis] = useState(task.diagnosis); const [notes, setNotes] = useState(task.notes); const [parts, setParts] = useState(task.parts.join(", "));
  const terminal = ["Completed", "Cancelled"].includes(task.state);
  const canRepair = account?.capabilities.includes("repair") && task.assigneeId === account.id && !terminal;
  return <Screen title="Maintenance Task"><Card style={{ gap: 9 }}><Badge label={task.state} tone="warning" /><Detail label="Reference" value={task._id} /><Detail label="Due" value={new Date(task.dueAt).toLocaleString()} /><Detail label="Assigned account" value={task.assigneeId ?? "Unassigned"} /></Card>
    {canRepair ? <>
      <Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} maxLength={2000} multiline /><Field label="Work notes" value={notes} onChangeText={setNotes} multiline maxLength={4000} /><Field label="Parts (comma separated)" value={parts} onChangeText={setParts} />
      <ConfirmAction label="Save work" title="Record maintenance work?" detail="Your work will be recorded under your staff account." onConfirm={() => save({ id: task._id, expectedRevision: task.revision, diagnosis, notes, parts: parts.split(",").map((p) => p.trim()).filter(Boolean), complete: false })} />
      <ConfirmAction label="Complete maintenance" title="Complete this repair?" detail="Completion is retained in history. It does not approve technical verification or release the equipment." onConfirm={() => save({ id: task._id, expectedRevision: task.revision, diagnosis, notes, parts: parts.split(",").map((p) => p.trim()).filter(Boolean), complete: true })} />
    </> : <Card style={{ gap: 8 }}><Detail label="Diagnosis" value={task.diagnosis || "Not recorded"} /><Detail label="Notes" value={task.notes || "Not recorded"} /></Card>}
    {account?.capabilities.includes("assign") && !terminal && <TaskAssignment task={task} />}
    <Notice>Production safety verification and equipment release remain blocked until approved policies are configured.</Notice>
  </Screen>;
}
function TaskAssignment({ task }: { task: FunctionReturnType<typeof staffApi.operations.tasks>[number] }) {
  const technicians = useQuery(staffApi.operations.technicians, { departmentId: task.departmentId });
  const assign = useMutation(staffApi.operations.assign); const changeDue = useMutation(staffApi.operations.changeDue); const cancel = useMutation(staffApi.operations.cancelTask);
  const [selected, setSelected] = useState(""); const [due, setDue] = useState(new Date(task.dueAt).toISOString()); const [reason, setReason] = useState("");
  const technician = technicians?.find((t) => `${t.name} · ${t.staffId}` === selected);
  return <Section title="Assignment and due date">
    <Select label="Authorized technician" values={technicians?.map((t) => `${t.name} · ${t.staffId}`) ?? []} value={selected} onChange={setSelected} />
    <DateTimeField label="Due date" value={due} onChange={setDue} /><Field label="Justification" value={reason} onChangeText={setReason} maxLength={500} />
    <ConfirmAction label="Assign technician" title="Confirm assignment?" detail="The assignee and due date will be validated against department access." disabled={!technician || !reason.trim()} onConfirm={() => assign({ id: task._id, expectedRevision: task.revision, assigneeId: technician!.id, dueAt: Date.parse(due), reason })} />
    <ConfirmAction label="Update due date" title="Change due date?" detail="The previous due date is retained in the audit history." disabled={!reason.trim()} onConfirm={() => changeDue({ id: task._id, expectedRevision: task.revision, dueAt: Date.parse(due), reason })} />
    <ConfirmAction label="Cancel task" title="Cancel this maintenance task?" detail="This affects active maintenance work and is audited." danger disabled={!reason.trim()} onConfirm={() => cancel({ id: task._id, expectedRevision: task.revision, reason })} />
  </Section>;
}
function TaskCreation({ id }: { id: string }) {
  const reports = useQuery(staffApi.operations.reports); const report = reports?.find((r) => r._id === id);
  const create = useMutation(staffApi.operations.createTask); const [due, setDue] = useState(""); const [message, setMessage] = useState("");
  return <Screen title="Create Maintenance Task"><Notice>{report ? report.symptoms : "Loading authorized report…"}</Notice>
    <DateTimeField label="Required due date" value={due} onChange={setDue} required />
    {message && <Notice>{message}</Notice>}
    <ConfirmAction label="Create task" title="Create a maintenance task?" detail="A verified equipment identity and an explicit future due date are required." disabled={!report || !due}
      onConfirm={async () => { const task = await create({ reportId: report!._id, dueAt: Date.parse(due) }); setMessage(`Maintenance task created: ${task}`); }} />
  </Screen>;
}
function LiveProfile() {
  const { account } = useStaffAccess(); const identity = useIdentity();
  return <Screen title="Profile and Security" back={false}>
    <Card style={{ gap: 10 }}><Txt size={24} weight="800">{account?.name}</Txt><Detail label="Verified Staff ID" value={account?.staffId ?? ""} /><Detail label="Approved role" value={account?.role ?? ""} /><Detail label="Email" value={account?.email ?? ""} /><Detail label="Authorized departments" value={String(account?.scope.length ?? 0)} /></Card>
    <LinkRow title="Appearance and accessibility" icon="settings-outline" onPress={() => go("settings")} />
    <ConfirmAction label="Sign out" title="Sign out of SmartMaint?" detail="Protected views and account data will be cleared from this session." onConfirm={async () => { await identity.signOut(); router.replace("/access/sign-in"); }} />
  </Screen>;
}
function Analytics() {
  const result = useQuery(staffApi.operations.analytics);
  return <Screen title="Department Summary">{result ? <Card style={{ gap: 10 }}><Detail label="Authorized departments" value={String(result.scopeCount)} /><Detail label="Reports" value={String(result.reports)} /><Detail label="High or urgent priority" value={String(result.highPriority)} /><Txt size={11} muted>Limited to {result.truncatedAtPerDepartment} recent reports per department.</Txt></Card> : <Notice>Loading authorized summary…</Notice>}</Screen>;
}
function Export() {
  const result = useQuery(staffApi.operations.exportReports);
  const [message, setMessage] = useState("");
  const share = async () => { try { if (!result) return;
    if (Platform.OS === "web") { const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "smartmaint-authorized-reports.csv"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    else await Share.share({ message: result.csv, title: "Authorized SmartMaint reports" });
  } catch (e) { setMessage(authErrorMessage(e)); } };
  return <Screen title="Authorized Reports Export"><Notice>Only reports in your authorized departments are included. Up to {result?.truncatedAtPerDepartment ?? 100} reports per department.</Notice>{message && <Notice tone="warning">{message}</Notice>}<Button label="Share CSV" disabled={!result} onPress={() => void share()} /></Screen>;
}

export function LiveFlow({ screen, id }: { screen: string; id?: string }) {
  const { account } = useStaffAccess();
  if (!account) return <Restricted />;
  if (screen === "staff-review" && id) return <StaffApplicationReview id={id} />;
  if (screen === "staff-accounts") return <StaffAccounts />;
  if (screen === "staff-role" && id) return <StaffRoleAssignment id={id} />;
  if (screen === "staff-audit" && account.capabilities.includes("audit")) return <StaffAudit />;
  if (screen === "live-report" && account.capabilities.includes("report")) return <ReportForm id={id} />;
  if (screen === "live-reports") return <LiveReports />;
  if (screen === "live-equipment" && id) return <EquipmentDetail id={id} />;
  if (screen === "live-tasks") return <LiveTasks />;
  if (screen === "live-task" && id && account.capabilities.some((c) => ["repair", "assign", "technical", "clinical"].includes(c))) return <TaskLoader id={id} />;
  if (screen === "live-task-create" && id && account.capabilities.includes("assign")) return <TaskCreation id={id} />;
  if (screen === "live-analytics" && account.capabilities.includes("analytics")) return <Analytics />;
  if (screen === "live-export" && account.capabilities.includes("export")) return <Export />;
  return <Screen title="Workflow unavailable"><Notice>This workflow is not configured for live staff accounts. Synthetic preview actions cannot modify live records.</Notice></Screen>;
}
