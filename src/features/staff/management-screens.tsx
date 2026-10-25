import { useEffect, useRef, useState } from "react";
import { Platform, Share, View } from "react-native";
import { useConvex, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Detail, Field, LinkRow, Notice, Row, Screen, Select, Txt, usePalette } from "@/components/smart/ui";
import { StatGrid } from "@/components/smart/status-ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ScopeSelect } from "./operational-screens";
import { tokens } from "@/design/tokens";
import { collectReportExport } from "@/domain/paged-export";
import { File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";

export function ManagementAnalytics() {
  const result = useQuery(staffApi.operations.managementSummary);
  const { account } = useStaffAccess();
  const p = usePalette();
  return <Screen title="Analytics & Data Quality" subtitle="Equipment, reports and maintenance across your authorized departments.">
    {result ? <>
      <CompleteMetrics /><Notice>Quick overview uses up to {result.limit} recent records per source in each authorized department. {result.limited ? "At least one source reached this limit; these are sample counts." : "Counts reflect the records in this bounded snapshot."} Use the complete paged calculation above for all recorded totals. Repair completion is not equipment availability.</Notice>
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
function CompleteMetrics() {
  const { account } = useStaffAccess(); const client = useConvex(); const active = useRef(true);
  const [counts, setCounts] = useState<Record<string, number> | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const calculate = async () => {
    if (!account || busy) return; setBusy(true); setCounts(null); setError("");
    try {
      const totals: Record<string, number> = {};
      for (const departmentId of account.scope) for (const source of ["equipment", "faultReports", "maintenanceTasks", "safetyHolds", "releaseRecords"] as const) {
        let cursor: string | null = null; const seen = new Set<string>();
        do {
          if (!active.current) return;
          const page: FunctionReturnType<typeof staffApi.extensions.metricsPage> = await client.query(staffApi.extensions.metricsPage, { departmentId, source, paginationOpts: { cursor, numItems: 100 } });
          for (const [key, value] of Object.entries(page.counts)) totals[key] = (totals[key] ?? 0) + value;
          if (page.isDone) break;
          if (!page.continueCursor || seen.has(page.continueCursor)) throw Error("Metrics pagination stopped progressing. Recalculate before using these totals.");
          cursor = page.continueCursor; seen.add(page.continueCursor);
        } while (true);
      }
      if (active.current) setCounts(totals);
    } catch (failure) { if (active.current) setError(authErrorMessage(failure)); }
    finally { if (active.current) setBusy(false); }
  };
  return <Card style={{ gap: 12 }}><Txt size={20} weight="700">Complete recorded totals</Txt><Notice>Every page rechecks current access. These are totals read during this calculation, not an atomic historical snapshot. Recorded release decisions do not establish current availability; repair elapsed time is not clinical downtime.</Notice><Button label="Calculate all paged totals" loading={busy} onPress={() => void calculate()} />{counts && Object.entries(counts).map(([label, value]) => <Detail key={label} label={label} value={value} />)}{!!error && <Notice tone="warning">{error}</Notice>}</Card>;
}
export function ReportsExport() {
  const client = useConvex(); const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const { account } = useStaffAccess();
  const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  const [priority, setPriority] = useState<"All" | "Urgent" | "High" | "Routine">("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selection, setSelection] = useState<ExportSelection | null>(null);
  const [result, setResult] = useState<{ count: number; csv: string } | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!selection) return;
    let current = true;
    void collectReportExport((cursor) => client.query(staffApi.extensions.exportPage, { ...selection, paginationOpts: { cursor, numItems: 100 } }), () => current && active.current).then((value) => { if (current) setResult(value); }).catch((failure) => { if (current) { setMessage(authErrorMessage(failure)); setSelection(null); } });
    return () => { current = false; };
  }, [selection, client]);
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const valid = !!department && (!from || Number.isFinite(Date.parse(from))) && (!to || Number.isFinite(Date.parse(to))) && (!from || !to || Date.parse(from) <= Date.parse(to));
  const change = () => { setSelection(null); setResult(null); setMessage(""); setShowPreview(false); };
  const share = async () => {
    if (!result || busy) return;
    setBusy(true); setMessage("");
    try {
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
        try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "smartmaint-authorized-reports.csv"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      } else if (Platform.OS === "android") {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) { setMessage("CSV save cancelled. No completed file export was recorded."); return; }
        const uri = await StorageAccessFramework.createFileAsync(permission.directoryUri, `smartmaint-reports-${Date.now()}.csv`, "text/csv");
        await StorageAccessFramework.writeAsStringAsync(uri, result.csv);
        setMessage("The complete CSV was saved in your selected folder.");
      } else {
        const file = new File(Paths.cache, `smartmaint-reports-${Date.now()}.csv`); file.create(); file.write(result.csv);
        const action = await Share.share({ url: file.uri, title: "Authorized SmartMaint reports" });
        setMessage(action.action === Share.dismissedAction ? "CSV sharing cancelled." : "CSV file passed to the selected share activity.");
      }
    } catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); }
  };
  return <Screen title="Export Reports" subtitle="Generate a report from records you are authorized to access.">
    <Notice>All matching submitted reports in this department are read in authorized pages. Concurrent edits may require generating a fresh export. Private drafts are excluded.</Notice>
    <Card style={{ gap: 18 }}><Badge label="Authorized export" /><Detail label="Report type" value="Reports Summary" /><Detail label="Format" value="CSV" /><ScopeSelect value={department} onChange={(value) => { change(); setDepartment(value); }} /><Select label="Effective priority" values={["All", "Urgent", "High", "Routine"]} value={priority} onChange={(value) => { change(); setPriority(value); }} /><DateTimeField label="From (optional)" value={from} onChange={(value) => { change(); setFrom(value); }} /><DateTimeField label="To (optional)" value={to} onChange={(value) => { change(); setTo(value); }} /></Card>
    {!valid && <Notice tone="warning">Choose a department and a valid chronological date range.</Notice>}
    {!!message && <Notice tone="warning">{message}</Notice>}
    <Button label="Generate CSV" icon="document-text-outline" disabled={!valid} loading={!!selection && !result} onPress={() => { setMessage(""); setResult(null); setSelection({ departmentId: department!, from: from ? Date.parse(from) : undefined, to: to ? Date.parse(to) : undefined, priority: priority === "All" ? undefined : priority }); }} />
    {result && <Card style={{ gap: 12 }}><Txt size={20} weight="700">Export ready</Txt><Detail label="Matching reports" value={result.count} /><Detail label="Columns" value="Report, Equipment, Category, Priority" /><Txt muted size={12}>{Platform.OS === "web" ? "Download the CSV file to this device." : "Save or share the complete CSV file using your device controls."}</Txt><Button label={Platform.OS === "web" ? "Download CSV" : Platform.OS === "android" ? "Save CSV file" : "Share CSV file"} icon="share-outline" loading={busy} onPress={() => void share()} /><Button label={showPreview ? "Hide CSV preview" : "Preview CSV"} variant="secondary" onPress={() => setShowPreview((value) => !value)} />{showPreview && <Field label="CSV preview" value={result.csv} editable={false} multiline style={{ minHeight: 140 }} />}</Card>}
  </Screen>;
}
