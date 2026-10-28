import { useEffect, useRef, useState } from "react";
import { Platform, Share } from "react-native";
import { useConvex } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Detail, Field, Notice, Screen, Select, Txt } from "@/components/smart/ui";
import { DateTimeField } from "@/components/smart/date-time-field";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { useStaffAccess } from "./provider";
import { ScopeSelect } from "./operational-screens";
import { collectReportExport } from "@/domain/paged-export";
import { File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import { deliverAuthorizedExport } from "@/domain/export-delivery";
import { accessCacheKey, decodeStaffResolution } from "@/domain/staff-access";

let exportAuthorizationSequence = 0;

export { ManagementAnalytics } from "./management-analytics";

type ExportSelection = { departmentId: GenericId<"departments">; from?: number; to?: number; priority?: "Urgent" | "High" | "Routine" };
export function ReportsExport() {
  const client = useConvex(); const active = useRef(true); const version = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const access = useStaffAccess();
  const { account } = access;
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
    const started = version.current;
    const isCurrent = () => current && active.current && version.current === started;
    void collectReportExport((cursor) => client.query(staffApi.extensions.exportPage, { ...selection, paginationOpts: { cursor, numItems: 100 } }), isCurrent).then((value) => { if (isCurrent()) setResult(value); }).catch((failure) => { if (isCurrent()) { setMessage(authErrorMessage(failure)); setSelection(null); } });
    return () => { current = false; };
  }, [selection, client]);
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const valid = !!department && (!from || Number.isFinite(Date.parse(from))) && (!to || Number.isFinite(Date.parse(to))) && (!from || !to || Date.parse(from) <= Date.parse(to));
  const change = () => { version.current++; setSelection(null); setResult(null); setMessage(""); setShowPreview(false); };
  const share = async () => {
    if (!result || !selection || !account || busy) return;
    const started = version.current;
    const current = () => active.current && version.current === started;
    const expectedAccess = accessCacheKey(null, access);
    const authorize = async () => {
      if (!current()) throw Error("Export stopped because the authorized session or selection changed.");
      const resolution = decodeStaffResolution(await client.query(staffApi.staff.resolve, { cacheKey: `export-${Date.now()}-${++exportAuthorizationSequence}` }));
      if (!current() || accessCacheKey(null, resolution) !== expectedAccess || !resolution.account?.capabilities.includes("export") || !resolution.account.scope.includes(selection.departmentId)) throw Error("Export access changed. Generate a fresh export with your current permissions.");
    };
    setBusy(true); setMessage("");
    try {
      if (Platform.OS === "web") {
        await deliverAuthorizedExport({ current, authorize, chooseDestination: async () => "download", write: async () => {
          const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
          try { const anchor = document.createElement("a"); anchor.href = url; anchor.download = "smartmaint-authorized-reports.csv"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
        } });
      } else if (Platform.OS === "android") {
        const outcome = await deliverAuthorizedExport({ current, authorize, chooseDestination: async () => {
          const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
          return permission.granted ? permission.directoryUri : null;
        }, write: async (directoryUri) => {
          const uri = await StorageAccessFramework.createFileAsync(directoryUri, `smartmaint-reports-${Date.now()}.csv`, "text/csv");
          await authorize();
          await StorageAccessFramework.writeAsStringAsync(uri, result.csv);
        } });
        if (current()) setMessage(outcome === "cancelled" ? "CSV save cancelled. No completed file export was recorded." : "The complete CSV was saved in your selected folder.");
      } else {
        await deliverAuthorizedExport({ current, authorize, chooseDestination: async () => "share", write: async () => {
          const file = new File(Paths.cache, `smartmaint-reports-${Date.now()}.csv`);
          try {
            file.create(); file.write(result.csv);
            const action = await Share.share({ url: file.uri, title: "Authorized SmartMaint reports" });
            if (current()) setMessage(action.action === Share.dismissedAction ? "CSV sharing cancelled." : "CSV file passed to the selected share activity.");
          } finally {
            try { if (file.exists) file.delete(); }
            catch { if (current()) setMessage("Sharing finished, but its temporary file could not be removed from this device."); }
          }
        } });
      }
    } catch (error) { if (current()) setMessage(authErrorMessage(error)); } finally { if (active.current) setBusy(false); }
  };
  return <Screen title="Export Reports" subtitle="Generate a report from records you are authorized to access.">
    <Notice>All matching submitted reports in this department are read in authorized pages. Concurrent edits may require generating a fresh export. Private drafts are excluded.</Notice>
    <Card style={{ gap: 18 }}><Badge label="Authorized export" /><Detail label="Report type" value="Reports Summary" /><Detail label="Format" value="CSV" /><ScopeSelect value={department} onChange={(value) => { change(); setDepartment(value); }} /><Select label="Effective priority" values={["All", "Urgent", "High", "Routine"]} value={priority} onChange={(value) => { change(); setPriority(value); }} /><DateTimeField label="Record created from (optional)" value={from} onChange={(value) => { change(); setFrom(value); }} /><DateTimeField label="Record created to (optional)" value={to} onChange={(value) => { change(); setTo(value); }} /></Card>
    {!valid && <Notice tone="warning">Choose a department and a valid chronological date range.</Notice>}
    {!!message && <Notice tone="warning">{message}</Notice>}
    <Button label="Generate CSV" icon="document-text-outline" disabled={!valid || busy} loading={!!selection && !result} onPress={() => { version.current++; setMessage(""); setResult(null); setSelection({ departmentId: department!, from: from ? Date.parse(from) : undefined, to: to ? Date.parse(to) : undefined, priority: priority === "All" ? undefined : priority }); }} />
    {result && <Card style={{ gap: 12 }}><Txt size={20} weight="700">Export ready</Txt><Detail label="Matching reports" value={result.count} /><Detail label="Columns" value="Report, Equipment, Category, Priority" /><Txt muted size={12}>{Platform.OS === "web" ? "Download the CSV file to this device." : "Save or share the complete CSV file using your device controls."}</Txt><Button label={Platform.OS === "web" ? "Download CSV" : Platform.OS === "android" ? "Save CSV file" : "Share CSV file"} icon="share-outline" loading={busy} onPress={() => void share()} /><Button label={showPreview ? "Hide CSV preview" : "Preview CSV"} variant="secondary" onPress={() => setShowPreview((value) => !value)} />{showPreview && <Field label="CSV preview" value={result.csv} editable={false} multiline style={{ minHeight: 140 }} />}</Card>}
  </Screen>;
}
