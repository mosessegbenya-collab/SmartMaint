import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Badge, Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
import { StatusPanel } from "@/components/smart/status-ui";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ScopeSelect } from "./operational-screens";

export function IdentityReview() {
  const { account } = useStaffAccess();
  const [department, setDepartment] = useState<GenericId<"departments"> | null>(account?.scope[0] ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const page = usePaginatedQuery(staffApi.workflows.provisionalPage, department ? { departmentId: department } : "skip", { initialNumItems: 20 });
  const report = page.results.find((record) => record._id === selected);
  return <Screen title="Equipment Identity Review" subtitle="Review unverified reports against authoritative inventory.">
    <StatusPanel title="Restricted identity review" detail="Only authorized staff can review these records. Institutional reconciliation policy is not configured, so linking or approving an identity remains disabled." icon="lock-closed-outline" tone="warning" />
    <ScopeSelect value={department} onChange={(value) => { setDepartment(value); setSelected(null); }} />
    {page.status === "LoadingFirstPage" && <Notice>Loading authorized provisional reports…</Notice>}
    {!page.results.length && page.status === "Exhausted" && <Card style={{ gap: 8 }}><Txt size={19} weight="700">No unverified reports</Txt><Txt muted>No provisional reports have been recorded in this department.</Txt></Card>}
    {report ? <>
      <Card style={{ gap: 12 }}><Badge label="Original identity preserved" tone="warning" /><Txt size={20} weight="700">{report.rawIdentifier}</Txt><Detail label="Report reference" value={report._id} /><Detail label="Equipment type" value={report.equipmentType} /><Detail label="Reported location" value={report.location} /><Detail label="Reported priority" value={report.priority} /><Detail label="Reported" value={new Date(report.createdAt).toLocaleString()} /><Txt size={17} weight="700">Fault details</Txt><Txt>{report.symptoms}</Txt></Card>
      <Card style={{ gap: 10 }}><Txt size={19} weight="700">Authoritative inventory review</Txt><Txt>Compare the original identifier, equipment type and reported location with verified institutional inventory. A search match alone does not approve the provisional identity or release equipment.</Txt><Button label="Look up original identifier" variant="secondary" icon="search-outline" onPress={() => go("manual", report.rawIdentifier)} /></Card>
      <Notice>Approved reconciliation rules and evidence requirements must be configured before a report can be linked to verified inventory.</Notice>
      <Button label="Return to provisional reports" variant="secondary" onPress={() => setSelected(null)} />
    </> : page.results.map((record) => <Card key={record._id} style={{ gap: 10 }}><Badge label="Unverified identity" tone="warning" /><Txt size={20} weight="700">{record.rawIdentifier}</Txt><Txt>{record.equipmentType}</Txt><Txt muted>{record.location}</Txt><Button label="Review identity details" variant="secondary" onPress={() => setSelected(record._id)} /></Card>)}
    {!report && page.status !== "Exhausted" && <Button label="Load more reports" variant="secondary" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}
  </Screen>;
}
