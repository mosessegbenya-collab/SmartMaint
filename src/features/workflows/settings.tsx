import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Card, Detail, Notice, Screen, Txt } from "@/components/smart/ui";
import { SettingLink, SettingToggle } from "@/components/smart/settings-ui";
import { useApp } from "@/state/app-state";
import { useIdentity } from "@/features/access/identity";
import { authErrorMessage } from "@/features/access/auth-policy";
import { go } from "@/navigation/go";
import { StaffNotificationPreferences } from "@/features/staff/extensions-ui";
import { tokens } from "@/design/tokens";

export const settingsScreens = ["settings", "notification-settings", "appearance", "text-contrast", "privacy", "account-security", "help"];
const notificationOptions = [
  { title: "Push Notifications", detail: "Device alerts will be available when push delivery is configured.", icon: "notifications-outline", delivery: true },
  { title: "Email Notifications", detail: "Email alerts will be available when email delivery is configured.", icon: "mail-outline", delivery: true },
  { title: "Report Updates", detail: "New reports, status changes and assignments.", icon: "document-text-outline" },
  { title: "Maintenance Updates", detail: "Scheduled maintenance and recorded repair activity.", icon: "construct-outline" },
  { title: "Verification Updates", detail: "Independent verification requests and recorded decisions.", icon: "shield-checkmark-outline" },
  { title: "Sync Notices", detail: "Submission status and issues that need your attention.", icon: "sync-outline" },
] as const;

