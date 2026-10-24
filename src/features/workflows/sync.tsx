import { useEffect, useMemo, useRef, useState } from "react";
import { Switch } from "react-native";
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
  Section,
  Txt,
} from "@/components/smart/ui";

import { retryQueue } from "@/services/development";

import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";

export function SyncWorkflow({ screen }: { screen: string }) {
  const app = useApp();
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<
    "success" | "transient" | "validation" | "permission" | "auth"
  >("success");
  const [conflict, setConflict] = useState<"Local" | "Server" | "">("");
  const [resolved, setResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const transfer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { account, online, setState } = app;
  const queue = useMemo(
    () => app.state.queue.filter((q) => q.ownerId === account?.id),
    [app.state.queue, account?.id],
  );
  useEffect(
    () => () => {
      if (transfer.current) clearTimeout(transfer.current);
      lock.current = false;
      setBusy(false);
      setState((s) => ({
        ...s,
        queue: s.queue.map((q) =>
          q.ownerId === account?.id && q.state === "Uploading"
            ? { ...q, state: "Pending synchronization" }
            : q,
        ),
        reports: s.reports.map((r) =>
          r.ownerId === account?.id && r.sync === "Uploading"
            ? { ...r, sync: "Pending synchronization" }
            : r,
        ),
      }));
    },
    [account?.id, online, setState],
  );
  const run = () => {
    if (lock.current || !account || !online) return;
    lock.current = true;
    setBusy(true);
    setState((s) => ({
      ...s,
      queue: s.queue.map((q) =>
        q.ownerId === account.id &&
        !["Simulated acknowledgment", "Rejected"].includes(q.state)
          ? { ...q, state: "Uploading" }
          : q,
      ),
      reports: s.reports.map((r) =>
        r.ownerId === account.id &&
        !["Simulated acknowledgment", "Rejected"].includes(r.sync)
          ? { ...r, sync: "Uploading" }
          : r,
      ),
    }));
    transfer.current = setTimeout(() => {
      try {
        setState((s) => retryQueue(s, account, online, outcome));
        setMessage(
          outcome === "success"
            ? "Simulated acknowledgment only. No real server received these records."
            : outcome === "auth"
              ? "Session authorization failed. Queue paused. Sign in to recover."
              : outcome === "transient"
                ? "Simulated network failure. Retry is scheduled while this screen remains open."
                : "Simulated rejection. Review the record; it has not been accepted.",
        );
        if (outcome === "auth") {
          app.expire();
          router.replace("/access/expired");
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
        lock.current = false;
      }
    }, 700);
  };
  // Initial scope is an in-memory retry demonstration; no background or durable retry claim.
  useEffect(() => {
    if (!online || !account) return;
    const next = queue.find(
      (q) => q.failure === "transient" && q.nextRetryAt && q.state === "Failed",
    );
    if (!next) return;
    const timer = setTimeout(
      () => {
        try {
          setState((s) => retryQueue(s, account, true, "success"));
          setMessage(
            "Automatic demonstration retry finished: simulated acknowledgment only.",
          );
        } catch {
          setMessage("Retry paused. Recover your account session.");
        }
      },
      Math.max(0, Date.parse(next.nextRetryAt!) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [online, account, setState, queue]);
  const title =
    screen === "sync"
      ? "Sync Status"
      : screen === "queue"
        ? "Pending Sync Queue"
        : screen === "upload-failed"
          ? "Upload Failed"
          : "Sync Conflict";
  return (
    <Screen
      title={title}
      subtitle="Synthetic in-memory synchronization demonstration."
    >
      {!!message && <Notice tone="warning">{message}</Notice>}
      <Notice tone={app.online ? "success" : "warning"}>
        {app.online ? "Connection available for demonstration" : "Offline"} · No
        real server connection is configured.
      </Notice>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Txt>Simulate online connection</Txt>
          <Switch
            accessibilityLabel="Simulate online connection"
            value={app.online}
            onValueChange={app.setOnline}
          />
        </Row>
      </Card>
      {screen === "conflict" ? (
        <>
          <Card style={{ gap: 12 }}>
            <Txt weight="700">DEMO-VENT-014 · Location conflict</Txt>
            <Detail label="Local version" value="Ward A · 16 Oct 2026, 10:23" />
            <Detail
              label="Server version (simulated)"
              value="Critical Care · 16 Oct 2026, 10:21"
            />
          </Card>
          <Notice tone="danger">
            Identity, location, safety, availability and verification conflicts
            must never be automatically merged.
          </Notice>
          <Choices
            label="Choose a version for authorized review"
            values={["Local", "Server"]}
            value={conflict}
            onChange={setConflict}
          />
          <Button
            label="Record demo conflict decision"
            disabled={!conflict || resolved}
            onPress={() => {
              setResolved(true);
              setMessage(
                `Demo decision recorded for ${conflict.toLowerCase()} version. Both original versions are preserved. No live record was overwritten.`,
              );
            }}
          />
          {resolved && <Badge label="Demonstration decision recorded" />}
        </>
      ) : (
        <>
          <Section title="Account queue">
            {queue.map((q) => (
              <Card key={q.id} style={{ gap: 9 }}>
                <Txt weight="700">{q.reportId}</Txt>
                <Detail label="Operation ID" value={q.id} />
                <Detail label="Status" value={q.state} />
                <Detail label="Attempts" value={q.attempts} />
                {!!q.nextRetryAt && (
                  <Detail label="Next retry" value={q.nextRetryAt} />
                )}
                <Txt size={11} muted>
                  Not a real server acknowledgment.
                </Txt>
                {q.state === "Rejected" && (
                  <Button
                    label="Review rejected report"
                    variant="secondary"
                    onPress={() => go("report-detail", q.reportId)}
                  />
                )}
              </Card>
            ))}
            {!queue.length && (
              <Notice>No pending operations for this account.</Notice>
            )}
          </Section>
          <Choices
            label="Demonstrate server outcome"
            values={[
              "success",
              "transient",
              "validation",
              "permission",
              "auth",
            ]}
            value={outcome}
            onChange={setOutcome}
          />
          <Button
            label="Sync Now · Demonstration"
            disabled={!app.online || !queue.length}
            loading={busy}
            onPress={run}
          />
          <LinkRow
            title="Review Sync Conflict"
            icon="git-compare-outline"
            onPress={() => go("conflict")}
          />
          <LinkRow
            title="Failed Uploads"
            icon="alert-circle-outline"
            onPress={() => go("upload-failed")}
          />
        </>
      )}
      <Notice>
        Restart loses preview changes. Durable encrypted storage, uploads,
        background retries and real acknowledgments are unavailable.
      </Notice>
      <Button
        label="Preview Session Expiry"
        variant="secondary"
        onPress={() => {
          app.expire();
          router.replace("/access/expired");
        }}
      />
    </Screen>
  );
}
