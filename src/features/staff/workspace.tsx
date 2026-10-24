import { useState, type ComponentType } from "react";
import { Platform, Share } from "react-native";
import { Redirect, router } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Section, Select, Txt } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { useApp } from "@/state/app-state";
import { useIdentity } from "@/features/access/identity";
import { useStaffAccess } from "./provider";
import { tabItems } from "@/navigation/tabs";
import { go } from "@/navigation/go";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { StaffAdministration, StaffApplicationReview, StaffRoleAssignment, StaffAccounts, StaffAudit } from "./administration";
import { ConfirmAction } from "./ui";
import { ReportingJourney, ResumeReport } from "./reporting-journey";
import { EquipmentHistory, EquipmentLookup, EquipmentRecord, EquipmentRegistry, HoldControls, NotificationInbox, OperationalList, ProvisionalForm, ReportDetail, WorkHistory } from "./operational-screens";
import type { GenericId } from "convex/values";
import { ReleaseScreen, VerificationActions, VerificationScreen } from "./safety-screens";
import { PreventiveCreate, PreventiveSchedules } from "./preventive-screens";
import { ReportQueueScreen } from "./report-queue";
import { StaffDataBoundary } from "./data-boundary";

export function StaffWorkspaceRoute({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
  return <StaffDataBoundary key={screen}><WorkspaceScreen screen={screen} preview={Preview} /></StaffDataBoundary>;
}
function WorkspaceScreen({ screen, preview: Preview }: { screen: string; preview: ComponentType }) {
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
  return <NotificationInbox />;
}
function Restricted() { return <Screen title="Access restricted"><Notice>This destination is outside your approved staff access.</Notice></Screen>; }
function LiveHome() {
  const { account } = useStaffAccess();
  const unread = useQuery(staffApi.workflows.hasUnreadNotice);
  return <Screen title={account?.role === "Clinician" || account?.role === "Biomedical Technician" ? "Home" : "Overview"} subtitle="Approved staff workspace" back={false}>
    <Card style={{ gap: 8 }}><Txt size={26} weight="800">Hello, {account?.name}</Txt><Badge label={account?.role ?? "Staff"} tone="info" /><Txt muted>Access is limited to your authorized departments and capabilities.</Txt></Card>
    {unread && <LinkRow title="Unread notifications" icon="notifications-outline" onPress={() => router.push("/workspace/notifications")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Report a Fault" detail="Submit a report for authorized equipment" icon="warning-outline" onPress={() => go("live-report")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Scan Equipment QR" icon="qr-code-outline" onPress={() => go("scan")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Urgent Fault Report" icon="alert-circle-outline" onPress={() => go("emergency")} />}
    {account?.role === "Administrator" && account.capabilities.includes("reconcile") && <LinkRow title="Equipment Registry" icon="medkit-outline" onPress={() => go("equipment-registry")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Fault reports" icon="document-text-outline" onPress={() => go("live-reports")} />}
    {account?.capabilities.includes("report") && <LinkRow title="Report synchronization" icon="sync-outline" onPress={() => go("sync")} />}
    {account?.capabilities.some((c) => ["assign", "repair", "technical", "clinical"].includes(c)) && <LinkRow title="Maintenance tasks" icon="construct-outline" onPress={() => go("live-tasks")} />}
    {account?.capabilities.includes("technical") && <LinkRow title="Technical verification queue" onPress={() => go("technical-queue")} />}
    {account?.capabilities.includes("clinical") && <LinkRow title="Clinical verification queue" onPress={() => go("clinical-queue")} />}
    {account?.capabilities.includes("reconcile") && <LinkRow title="Unverified identity review" onPress={() => go("reconcile")} />}
    {account?.capabilities.some((c) => ["assign", "repair"].includes(c)) && <LinkRow title="Preventive Maintenance" icon="calendar-outline" onPress={() => go("preventive-schedules")} />}
    {account?.capabilities.includes("accounts") && <LinkRow title="Staff Applications" detail="Institutional identity and access review" icon="people-outline" onPress={() => router.push("/workspace/accounts")} />}
    {account?.capabilities.includes("audit") && <LinkRow title="Authorization Audit" icon="shield-checkmark-outline" onPress={() => go("staff-audit")} />}
    {account?.capabilities.includes("analytics") && <LinkRow title="Department Summary" icon="bar-chart-outline" onPress={() => go("live-analytics")} />}
    {account?.capabilities.includes("export") && <LinkRow title="Authorized Reports Export" icon="download-outline" onPress={() => go("live-export")} />}
    <Notice>Equipment release, clinical checklists and safety-hold clearance remain unavailable until their production policies are approved.</Notice>
  </Screen>;
}
function LiveEquipment() {
  return <OperationalList kind="equipment" />;
}
function EquipmentDetail({ id }: { id: string }) {
  return <EquipmentRecord id={id} />;
}
function LiveReports() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["report", "triage", "assign"].includes(c))) return account?.capabilities.includes("analytics") ? <Analytics /> : account?.capabilities.includes("export") ? <Export /> : <Restricted />;
  return <ReportList />;
}
function ReportList() {
  return <OperationalList kind="reports" />;
}
function ReportForm({ id }: { id?: string }) { return <ReportingJourney id={id} />; }
function LiveTasks() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["assign", "repair", "clinical", "technical"].includes(c))) return <Restricted />;
  return <TaskList />;
}
function TaskList() {
  return <OperationalList kind="tasks" />;
}
function TaskLoader({ id }: { id: string }) {
  const task = useQuery(staffApi.workflows.taskDetail, { id: id as GenericId<"maintenanceTasks"> });
  if (!task) return <Screen title="Maintenance task"><Notice>Loading authorized task…</Notice></Screen>;
  return <TaskForm key={`${task._id}:${task.revision}`} task={task} />;
}
function TaskForm({ task }: { task: FunctionReturnType<typeof staffApi.operations.tasks>[number] }) {
  const { account } = useStaffAccess();
  const save = useMutation(staffApi.operations.recordWork);
  const [diagnosis, setDiagnosis] = useState(task.diagnosis); const [notes, setNotes] = useState(task.notes); const [parts, setParts] = useState(task.parts.join(", "));
  const [preventiveResults, setPreventiveResults] = useState(task.preventiveResults ?? task.preventiveChecklist?.map((label) => ({ label, passed: false })));
  const terminal = ["Completed", "Cancelled"].includes(task.state);
  const canRepair = account?.capabilities.includes("repair") && task.assigneeId === account.id && !terminal;
  return <Screen title="Maintenance Task"><Card style={{ gap: 9 }}><Badge label={task.state} tone="warning" /><Detail label="Reference" value={task._id} /><Detail label="Due" value={new Date(task.dueAt).toLocaleString()} /><Detail label="Assigned account" value={task.assigneeId ?? "Unassigned"} /></Card>
    {canRepair ? <>
      {task.preventiveChecklist && <Card style={{ gap: 8 }}><Txt weight="700">Scheduled maintenance checklist</Txt>{preventiveResults?.map((check, index) => <Choices key={check.label} label={check.label} values={["Not completed", "Completed"]} value={check.passed ? "Completed" : "Not completed"} onChange={(value) => setPreventiveResults((prior) => prior?.map((r, i) => i === index ? { ...r, passed: value === "Completed" } : r))} />)}</Card>}
      <Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} maxLength={2000} multiline /><Field label="Work notes" value={notes} onChangeText={setNotes} multiline maxLength={4000} /><Field label="Parts (comma separated)" value={parts} onChangeText={setParts} />
      <ConfirmAction label="Save work" title="Record maintenance work?" detail="Your work will be recorded under your staff account." onConfirm={() => save({ id: task._id, expectedRevision: task.revision, diagnosis, notes, parts: parts.split(",").map((p) => p.trim()).filter(Boolean), complete: false, preventiveResults })} />
      <ConfirmAction label="Complete maintenance" title="Complete this repair?" detail="Completion is retained in history. It does not approve technical verification or release the equipment." onConfirm={() => save({ id: task._id, expectedRevision: task.revision, diagnosis, notes, parts: parts.split(",").map((p) => p.trim()).filter(Boolean), complete: true, preventiveResults })} />
    </> : <Card style={{ gap: 8 }}><Detail label="Diagnosis" value={task.diagnosis || "Not recorded"} /><Detail label="Notes" value={task.notes || "Not recorded"} /></Card>}
    {account?.capabilities.includes("assign") && !terminal && <TaskAssignment task={task} />}
    <WorkHistory id={task._id} />
    {task.state === "Completed" && <VerificationActions id={task._id} assignee={task.assigneeId} />}
    <Notice>Completing repair does not release equipment. Current independent checks and an approved institutional policy are required.</Notice>
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
  const report = useQuery(staffApi.workflows.reportDetail, { id: id as GenericId<"faultReports"> });
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
  return <StaffDataBoundary key={`${screen}:${id ?? ""}`}><LiveFlowContent screen={screen} id={id} /></StaffDataBoundary>;
}
function LiveFlowContent({ screen, id }: { screen: string; id?: string }) {
  const { account } = useStaffAccess();
  if (!account) return <Restricted />;
  if (screen === "reconcile") return account.capabilities.includes("reconcile") ? <OperationalList kind="provisional" /> : <Restricted />;
  if (["sync", "queue", "upload-failed", "conflict"].includes(screen) && account.capabilities.includes("report")) return <ReportQueueScreen />;
  if (["technical-queue", "clinical-queue"].includes(screen)) {
    const kind = screen === "technical-queue" ? "technical" : "clinical";
    return account.capabilities.includes(kind) ? <OperationalList kind="tasks" verification={kind} /> : <Restricted />;
  }
  if (["technical-checklist", "technical-result", "technical-history"].includes(screen)) return !account.capabilities.includes("technical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="technical" /> : <OperationalList kind="tasks" verification="technical" />;
  if (["clinical-checklist", "clinical-result", "clinical-history"].includes(screen)) return !account.capabilities.includes("clinical") ? <Restricted /> : id ? <VerificationScreen id={id} kind="clinical" /> : <OperationalList kind="tasks" verification="clinical" />;
  if (["equipment-history", "status-timeline"].includes(screen)) return id ? <EquipmentHistory id={id} /> : <LiveEquipment />;
  if (screen === "equipment-detail") return id ? <EquipmentDetail id={id} /> : <LiveEquipment />;
  if (["task-detail", "assignment", "due-date", "cancellation", "progress", "diagnosis", "parts", "completion", "rework", "maintenance-history"].includes(screen)) return id ? <TaskLoader id={id} /> : <LiveTasks />;
  if (["triage", "submitted", "emergency-result"].includes(screen)) return id ? <ReportDetail id={id} /> : <LiveReports />;
  if (screen === "filters") return <LiveReports />;
  if (screen === "fault-details" && account.capabilities.includes("report")) return <ReportForm id={id} />;
  if (["camera", "attachments", "review", "emergency-review"].includes(screen) && account.capabilities.includes("report")) return id ? <ResumeReport id={id} stage={["review", "emergency-review"].includes(screen) ? 3 : 2} /> : <LiveReports />;
  if (screen === "analytics" && account.capabilities.includes("analytics")) return <Analytics />;
  if (screen === "export" && account.capabilities.includes("export")) return <Export />;
  if (screen === "audit" && account.capabilities.includes("audit")) return <StaffAudit />;
  if (["role", "suspend"].includes(screen)) return id ? <StaffRoleAssignment id={id} /> : <StaffAccounts />;
  if (screen === "preventive-schedules") return <PreventiveSchedules />;
  if (screen === "preventive-create") return <PreventiveCreate id={id} />;
  if (screen === "technical-verification" && id) return <VerificationScreen id={id} kind="technical" />;
  if (screen === "clinical-verification" && id) return <VerificationScreen id={id} kind="clinical" />;
  if (["release", "availability"].includes(screen) && id) return <ReleaseScreen id={id} />;
  if (screen === "resume-report" && id && account.capabilities.includes("report")) return <ResumeReport id={id} />;
  if (["emergency", "emergency-verify", "emergency-form"].includes(screen) && account.capabilities.includes("report")) return <ReportingJourney id={id} emergency />;
  if (["scan", "manual", "unmatched"].includes(screen)) return <EquipmentLookup scan={screen === "scan"} />;
  if (screen === "equipment-registry") return <EquipmentRegistry />;
  if (screen === "provisional") return <ProvisionalForm identifier={id ?? ""} />;
  if (screen === "live-provisional-reports") return <OperationalList kind="provisional" />;
  if (screen === "report-detail" && id) return <ReportDetail id={id} />;
  if (["holds", "hold-detail"].includes(screen) && id) return <HoldControls id={id} />;
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
  return <Restricted />;
}
