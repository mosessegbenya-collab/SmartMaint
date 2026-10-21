import { useState } from "react";
import { router } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Choices,
  Detail,
  LinkRow,
  Notice,
  Row,
  Screen,
  Txt,
} from "@/components/smart/ui";
import { allowed } from "@/domain/policy";
import { reviewApplication } from "@/services/development";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
export function ProfileScreen() {
  const app = useApp();
  const [confirm, setConfirm] = useState(false);
  if (!app.account) return null;
  const pending = app.state.queue.filter(
    (q) =>
      q.ownerId === app.account?.id && q.state !== "Simulated acknowledgment",
  ).length;
  return (
    <Screen
      title="Profile and Security"
      subtitle="Manage your account, security and preferences."
      back={false}
    >
      <Card style={{ gap: 10 }}>
        <Txt size={21} weight="700">
          {app.account.name}
        </Txt>
        <Detail label="Staff ID" value={`DEMO-${app.account.id}`} />
        <Detail label="Role" value={app.account.role} />
        <Detail label="Department" value="Synthetic development scope" />
      </Card>
      <LinkRow
        title="Account Security"
        detail="Device authentication and session access"
        icon="lock-closed-outline"
        onPress={() => router.push("/access/biometric")}
      />
      <LinkRow
        title="Notification Preferences"
        icon="notifications-outline"
        onPress={() => go("notification-settings")}
      />
      <LinkRow
        title="App Settings"
        detail="Appearance and accessibility"
        icon="settings-outline"
        onPress={() => go("settings")}
      />
      <LinkRow
        title="Help & Support"
        icon="help-circle-outline"
        onPress={() => go("help")}
      />
      <LinkRow
        title="Development account scenarios"
        detail="Switch roles by ending this session"
        icon="people-outline"
        onPress={() => setConfirm(true)}
      />
      {confirm ? (
        <>
          <Notice tone="warning">
            {pending} pending operation(s) remain in this synthetic account.
            Sign-out hides its records. Restarting the app loses demonstration
            changes.
          </Notice>
          <Button
            label="Confirm Sign Out"
            variant="danger"
            onPress={() => {
              app.signOut();
              router.replace("/access/sign-in");
            }}
          />
          <Button
            label="Keep working"
            variant="secondary"
            onPress={() => setConfirm(false)}
          />
        </>
      ) : (
        <Button
          label="Sign Out"
          variant="secondary"
          icon="log-out-outline"
          onPress={() => setConfirm(true)}
        />
      )}
    </Screen>
  );
}
export function NotificationsScreen() {
  const { state, setState } = useApp();
  const [filter, setFilter] = useState("All");
  return (
    <Screen
      title="Notification Centre"
      subtitle="Stay up to date with system activity."
      back={false}
    >
      <Choices
        label="View notifications"
        values={["All", "Unread", "System"]}
        value={filter}
        onChange={setFilter}
      />
      {state.notifications
        .filter(
          (n) =>
            filter === "All" ||
            (filter === "Unread" ? !n.read : n.kind === "System"),
        )
        .map((n) => (
          <LinkRow
            key={n.id}
            title={n.title}
            detail={n.detail}
            icon="notifications-outline"
            tail={
              <Badge
                label={n.read ? "Read" : n.kind}
                tone={n.kind === "High" ? "warning" : "info"}
              />
            }
            onPress={() => {
              setState((s) => ({
                ...s,
                notifications: s.notifications.map((x) =>
                  x.id === n.id ? { ...x, read: true } : x,
                ),
              }));
              go(n.id === "N-001" ? "clinical-queue" : "queue");
            }}
          />
        ))}
      <Notice>
        In-app synthetic notices only. Push delivery is unconfigured.
      </Notice>
      <Button
        label="Notification preferences"
        variant="secondary"
        onPress={() => go("notification-settings")}
      />
    </Screen>
  );
}
export function AccountsScreen() {
  const { account, state, setState } = useApp();
  const [message, setMessage] = useState("");
  if (!allowed(account, "accounts"))
    return (
      <Screen title="Access restricted">
        <Notice>Registration approver authorization is required.</Notice>
      </Screen>
    );
  return (
    <Screen
      title="Signup Approvals"
      subtitle="Review synthetic staff applications."
      back={false}
    >
      {message && <Notice>{message}</Notice>}
      <Badge
        label={`${state.applications.filter((a) => a.state === "Pending").length} pending approvals`}
      />
      {state.applications.map((a) => (
        <Card key={a.id} style={{ gap: 10 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt weight="700">{a.name}</Txt>
            <Badge label={a.state} tone="warning" />
          </Row>
          <Detail label="Requested role" value={a.requestedRole} />
          <Detail label="Staff ID" value={a.staffId} />
          <Txt size={12} muted>
            {a.email}
          </Txt>
          {a.state === "Pending" && (
            <Row>
              <Button
                label="Approve demo"
                onPress={() => {
                  try {
                    setState(
                      reviewApplication(state, account!, a.id, "Approved"),
                    );
                    setMessage(
                      "Synthetic approval recorded. No real account or activation message was created.",
                    );
                  } catch (e) {
                    setMessage(String(e));
                  }
                }}
              />
              <Button
                label="Reject demo"
                variant="danger"
                onPress={() => {
                  try {
                    setState(
                      reviewApplication(state, account!, a.id, "Rejected"),
                    );
                  } catch (e) {
                    setMessage(String(e));
                  }
                }}
              />
            </Row>
          )}
          {allowed(account, "roles") && (
            <Button
              label="Review role assignment"
              variant="secondary"
              onPress={() => go("role", a.id)}
            />
          )}
        </Card>
      ))}
      <Notice>
        Production staff-ID verification, approval and activation delivery
        require authorized backend functions.
      </Notice>
    </Screen>
  );
}