export function SettingsWorkflow({ screen }: { screen: string }) {
  const app = useApp();
  const identity = useIdentity();
  const p = app.preferences;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const title = screen === "settings" ? "Settings & Accessibility" : screen === "notification-settings" ? "Notification Preferences" : screen === "appearance" ? "Appearance & Theme" : screen === "text-contrast" ? "Text & Contrast" : screen === "privacy" ? "Privacy & Data" : screen === "account-security" ? "Account Security" : "About SmartMaint";
  return <Screen title={title} subtitle={screen === "notification-settings" ? "Choose what you want to be notified about and how to receive notifications." : screen === "settings" ? "Manage your preferences and account settings." : undefined}>
    {!!message && <Notice>{message}</Notice>}
    {screen === "settings" && <>
      <SettingLink title="Appearance & Theme" detail="Choose your preferred display theme" icon="sunny-outline" onPress={() => go("appearance")} />
      <SettingLink title="Text & Contrast" detail="Text size, contrast and readability" icon="text-outline" onPress={() => go("text-contrast")} />
      <SettingLink title="Notifications" detail="Manage alert preferences" icon="notifications-outline" onPress={() => go("notification-settings")} />
      <SettingLink title="Account & Security" detail="Sign in, security and staff access" icon="lock-closed-outline" onPress={() => go("account-security")} />
      <SettingLink title="Privacy & Data" detail="How your information is handled" icon="shield-outline" onPress={() => go("privacy")} />
      <SettingLink title="About SmartMaint" detail="Version, support and application information" icon="information-circle-outline" onPress={() => go("help")} />
    </>}
    {screen === "notification-settings" && app.mode === "live" && <StaffNotificationPreferences />}{screen === "notification-settings" && app.mode !== "live" && <>
      <Notice>Preferences apply for this session. Push and email delivery are not configured. In-app records remain available in Notification Centre.</Notice>
      {notificationOptions.map((option) => {
        const delivery = "delivery" in option;
        return <SettingToggle key={option.title} title={option.title} detail={option.detail} icon={option.icon} disabled={delivery} value={delivery ? false : p.notifications[option.title] ?? true} onChange={(value) => app.setPreferences((s) => ({ ...s, notifications: { ...s.notifications, [option.title]: value } }))} />;
      })}
      <Txt size={12} muted>These choices prepare your notification preferences. They do not suppress operational records or enable external delivery.</Txt>
    </>}
    {screen === "appearance" && <>
      <Txt muted>Choose a theme. System follows your device appearance.</Txt>
      {(["system", "light", "dark"] as const).map((theme) => <SettingLink key={theme} title={`${theme[0].toUpperCase()}${theme.slice(1)}${p.theme === theme ? " · Selected" : ""}`} detail={theme === "system" ? "Match your device settings" : `Use the ${theme} appearance`} icon={theme === "system" ? "phone-portrait-outline" : theme === "light" ? "sunny-outline" : "moon-outline"} onPress={() => app.setPreferences((s) => ({ ...s, theme }))} />)}
      <Card style={{ gap: 10 }}><Badge label="Live preview" /><Txt size={21} weight="700">Reliable equipment. Better care.</Txt><Txt muted>Your chosen theme applies throughout SmartMaint.</Txt><View style={{ height: 8, borderRadius: 4, backgroundColor: tokens.blue }} /></Card>
    </>}
    {screen === "text-contrast" && <>
      <SettingToggle title="Larger text" detail="Increase text size throughout the application." icon="text-outline" value={p.largeText} onChange={(largeText) => app.setPreferences((s) => ({ ...s, largeText }))} />
      <SettingToggle title="Bold text" detail="Use a heavier font for easier reading." icon="create-outline" value={p.bold} onChange={(bold) => app.setPreferences((s) => ({ ...s, bold }))} />
      <SettingToggle title="High contrast" detail="Strengthen text and border contrast." icon="contrast-outline" value={p.contrast} onChange={(contrast) => app.setPreferences((s) => ({ ...s, contrast }))} />
      <SettingToggle title="Reduced motion" detail="Reduce transitions between screens." icon="pause-circle-outline" value={p.reducedMotion} onChange={(reducedMotion) => app.setPreferences((s) => ({ ...s, reducedMotion }))} />
      <Card style={{ gap: 8 }}><Txt size={18} weight="700">Reading preview</Txt><Txt>Equipment reports, task details and safety information use these display preferences.</Txt><Txt muted>Secondary text preview</Txt></Card>
    </>}
    {screen === "privacy" && <>
      <Card style={{ gap: 12 }}><Txt size={19} weight="700">Your staff information</Txt><Txt>Authorized staff administrators manage your verified Staff ID, role and department access. Contact them to correct institutional information.</Txt></Card>
      <Card style={{ gap: 12 }}><Txt size={19} weight="700">Reports and evidence</Txt><Txt>{app.mode === "preview" ? "Preview records are synthetic and held in memory. Restarting the app resets demonstration changes." : "Reports and attachments are available only through authorized staff services. Signing out closes protected views. Saved publication attempts may remain in the account-separated queue; signing out does not submit them."}</Txt></Card>
      <Card style={{ gap: 12 }}><Txt size={19} weight="700">Display preferences</Txt><Txt>Theme, accessibility and notification preferences apply to this session. They reset when the application session is recreated.</Txt></Card>
      <SettingLink title="Account Security" detail="Review your current identity and staff access" icon="lock-closed-outline" onPress={() => go("account-security")} />
    </>}
    {screen === "account-security" && <>
      <Card style={{ gap: 12 }}><Badge label={app.mode === "live" ? "Approved staff session" : "Development preview"} tone={app.mode === "live" ? "success" : "warning"} /><Txt size={20} weight="700">{app.account?.name ?? "Staff identity"}</Txt><Detail label="Sign-in email" value={identity.email ?? "No live identity in preview"} /><Detail label="Role" value={app.account?.role ?? "Not signed in"} /><Txt muted>Role and department changes require an authorized staff administrator.</Txt></Card>
      <SettingLink title="Device authentication" detail="Check biometric support on this device" icon="finger-print-outline" onPress={() => router.push("/access/biometric")} />
      {app.mode === "live" && <Button label="Refresh identity" loading={busy} onPress={() => { setBusy(true); setMessage(""); void identity.refresh().then(() => setMessage("Identity refreshed. Staff access is checked separately by the account service.")).catch((error) => setMessage(authErrorMessage(error))).finally(() => setBusy(false)); }} />}
      <Notice>Device authentication does not replace staff sign-in or grant additional permissions.</Notice>
    </>}
    {screen === "help" && <>
      <Card style={{ gap: 12 }}><Txt size={24} weight="800">Smart<Txt size={24} weight="800" color={tokens.blue}>Maint</Txt></Txt><Txt size={18} weight="600">Medical Equipment. Reliable Care.</Txt><Detail label="Version" value="1.0.0 development" /><Detail label="Current mode" value={app.mode === "live" ? "Approved staff account" : app.mode === "locked" ? "Staff access locked" : "Synthetic preview"} /></Card>
      <Card style={{ gap: 10 }}><Txt size={19} weight="700">Need help?</Txt><Txt>Contact your hospital equipment team for a device fault, or your staff administrator for account and department access.</Txt><Txt muted>Institutional support contact details have not been configured.</Txt></Card>
      <Card style={{ gap: 10 }}><Txt size={19} weight="700">Report an equipment issue</Txt><Txt>Identify the device, describe the fault, add relevant photographs and review the report before submitting.</Txt><Txt muted>Follow your institution’s escalation procedure for urgent safety concerns.</Txt></Card>
      {!!app.account?.capabilities.includes("report") && <Button label="Report equipment issue" icon="scan-outline" onPress={() => go("manual")} />}
      <SettingLink title="Privacy & Data" detail="How staff information and reports are handled" icon="shield-outline" onPress={() => go("privacy")} />
    </>}
  </Screen>;
}
