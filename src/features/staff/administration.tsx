import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import type { FunctionReturnType } from "convex/server";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Section, Select, Txt } from "@/components/smart/ui";
import { roles, type Capability, type Role } from "@/domain/models";
import { roleCapabilities } from "@/domain/role-policy";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";
import { useStaffAccess } from "./provider";
import { ConfirmAction, MultiChoice } from "./ui";

function Restricted() { return <Screen title="Review access restricted"><Notice>Authorized account-management permission is required.</Notice></Screen>; }
export function StaffAdministration() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.includes("accounts")) return <Restricted />;
  return <ApplicationList />;
}
function ApplicationList() {
  const { account } = useStaffAccess();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [department, setDepartment] = useState(() => account?.scope[0] ?? null);
  const page = usePaginatedQuery(staffApi.administration.applicationPage, department && account ? { status, departmentId: department } : "skip", { initialNumItems: 20 });
  const applications = page.results;
  return <Screen title="Staff Applications" subtitle="Verify institutional identity and review staff access." back={false}>
    <Choices label="Application status" values={["pending", "approved", "rejected"]} value={status} onChange={setStatus} />
    <DepartmentFilter value={department} onChange={setDepartment} />
    {page.status === "LoadingFirstPage" && <Notice>Loading authorized applications…</Notice>}
    {applications.length === 0 && page.status === "Exhausted" && <Card><Txt muted>No {status} applications in this department.</Txt></Card>}
    {applications?.map((r) => <LinkRow key={r.id} title={r.name} detail={`${r.staffId} · ${r.department}\n${r.requestedRole} · ${r.verificationStatus}\n${new Date(r.submittedAt).toLocaleDateString()}`}
      tail={<Badge label={r.status} tone="warning" />} onPress={() => go("staff-review", r.id)} />)}
    {(account?.capabilities.includes("roles") || account?.capabilities.includes("suspend")) && <LinkRow title="Staff roles and access" icon="people-outline" onPress={() => go("staff-accounts")} />}
    {account?.capabilities.includes("audit") && <LinkRow title="Authorization audit" icon="shield-checkmark-outline" onPress={() => go("staff-audit")} />}
    {page.status !== "Exhausted" && <Button label="Load more applications" variant="secondary" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}
  </Screen>;
}

