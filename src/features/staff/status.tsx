import { useState } from "react";
import { View } from "react-native";
import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { Badge, Button, Card, Detail, Field, Notice, Select, Txt } from "@/components/smart/ui";
import { roles, type Role } from "@/domain/models";
import { useIdentity } from "@/features/access/identity";
import { authErrorMessage } from "@/features/access/auth-policy";
import { staffApi } from "@/services/staff-api";
import { useStaffAccess } from "./provider";

const titles = {
  loading: "Checking staff access", unauthenticated: "Sign in to continue", session_expired: "Session expired",
  identity_unverified: "Verify your email", session_task: "Complete account setup", no_application: "Staff registration",
  pending: "Awaiting approval", rejected: "Application not approved", approved: "Staff access approved", suspended: "Account suspended",
  revoked: "Staff access revoked", unconfigured: "Staff access unavailable", backend_unavailable: "Connection unavailable",
  timeout: "Staff access check timed out", authorization_error: "Unable to confirm staff access",
};
export function StaffAccountStatus() {
  const identity = useIdentity();
  const access = useStaffAccess();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    setBusy(true); setMessage("");
    try { await identity.refresh(); access.retry(); } catch (error) { setMessage(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true); setMessage("");
    try { await identity.signOut(); router.replace("/access/sign-in"); } catch (error) { setMessage(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  const application = access.application;
  return <View style={{ gap: 14 }}>
    <Txt size={26} weight="800">{titles[access.status]}</Txt>
    {identity.email && <Detail label="Clerk email" value={identity.email} />}
    <Badge label={access.status.replaceAll("_", " ")} tone={access.status === "approved" ? "success" : "warning"} />
    {access.status === "approved" && access.account ? <>
      <Detail label="Verified staff" value={access.account.name} />
      <Detail label="Verified Staff ID" value={access.account.staffId} />
      <Detail label="Approved role" value={access.account.role} />
      <Button label="Continue to workspace" onPress={() => router.replace("/workspace/home")} />
    </> : null}
    {application && <Card style={{ gap: 10 }}>
      <Detail label="Staff ID requested" value={application.staffId} />
      <Detail label="Department" value={application.department} />
      <Detail label="Requested role" value={application.requestedRole} />
      <Detail label="Institutional verification" value={application.verificationStatus} />
      {access.status === "pending" && <Txt muted>An authorized reviewer must verify your institutional identity and approve staff access.</Txt>}
      {access.status === "rejected" && <Notice tone="warning">{application.rejectionReason ?? "Your application was not approved. Review your staff details or contact an authorized administrator."}</Notice>}
    </Card>}
    {access.status === "session_task" && <Notice tone="warning">Your identity provider requires another account setup step. Contact your account administrator. Staff access remains locked.</Notice>}
    {access.status === "suspended" && <Notice tone="warning">Your staff account is suspended. Contact an authorized administrator for review.</Notice>}
    {access.status === "revoked" && <Notice tone="warning">Your staff access has been revoked. Contact an authorized administrator. Signing in again does not restore access.</Notice>}
    {["unconfigured", "authorization_error", "backend_unavailable", "timeout"].includes(access.status) && <Notice tone="warning">The staff access service could not confirm your authorization. Staff records remain locked. Try again or contact your administrator.</Notice>}
    {access.status === "session_expired" && <Notice tone="warning">Your identity could not be authenticated by the staff service. Sign in again. An administrator may also need to check the identity-service connection.</Notice>}
    {access.configured && access.connected && ["no_application", "rejected"].includes(access.status) && <ApplicationEntry />}
    {message && <Notice tone="warning">{message}</Notice>}
    <Button label="Refresh account status" loading={busy} onPress={() => void refresh()} />
    <Button label="Sign out" variant="secondary" disabled={busy} onPress={() => void signOut()} />
  </View>;
}

function ApplicationEntry() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <Notice>Loading registration details…</Notice>;
  const hint = user?.unsafeMetadata.smartmaintRequest;
  const object = hint && typeof hint === "object" && !Array.isArray(hint) ? hint as Record<string, unknown> : {};
  return <ApplicationForm hint={object} />;
}
function ApplicationForm({ hint }: { hint: Record<string, unknown> }) {
  const access = useStaffAccess();
  const departments = useQuery(staffApi.staff.departments);
  const submit = useMutation(staffApi.staff.submit);
  const old = access.application;
  const [name, setName] = useState(old?.fullName ?? (typeof hint.fullName === "string" ? hint.fullName.slice(0, 120) : ""));
  const [staffId, setStaffId] = useState(old?.staffId ?? (typeof hint.staffId === "string" ? hint.staffId.slice(0, 64) : ""));
  const [department, setDepartment] = useState<string>(old?.departmentId ?? "");
  const [role, setRole] = useState<Role>(old?.requestedRole ?? (roles.includes(hint.requestedRole as Role) ? hint.requestedRole as Role : "Clinician"));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const selected = departments?.find((d) => d.id === department);
    if (!selected) { setMessage("Choose an authorized department."); return; }
    if (!access.connected) { setMessage("Reconnect before submitting your application."); return; }
    setBusy(true); setMessage("");
    try { await submit({ fullName: name, staffId, departmentId: selected.id, requestedRole: role, previousRevision: old?.revision }); }
    catch (error) { setMessage(authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <Card style={{ gap: 12 }}>
    <Txt size={20} weight="700">{old ? "Review and resubmit" : "Your staff details"}</Txt>
    <Field label="Full name" value={name} onChangeText={setName} maxLength={120} editable={!busy} />
    <Field label="Staff ID" value={staffId} onChangeText={setStaffId} maxLength={64} editable={!busy} autoCapitalize="characters" />
    <Select label="Department" values={departments?.map((d) => d.label) ?? []} value={departments?.find((d) => d.id === department)?.label ?? ""} onChange={(label) => setDepartment(departments?.find((d) => d.label === label)?.id ?? "")} />
    <Select label="Requested role" values={roles} value={role} onChange={setRole} />
    <Notice>Your details will be checked against institutional records. Requested roles do not grant permissions.</Notice>
    {departments?.length === 0 && <Notice tone="warning">Approved departments are not available yet. Contact your administrator.</Notice>}
    {message && <Notice tone="warning">{message}</Notice>}
    <Button label="Submit staff application" loading={busy} disabled={!departments?.length} onPress={() => void save()} />
  </Card>;
}
