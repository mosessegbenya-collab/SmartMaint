import { useState } from "react";
import { Platform, Share, View } from "react-native";
import { useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Detail, Field, LinkRow, Notice, Row, Screen, Select, Txt, usePalette } from "@/components/smart/ui";
import { StatGrid } from "@/components/smart/status-ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ScopeSelect } from "./operational-screens";
import { tokens } from "@/design/tokens";

export function ManagementAnalytics() {
  const result = useQuery(staffApi.operations.managementSummary);
  const { account } = useStaffAccess();
  const p = usePalette();
  return <Screen title="Analytics & Data Quality" subtitle="Equipment, reports and maintenance across your authorized departments.">
    {result ? <>
      <Notice>Overview uses up to {result.limit} recent records per source in each authorized department. {result.limited ? "At least one source reached this limit; these are sample counts." : "Counts reflect the records in this bounded snapshot."} Repair completion is not a measure of equipment availability.</Notice>
      <StatGrid items={[
        { label: "Equipment", value: result.equipment, detail: "Inventory records in this snapshot", icon: "desktop-outline" },
        { label: "Submitted reports", value: result.reports, detail: "Private drafts excluded", icon: "document-text-outline" },
        { label: "Open tasks", value: result.openTasks, detail: "Unfinished maintenance work", icon: "time-outline", tone: "warning" },
        { label: "Active holds", value: result.activeHolds, detail: "Recorded safety restrictions", icon: "warning-outline", tone: "danger" },
      ]} />
      <Card style={{ gap: 14 }}><Txt size={21} weight="800">Data Completeness</Txt><Txt muted>Inventory records with an asset ID, name, model and location.</Txt><Row style={{ justifyContent: "space-between" }}><Txt size={34} weight="800">{result.equipment ? `${Math.round(result.completeRecords / result.equipment * 100)}%` : "—"}</Txt><Txt muted>{result.equipment} sampled records</Txt></Row><View style={{ height: 12, borderRadius: 6, backgroundColor: p.border, overflow: "hidden" }}><View style={{ height: "100%", backgroundColor: tokens.blue, width: `${result.equipment ? result.completeRecords / result.equipment * 100 : 0}%` }} /></View><Detail label="Complete records" value={result.completeRecords} /><Detail label="Missing required fields" value={result.incompleteRecords} /><Detail label="Verified inventory identities" value={result.verifiedIdentities} />{!!account?.capabilities.includes("reconcile") && <LinkRow title="Review identity issues" icon="list-outline" onPress={() => go("reconcile")} />}</Card>
      <Card style={{ gap: 16 }}><Txt size={21} weight="800">Reported Priorities</Txt>{result.priorities.map((priority) => <View key={priority.label} style={{ gap: 6 }}><Row style={{ justifyContent: "space-between" }}><Txt>{priority.label}</Txt><Txt weight="700">{priority.count}</Txt></Row><View style={{ height: 8, borderRadius: 4, backgroundColor: p.border, overflow: "hidden" }}><View style={{ height: "100%", width: `${result.reports ? priority.count / result.reports * 100 : 0}%`, backgroundColor: priority.label === "Urgent" ? tokens.danger : priority.label === "High" ? tokens.warning : tokens.blue }} /></View></View>)}</Card>
      <Card style={{ gap: 10 }}><Detail label="Authorized departments" value={result.scopeCount} /><Detail label="Completed repairs" value={result.completedRepairs} /><Txt size={12} muted>Independent verification and return-to-service decisions are checked on each equipment record.</Txt></Card>
      {!!account?.capabilities.includes("export") && <Button label="Export reports" icon="download-outline" onPress={() => go("export")} />}
    </> : <Notice>Loading authorized management overview…</Notice>}
  </Screen>;
}
type ExportSelection = { departmentId: GenericId<"departments">; from?: number; to?: number; priority?: "Urgent" | "High" | "Routine" };
export function ReportsExport() {
  const { account } = useStaffAccess();
  const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  const [priority, setPriority] = useState<"All" | "Urgent" | "High" | "Routine">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selection, setSelection] = useState<ExportSelection | null>(null);
  const result = useQuery(staffApi.operations.exportReports, selection ?? "skip");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const valid = !!department && (!from || Number.isFinite(Date.parse(from))) && (!to || Number.isFinite(Date.parse(to))) && (!from || !to || Date.parse(from) <= Date.parse(to));
  const change = () => { setSelection(null); setMessage(""); setShowPreview(false); };
  const share = async () => {
    if (!result || busy) return;
    setBusy(true); setMessage("");
    try {
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
        try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "smartmaint-authorized-reports.csv"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      } else await Share.share({ message: result.csv, title: "Authorized SmartMaint reports (CSV text)" });
    } catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); }
  };
  return <Screen title="Export Reports" subtitle="Generate a report from records you are authorized to access.">
    <Notice>Only submitted reports are included. The export selects from up to 100 recent reports per department; it is not a complete historical export.</Notice>
    <Card style={{ gap: 18 }}><Badge label="Authorized export" /><Detail label="Report type" value="Reports Summary" /><Detail label="Format" value="CSV" /><ScopeSelect value={department} onChange={(value) => { change(); setDepartment(value); }} /><Select label="Effective priority" values={["All", "Urgent", "High", "Routine"]} value={priority} onChange={(value) => { change(); setPriority(value); }} /><DateTimeField label="From (optional)" value={from} onChange={(value) => { change(); setFrom(value); }} /><DateTimeField label="To (optional)" value={to} onChange={(value) => { change(); setTo(value); }} /></Card>
    {!valid && <Notice tone="warning">Choose a department and a valid chronological date range.</Notice>}
    {!!message && <Notice tone="warning">{message}</Notice>}
    <Button label="Generate CSV" icon="document-text-outline" disabled={!valid} loading={!!selection && !result} onPress={() => { setMessage(""); setSelection({ departmentId: department!, from: from ? Date.parse(from) : undefined, to: to ? Date.parse(to) : undefined, priority: priority === "All" ? undefined : priority }); }} />
    {result && <Card style={{ gap: 12 }}><Txt size={20} weight="700">Export ready</Txt><Detail label="Matching reports" value={result.count} /><Detail label="Columns" value="Report, Equipment, Category, Priority" /><Txt muted size={12}>{Platform.OS === "web" ? "Download the CSV file to this device." : "The system share sheet shares the report as CSV text."}</Txt><Button label={Platform.OS === "web" ? "Download CSV" : "Share CSV text"} icon="share-outline" loading={busy} onPress={() => void share()} /><Button label={showPreview ? "Hide CSV preview" : "Preview CSV"} variant="secondary" onPress={() => setShowPreview((value) => !value)} />{showPreview && <Field label="CSV preview" value={result.csv} editable={false} multiline style={{ minHeight: 140 }} />}</Card>}
  </Screen>;
}