export function StaffApplicationReview({ id }: { id: string }) {
  const { account } = useStaffAccess();
  if (!account?.capabilities.includes("accounts")) return <Restricted />;
  return <ReviewLoader id={id} />;
}
function ReviewLoader({ id }: { id: string }) {
  const request = useQuery(staffApi.administration.application, { id: id as GenericId<"registrationRequests"> });
  if (!request) return <Screen title="Application review"><Notice>Loading authorized application…</Notice></Screen>;
  return <ReviewForm key={`${request._id}:${request.revision}`} request={request} />;
}
type Review = FunctionReturnType<typeof staffApi.administration.application>;
function ReviewForm({ request }: { request: Review }) {
  const { account } = useStaffAccess();
  const verify = useMutation(staffApi.administration.verify);
  const approve = useMutation(staffApi.administration.approve);
  const reject = useMutation(staffApi.administration.reject);
  const [verifiedStaffId, setVerifiedStaffId] = useState(request.requestedStaffId);
  const [verifiedName, setVerifiedName] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reason, setReason] = useState("");
  const [grant, setGrant] = useState<Grant>({ role: request.requestedRole, capabilities: [...roleCapabilities[request.requestedRole]], scope: [request.departmentId], grantableRoles: request.requestedRole === "Administrator" ? [...roles] : [] });
  const self = account?.id === request.accountId;
  return <Screen title="Application Review" subtitle="Review the applicant against authoritative institutional records.">
    <Card style={{ gap: 10 }}>
      <Txt size={22} weight="800">{request.fullName}</Txt><Badge label={request.status} tone="warning" />
      <Detail label="Verified Clerk email" value={request.email} />
      <Detail label="Staff ID requested" value={request.requestedStaffId} />
      <Detail label="Requested role" value={request.requestedRole} />
      <Detail label="Requested department" value={request.department} />
      <Detail label="Institutional verification" value={request.verificationStatus} />
      <Detail label="Submitted" value={new Date(request.submittedAt).toLocaleString()} />
    </Card>
    {request.conflict && <Notice tone="warning">A Staff ID conflict needs institutional review. Conflicting identities are not disclosed here. An existing verified Staff ID cannot be approved again.</Notice>}
    {request.status === "pending" && <>
      <Section title="Institutional identity verification">
        {!request.verificationEnabled && <Notice tone="warning">Verification is disabled until an authorized operator configures an approved institutional verification policy.</Notice>}
        <Field label="Staff ID confirmed in institutional records" value={verifiedStaffId} onChangeText={setVerifiedStaffId} maxLength={64} />
        <Field label="Full name confirmed in institutional records" value={verifiedName} onChangeText={setVerifiedName} maxLength={120} />
        <Field label="Institutional evidence reference" value={evidence} onChangeText={setEvidence} maxLength={160} />
        <Txt size={11} muted>Record an approved reference only. Do not paste personnel documents or confidential evidence.</Txt>
        <ConfirmAction label="Verify Staff ID" title="Confirm institutional identity?" detail="Confirm that an authoritative institutional record matches this applicant. This action is audited."
          disabled={!request.verificationEnabled || !verifiedName.trim() || !evidence.trim() || self}
          onConfirm={() => verify({ id: request._id, expectedRevision: request.revision, outcome: "verified", verifiedStaffId, verifiedFullName: verifiedName, evidenceReference: evidence })} />
        <ConfirmAction label="Record verification failure" title="Record unsuccessful identity check?" detail="This does not approve or reject the application. The evidence outcome will be retained." danger
          disabled={!request.verificationEnabled || !verifiedName.trim() || !evidence.trim() || self}
          onConfirm={() => verify({ id: request._id, expectedRevision: request.revision, outcome: "failed", verifiedStaffId, verifiedFullName: verifiedName, evidenceReference: evidence })} />
      </Section>
      <Section title="Approved access assignment">
        <GrantFields value={grant} onChange={setGrant} />
        <Field label="Approval justification or applicant-visible rejection reason" value={reason} onChangeText={setReason} maxLength={300} />
        <ConfirmAction label="Approve application" title="Approve staff access?" detail={`Grant ${grant.role} with the selected capabilities and departments. The backend will validate your grant authority.`}
          disabled={!reason.trim() || request.verificationStatus !== "verified" || !request.verificationEnabled || self || !account?.grantableRoles.includes(grant.role)}
          onConfirm={() => approve({ id: request._id, expectedRevision: request.revision, approvedRole: grant.role, capabilities: grant.capabilities, scope: grant.scope, grantableRoles: grant.grantableRoles, reason })} />
        <ConfirmAction label="Reject application" title="Reject this staff application?" detail="The entered reason will be visible to the applicant. Do not include confidential administrative information." danger disabled={!reason.trim() || self}
          onConfirm={() => reject({ id: request._id, expectedRevision: request.revision, applicantReason: reason })} />
      </Section>
    </>}
    <Section title="Verification history">
      {request.verifications.length === 0 && <Txt muted>No institutional verification is recorded.</Txt>}
      {request.verifications.map((r) => <Card key={r._id} style={{ gap: 6 }}><Badge label={r.outcome} tone={r.outcome === "verified" ? "success" : "warning"} /><Detail label="Reviewer" value={r.reviewerId ?? "Authorized operator"} /><Detail label="Evidence reference" value={r.evidenceReference} /><Txt muted size={12}>{new Date(r.at).toLocaleString()}</Txt></Card>)}
    </Section>
    <Section title="Review decisions">
      {request.history.map((a) => <Card key={a._id}><Txt weight="600">{a.action}</Txt><Txt size={12} muted>{a.from ?? "New"} → {a.to ?? a.decision}</Txt><Txt size={12}>{a.reason}</Txt><Txt size={11} muted>{new Date(a.at).toLocaleString()}</Txt></Card>)}
    </Section>
  </Screen>;
}

