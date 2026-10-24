import { useState } from "react";
import { Switch } from "react-native";
import { router } from "expo-router";
import { Button, Card, Choices, Detail, LinkRow, Notice, Row, Screen, Txt } from "@/components/smart/ui";

import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";

export function SettingsWorkflow({ screen }: { screen: string }) {
  const app = useApp();
  const p = app.preferences;
  const [message, setMessage] = useState("");
  const toggle = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <Row key={label} style={{ justifyContent: "space-between", minHeight: 48 }}>
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: "#0866E8" }}
      />
    </Row>
  );
  if (screen === "help")
    return (
      <Screen title="About SmartMaint">
        <Txt size={21} weight="800">
          Medical Equipment. Reliable Care. Always Available.
        </Txt>
        <Notice>
          {app.mode === "preview" ? "This is a synthetic in-memory development preview. Demonstration changes are not server records." : "Staff access is resolved through the authorized account service. Production safety workflows require separately approved policies."}
        </Notice>
        <Card style={{ gap: 10 }}>
          <Detail label="Version" value="1.0.0 development" />
          <Detail label="Support contact" value="Not configured" />
          <Detail label="Mode" value={app.mode === "live" ? "Approved staff account" : app.mode === "locked" ? "Staff access locked" : "Synthetic preview"} />
        </Card>
        {app.mode === "preview" && <Button
          label="Emergency reporting"
          variant="danger"
          onPress={() => go("emergency")}
        />}
        <Button
          label="Return to welcome"
          variant="secondary"
          onPress={() => router.push("/")}
        />
      </Screen>
    );
  return (
    <Screen
      title={
        screen === "settings"
          ? "Settings & Accessibility"
          : "Notification Preferences"
      }
      subtitle="Manage your preferences and account settings."
    >
      {message && <Notice>{message}</Notice>}
      {screen === "settings" ? (
        <>
          <Card>
            <Choices
              label="Appearance & Theme"
              values={["system", "light", "dark"]}
              value={p.theme}
              onChange={(theme) => app.setPreferences((s) => ({ ...s, theme }))}
            />
          </Card>
          <Card style={{ gap: 8 }}>
            {toggle("High contrast", p.contrast, (contrast) =>
              app.setPreferences((s) => ({ ...s, contrast })),
            )}
            {toggle("Bold text", p.bold, (bold) =>
              app.setPreferences((s) => ({ ...s, bold })),
            )}
            {toggle("Larger text", p.largeText, (largeText) =>
              app.setPreferences((s) => ({ ...s, largeText })),
            )}
            {toggle("Reduced motion", p.reducedMotion, (reducedMotion) =>
              app.setPreferences((s) => ({ ...s, reducedMotion })),
            )}
          </Card>
          <LinkRow
            title="Notifications"
            detail="Manage alert preferences"
            icon="notifications-outline"
            onPress={() => go("notification-settings")}
          />
          <LinkRow
            title="Account & Security"
            icon="lock-closed-outline"
            onPress={() => router.push("/access/biometric")}
          />
          <LinkRow
            title="Privacy & Data"
            icon="shield-outline"
            onPress={() =>
              setMessage(
                app.mode === "preview" ? "Synthetic preview records are held in memory. No durable encrypted offline storage is implemented. App restart resets changes." : "Protected staff records are not stored in a durable local cache. Authorization is rechecked by the staff service. Disconnecting blocks protected views.",
              )
            }
          />
          <LinkRow
            title="About SmartMaint"
            icon="information-circle-outline"
            onPress={() => go("help")}
          />
        </>
      ) : (
        <>
          <Notice>
            {app.mode === "preview" ? "These are demonstration preferences." : "These preferences apply to this session."} Push and email delivery require configured services.
          </Notice>
          {[
            "Push Notifications",
            "Email Notifications",
            "Report Updates",
            "Maintenance Updates",
            "Verification Updates",
            "Sync Notices",
          ].map((label) => (
            <Card key={label}>
              {toggle(label, p.notifications[label] ?? true, (value) =>
                app.setPreferences((s) => ({
                  ...s,
                  notifications: { ...s.notifications, [label]: value },
                })),
              )}
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
