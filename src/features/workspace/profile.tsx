import { router } from "expo-router";
import { useQuery } from "convex/react";
import { Notice, Screen } from "@/components/smart/ui";
import { ProfileIdentity, SettingLink } from "@/components/smart/settings-ui";
import { useApp } from "@/state/app-state";
import { useIdentity } from "@/features/access/identity";
import { useStaffAccess } from "@/features/staff/provider";
import { ConfirmAction } from "@/features/staff/ui";
import { staffApi } from "@/services/staff-api";
import { go } from "@/navigation/go";

export function AccountProfile() {
  const app = useApp();
  const identity = useIdentity();
  const account = app.account;
  if (!account) return null;
  const pending = app.mode === "preview" ? app.state.queue.filter((q) => q.ownerId === account.id && q.state !== "Simulated acknowledgment").length : 0;
  return <Screen title="Profile and Security" subtitle="Manage your account, security and preferences." back={false}>
    {app.mode === "live" ? <StaffIdentity /> : <ProfileIdentity name={account.name} role={account.role} staffId={`DEMO-${account.id}`} department="Synthetic development scope" />}
    <SettingLink title="Account Security" detail="Sign-in, device authentication and staff access" icon="lock-closed-outline" onPress={() => go("account-security")} />
    <SettingLink title="Notification Preferences" detail="Manage what you are notified about" icon="notifications-outline" onPress={() => go("notification-settings")} />
    <SettingLink title="App Settings" detail="Appearance and accessibility preferences" icon="settings-outline" onPress={() => go("settings")} />
    <SettingLink title="Help & Support" detail="Guides, support and application information" icon="help-circle-outline" onPress={() => go("help")} />
    {__DEV__ && <SettingLink title="Design system" detail="Component examples and accessibility settings" icon="color-palette-outline" onPress={() => router.push("/design-system")} />}
    {app.mode === "live" && account.capabilities.includes("report") && <SettingLink title="Device Drafts" detail="Restore encrypted drafts and pending photos" icon="document-text-outline" onPress={() => go("device-drafts")} />}
    {account.capabilities.includes("report") && <SettingLink title="Synchronization" detail="Review pending reports and submission issues" icon="sync-outline" onPress={() => go("sync")} />}
    {app.mode === "preview" && <Notice>{pending} pending operation(s) in this synthetic account. Restarting the app resets preview changes.</Notice>}
    <ConfirmAction label="Sign Out" title="Sign out of SmartMaint?" detail={app.mode === "live" ? "Protected views will close. Saved publication attempts are not submitted by signing out." : "This ends the preview session. Demonstration changes are held in memory."} danger onConfirm={async () => { if (app.mode === "live") await identity.signOut(); else app.signOut(); router.replace("/access/sign-in"); }} />
  </Screen>;
}
function StaffIdentity() {
  const { account } = useStaffAccess();
  const departments = useQuery(staffApi.staff.departments);
  if (!account) return null;
  const labels = departments?.filter((department) => account.scope.includes(department.id)).map((department) => department.label);
  return <ProfileIdentity name={account.name} role={account.role} staffId={account.staffId} email={account.email} department={labels?.length ? labels.join(", ") : `${account.scope.length} authorized department(s)`} />;
}