type Grant = { role: Role; capabilities: Capability[]; scope: GenericId<"departments">[]; grantableRoles: Role[] };
function GrantFields({ value, onChange }: { value: Grant; onChange: (grant: Grant) => void }) {
  const { account } = useStaffAccess();
  const departments = useQuery(staffApi.staff.departments);
  const available = departments?.filter((d) => account?.scope.includes(d.id)) ?? [];
  return <>
    <Select label="Approved primary role" values={account?.grantableRoles ?? []} value={value.role} onChange={(role) => onChange({ ...value, role, capabilities: [...roleCapabilities[role]], grantableRoles: role === "Administrator" ? [...roles] : [] })} />
    <MultiChoice label="Granted capabilities" values={roleCapabilities[value.role]} selected={value.capabilities} onChange={(capabilities) => onChange({ ...value, capabilities })} />
    <MultiChoice label="Authorized department scope" values={available.map((d) => d.label)} selected={available.filter((d) => value.scope.includes(d.id)).map((d) => d.label)}
      onChange={(labels) => onChange({ ...value, scope: available.filter((d) => labels.includes(d.label)).map((d) => d.id) })} />
    {value.role === "Registration Approver" && account?.capabilities.includes("roles") && <MultiChoice label="Roles this approver may grant" values={account.grantableRoles} selected={value.grantableRoles} onChange={(grantableRoles) => onChange({ ...value, grantableRoles })} />}
    {value.role === "Administrator" && <Notice>The complete approved administrator capability and delegation set is required by server policy.</Notice>}
  </>;
}

export function StaffAccounts() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["roles", "suspend"].includes(c))) return <Restricted />;
  return <AccountList />;
}
function AccountList() {
  const { account } = useStaffAccess();
  const [department, setDepartment] = useState(() => account?.scope[0] ?? null);
  const page = usePaginatedQuery(staffApi.administration.accountPage, department && account ? { departmentId: department } : "skip", { initialNumItems: 20 });
  const accounts = page.results;
  return <Screen title="Staff Roles and Access">
    <DepartmentFilter value={department} onChange={setDepartment} />
    {page.status === "LoadingFirstPage" && <Notice>Loading authorized accounts…</Notice>}
    {accounts?.map((a) => <LinkRow key={a.id} title={a.name} detail={`${a.staffId} · ${a.role}`} tail={<Badge label={a.status} tone={a.status === "approved" ? "success" : "warning"} />} onPress={() => go("staff-role", a.id)} />)}
    {accounts.length === 0 && page.status === "Exhausted" && <Notice>No staff accounts can be managed in this department.</Notice>}
    {page.status !== "Exhausted" && <Button label="Load more accounts" variant="secondary" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}
  </Screen>;
}
export function StaffRoleAssignment({ id, focus = 'all' }: { id: string; focus?: 'all' | 'role' | 'suspend' }) {
  const { account } = useStaffAccess();
  if (!account?.capabilities.some((c) => ["roles", "suspend"].includes(c))) return <Restricted />;
  return <RoleLoader id={id} focus={focus} />;
}
function RoleLoader({ id, focus }: { id: string; focus: 'all' | 'role' | 'suspend' }) {
  const target = useQuery(staffApi.administration.account, { id: id as GenericId<"staffAccounts"> });
  if (!target) return <Screen title="Staff account"><Notice>Loading authorized account…</Notice></Screen>;
  return <RoleForm key={`${target.id}:${target.revision}:${focus}`} target={target} focus={focus} />;
}
function RoleForm({ target, focus }: { target: FunctionReturnType<typeof staffApi.administration.accounts>[number]; focus: 'all' | 'role' | 'suspend' }) {
  const { account } = useStaffAccess();
  const changeRole = useMutation(staffApi.administration.changeRole);
  const changeStatus = useMutation(staffApi.administration.changeStatus);
  const [grant, setGrant] = useState<Grant>({ role: target.role, capabilities: target.capabilities, scope: target.scope, grantableRoles: target.grantableRoles });
  const [reason, setReason] = useState("");
  const self = target.id === account?.id;
  const locked = self || target.status === "revoked";
  return <Screen title={focus === 'suspend' ? 'Account Suspension Controls' : 'Staff Role Assignment'} subtitle={focus === 'suspend' ? 'Manage staff account access with an audited reason.' : 'Review the staff member’s role, permissions and department scope.'}>
    <Card style={{ gap: 10 }}><Txt size={22} weight="800">{target.name}</Txt><Detail label="Verified Staff ID" value={target.staffId} /><Detail label="Current role" value={target.role} /><Badge label={target.status} tone="warning" /></Card>
    {self && <Notice>You cannot change your own authorization or access status.</Notice>}
    {target.status === "revoked" && <Notice>Revoked access requires a separate authorized revalidation procedure.</Notice>}
    {focus !== 'suspend' && account?.capabilities.includes("roles") && !locked && <GrantFields value={grant} onChange={setGrant} />}
    {!locked && <Field label="Administrative justification" value={reason} onChangeText={setReason} maxLength={500} />}
    {focus !== 'suspend' && account?.capabilities.includes("roles") && <ConfirmAction label="Save authorization" title="Change staff authorization?" detail="The role, capabilities and scope will be replaced and audited. Existing access will be re-evaluated." disabled={locked || !reason.trim()}
      onConfirm={() => changeRole({ id: target.id, expectedRevision: target.revision, ...grant, reason })} />}
    {focus !== 'role' && account?.capabilities.includes("suspend") && <>
      <ConfirmAction label={target.status === "suspended" ? "Reinstate account" : "Suspend account"} title={target.status === "suspended" ? "Reinstate staff access?" : "Suspend staff access?"}
        detail="This action is audited and authorization changes take effect on the backend." danger={target.status !== "suspended"} disabled={locked || !reason.trim()}
        onConfirm={() => changeStatus({ id: target.id, expectedRevision: target.revision, status: target.status === "suspended" ? "approved" : "suspended", reason })} />
      <ConfirmAction label="Revoke access" title="Revoke staff access?" detail="Revocation cannot be reversed through this screen. Authorized revalidation will be required." danger disabled={locked || !reason.trim()}
        onConfirm={() => changeStatus({ id: target.id, expectedRevision: target.revision, status: "revoked", reason })} />
    </>}
    {focus !== 'suspend' && account?.capabilities.includes('suspend') && <LinkRow title="Account suspension controls" icon="person-remove-outline" onPress={() => go('suspend', target.id)} />}
    {focus === 'suspend' && account?.capabilities.includes('roles') && <LinkRow title="Role assignment" icon="shield-checkmark-outline" onPress={() => go('role', target.id)} />}
  </Screen>;
}

