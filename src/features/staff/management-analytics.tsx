import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useConvex } from "convex/react";
import type { GenericId } from "convex/values";
import { Button, Card, Detail, LinkRow, Notice, Row, Screen, Txt, usePalette } from "@/components/smart/ui";
import { LoadingState, StatGrid } from "@/components/smart/status-ui";
import { collectManagementMetrics, type ManagementCounts, type MetricsProgress } from "@/domain/management-metrics";
import { tokens } from "@/design/tokens";
import { go } from "@/navigation/go";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { useStaffAccess } from "./provider";

const sourceLabels = { equipment: "equipment", faultReports: "submitted reports", maintenanceTasks: "maintenance tasks", safetyHolds: "safety holds", releaseRecords: "release decisions" };

export function ManagementAnalytics() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.includes("analytics")) return <Screen title="Analytics unavailable"><Notice>Your approved account needs analytics access.</Notice></Screen>;
  return <AnalyticsCalculation key={`${account.id}:${account.revision}:${account.scope.join(",")}`} departments={account.scope} canExport={account.capabilities.includes("export")} canReconcile={account.capabilities.includes("reconcile")} />;
}

function AnalyticsCalculation({ departments, canExport, canReconcile }: { departments: GenericId<"departments">[]; canExport: boolean; canReconcile: boolean }) {
  const client = useConvex();
  const requestVersion = useRef(0);
  const [generation, setGeneration] = useState(0);
  const [result, setResult] = useState<{ counts: ManagementCounts; at: number } | null>(null);
  const [progress, setProgress] = useState<MetricsProgress | null>(null);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const scopeKey = departments.join(",");
  useEffect(() => {
    if (cancelled) return;
    let current = true;
    const started = requestVersion.current;
    const isCurrent = () => current && requestVersion.current === started;
    const scope = scopeKey.split(",") as GenericId<"departments">[];
    void collectManagementMetrics(scope, (departmentId, source, cursor) => client.query(staffApi.extensions.metricsPage, { departmentId, source, paginationOpts: { cursor, numItems: 100 } }), isCurrent, value => { if (isCurrent()) setProgress(value); })
      .then(counts => { if (isCurrent()) { setResult({ counts, at: Date.now() }); setProgress(null); } })
      .catch(failure => { if (isCurrent()) { setError(authErrorMessage(failure)); setProgress(null); } });
    return () => { current = false; };
  }, [client, scopeKey, generation, cancelled]);
  const counts = result?.counts;
  const refresh = () => { requestVersion.current++; setCancelled(false); setError(""); setResult(null); setProgress(null); setGeneration(value => value + 1); };
  return <Screen title="Analytics & Data Quality" subtitle="Equipment, reports and maintenance across your authorized departments.">
    <Notice>Totals include all authorized records read during this calculation. Records may change while it runs. Repair completion and historical release decisions do not establish current equipment availability.</Notice>
    {!counts && !error && !cancelled && <Card style={{ gap: 10 }}><LoadingState label="Calculating recorded totals…" />{progress && <><Txt accessibilityLiveRegion="polite">Reading {sourceLabels[progress.source]} · Department {progress.department} of {progress.departments}</Txt><Txt muted variant="caption">{progress.records.toLocaleString()} records read</Txt></>}<Button label="Cancel calculation" variant="secondary" onPress={() => { requestVersion.current++; setCancelled(true); setProgress(null); }} /></Card>}
    {cancelled && <Notice>Calculation cancelled. No partial totals are shown.</Notice>}
    {!!error && <Notice tone="warning">{error}</Notice>}
    {result && <ManagementOverview counts={result.counts} at={result.at} departmentCount={departments.length} canReconcile={canReconcile} />}
    {(!!counts || !!error || cancelled) && <Button label={error || cancelled ? "Retry calculation" : "Recalculate totals"} icon="refresh-outline" onPress={refresh} />}
    {canExport && <Button label="Export reports" icon="download-outline" variant="secondary" onPress={() => go("export")} />}
  </Screen>;
}

export function ManagementOverview({ counts, at, departmentCount, canReconcile = false }: { counts: ManagementCounts; at: number; departmentCount: number; canReconcile?: boolean }) {
  const p = usePalette();
  const complete = counts.equipment - counts.incompleteRecords;
  return <>
      <Txt muted variant="caption">Calculated {new Date(at).toLocaleString()} · {departmentCount} authorized department(s)</Txt>
      <StatGrid items={[
        { label: "Equipment", value: counts.equipment, detail: "All inventory records", icon: "desktop-outline" },
        { label: "Submitted reports", value: counts.reports, detail: "Private drafts excluded", icon: "document-text-outline" },
        { label: "Open tasks", value: counts.openTasks, detail: "Unfinished maintenance work", icon: "time-outline", tone: "warning" },
        { label: "Active holds", value: counts.activeHolds, detail: "Recorded safety restrictions", icon: "warning-outline", tone: "danger" },
      ]} />
      <Card style={{ gap: 14 }}><Txt variant="section">Data Completeness</Txt><Txt muted>Inventory records with an asset ID, name, model and location.</Txt><Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Txt variant="metric">{counts.equipment ? `${Math.round(complete / counts.equipment * 100)}%` : "No inventory"}</Txt><Txt muted>{counts.equipment} records</Txt></Row><View style={{ height: 12, borderRadius: 6, backgroundColor: p.border, overflow: "hidden" }}><View style={{ height: "100%", backgroundColor: tokens.blue, width: `${counts.equipment ? complete / counts.equipment * 100 : 0}%` }} /></View><Detail label="Complete records" value={complete} /><Detail label="Missing required fields" value={counts.incompleteRecords} /><Detail label="Verified inventory identities" value={counts.verifiedIdentities} />{canReconcile && <LinkRow title="Review identity issues" icon="list-outline" onPress={() => go("reconcile")} />}</Card>
      <Card style={{ gap: 16 }}><Txt variant="section">Reported Priorities</Txt>{(["Urgent", "High", "Routine"] as const).map(priority => <View key={priority} style={{ gap: 6 }}><Row style={{ justifyContent: "space-between" }}><Txt>{priority}</Txt><Txt weight="700">{counts[priority]}</Txt></Row><View style={{ height: 8, borderRadius: 4, backgroundColor: p.border, overflow: "hidden" }}><View style={{ height: "100%", width: `${counts.reports ? counts[priority] / counts.reports * 100 : 0}%`, backgroundColor: priority === "Urgent" ? tokens.danger : priority === "High" ? tokens.warning : tokens.blue }} /></View></View>)}</Card>
      <Card style={{ gap: 12 }}><Txt variant="section">Maintenance and Release Records</Txt><Detail label="Completed repairs" value={counts.completedRepairs} /><Detail label="Historical release decisions" value={counts.releaseDecisions} /><Detail label="Average recorded repair elapsed time" value={counts.timedRepairs ? `${(counts.recordedRepairElapsedMs / counts.timedRepairs / 3600000).toFixed(1)} hours` : "No recorded completion times"} /><Txt muted variant="caption">Elapsed time runs from work-order creation to its recorded repair completion. {counts.timedRepairs} of {counts.completedRepairs} completed repairs have usable completion timestamps. This is not clinical downtime or hands-on repair duration.</Txt></Card>
    </>;
}