export function StaffAudit() {
  const { account } = useStaffAccess();
  if (!account?.capabilities.includes("audit")) return <Restricted />;
  return <AuditList />;
}
function AuditList() {
  const { account } = useStaffAccess();
  const [department, setDepartment] = useState<GenericId<"departments"> | null>(() => account?.scope[0] ?? null);
  const page = usePaginatedQuery(staffApi.administration.auditPage, account ? { departmentId: department ?? undefined } : "skip", { initialNumItems: 20 });
  const records = page.results;
  return <Screen title="Authorization Audit">
    <DepartmentFilter value={department} onChange={setDepartment} operator={account?.role === "Administrator"} />
    {page.status === "LoadingFirstPage" && <Notice>Loading authorized audit events…</Notice>}
    {records.length === 0 && page.status === "Exhausted" && <Notice>No audit events in this authorized scope.</Notice>}
    {records?.map((r) => <Card key={r._id} style={{ gap: 7 }}><Txt weight="700">{r.action}</Txt><Detail label="Actor" value={r.actorId ?? r.actorKind} /><Detail label="Target" value={r.target} /><Detail label="Decision" value={r.decision} /><Txt size={12}>{r.reason}</Txt><Txt size={11} muted>{new Date(r.at).toLocaleString()}</Txt></Card>)}
    {page.status !== "Exhausted" && <Button label="Load more audit events" variant="secondary" loading={page.isLoading} disabled={page.status !== "CanLoadMore"} onPress={() => page.loadMore(20)} />}
  </Screen>;
}
function DepartmentFilter({ value, onChange, operator = false }: { value: GenericId<"departments"> | null; onChange: (value: GenericId<"departments"> | null) => void; operator?: boolean }) {
  const { account } = useStaffAccess();
  const departments = useQuery(staffApi.staff.departments);
  const available = departments?.filter((d) => account?.scope.includes(d.id)) ?? [];
  return <Select label="Department" values={[...available.map((d) => d.label), ...(operator ? ["Operator policy events"] : [])]}
    value={value === null && operator ? "Operator policy events" : available.find((d) => d.id === value)?.label ?? ""}
    onChange={(label) => onChange(available.find((d) => d.label === label)?.id ?? null)} />;
}
