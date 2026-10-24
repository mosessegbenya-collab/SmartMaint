import { useState } from "react";
import { Badge, Button, Card, Choices, Detail, Field, LinkRow, Notice, Screen, Section, Txt } from "@/components/smart/ui";
import type { CheckResult } from "@/domain/models";
import { allowed } from "@/domain/policy";
import { clinicalChecks, technicalChecks, equipment } from "@/services/fixtures";
import { verify } from "@/services/development";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
export function VerificationWorkflow({
  screen,
  id,
}: {
  screen: string;
  id?: string;
}) {
  const app = useApp();
  const kind = screen.startsWith("technical") ? "technical" : "clinical";
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const account = app.account;
  const permitted = allowed(account, kind);
  const task = app.state.tasks.find((t) => t.id === (id ?? "WO-DEMO-014"));
  const names = kind === "technical" ? technicalChecks : clinicalChecks;
  if (!permitted)
    return (
      <Screen title="Verification restricted">
        <Notice>
          {kind === "technical"
            ? "Authorized independent biomedical"
            : "Authorized clinical"}{" "}
          verification permission is required.
        </Notice>
      </Screen>
    );
  if (screen.endsWith("queue"))
    return (
      <Screen
        title={`${kind === "technical" ? "Technical" : "Clinical"} Verification Queue`}
        subtitle="Complete independent safety verification."
      >
        <Notice>
          Illustrative development checklists. Approved equipment-specific
          procedures are unconfigured.
        </Notice>
        {app.state.tasks
          .filter((t) =>
            account!.scope.includes(
              equipment.find((e) => e.id === t.equipmentId)?.department ?? "",
            ),
          )
          .map((t) => (
            <Card key={t.id} style={{ gap: 12 }}>
              <Txt weight="700">{t.equipmentId}</Txt>
              <Detail label="Task" value={t.id} />
              <Detail label="Maintenance" value={t.state} />
              <Notice tone="warning">
                Equipment not available until every release requirement is
                satisfied.
              </Notice>
              <Button
                label="Start Verification"
                onPress={() => go(`${kind}-checklist`, t.id)}
              />
              <Button
                label="View Verification History"
                variant="secondary"
                onPress={() => go(`${kind}-history`, t.id)}
              />
            </Card>
          ))}
      </Screen>
    );
  if (
    !task ||
    !account!.scope.includes(
      equipment.find((e) => e.id === task.equipmentId)?.department ?? "",
    )
  )
    return (
      <Screen title="Verification unavailable">
        <Notice>Task not found in this account scope.</Notice>
      </Screen>
    );
  const attempts = app.state.attempts.filter(
    (a) => a.taskId === task.id && a.kind === kind,
  );
  const latest = attempts.at(-1);
  return (
    <Screen
      title={
        screen.endsWith("history")
          ? `${kind} Verification History`
          : screen.endsWith("result")
            ? `${kind === "technical" ? "Technical" : "Clinical"} Results`
            : `${kind === "technical" ? "Technical" : "Clinical"} Checklist`
      }
      subtitle="Independent authorized verifier."
    >
      <Card style={{ gap: 8 }}>
        <Txt weight="700">{task.equipmentId}</Txt>
        <Detail label="Task" value={task.id} />
        <Detail label="Repair status" value={task.state} />
        <Badge label="Not available" tone="danger" />
      </Card>
      {!!message && <Notice tone="danger">{message}</Notice>}
      {screen.endsWith("checklist") && (
        <>
          <Notice>
            Illustrative checklist only. Production procedures are unconfigured.
            Passing this demonstration cannot release equipment.
          </Notice>
          <Section title={`Checks (${names.length})`}>
            {names.map((name) => (
              <Card key={name}>
                <Choices
                  label={name}
                  values={["Pass", "Fail", "Unable to Verify"]}
                  value={checks[name] ?? ""}
                  onChange={(v) => setChecks((c) => ({ ...c, [name]: v }))}
                />
              </Card>
            ))}
          </Section>
          <Field
            label="Failure / unable reason (required for non-pass)"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            label="Submit Verification"
            onPress={() => {
              try {
                const result = verify(
                  app.state,
                  account!,
                  task.id,
                  kind,
                  checks,
                  reason,
                  app.online,
                );
                app.setState(result);
                go(`${kind}-result`, task.id);
              } catch (e) {
                setMessage(e instanceof Error ? e.message : String(e));
              }
            }}
          />
        </>
      )}
      {screen.endsWith("result") && (
        <>
          {latest ? (
            <>
              <Notice tone={latest.outcome === "Pass" ? "success" : "warning"}>
                {kind} verification: {latest.outcome} · Demonstration only
              </Notice>
              <Card style={{ gap: 10 }}>
                <Detail label="Result date" value={latest.at} />
                <Detail label="Verified by" value={latest.actorId} />
                <Detail
                  label="Reason"
                  value={
                    latest.reason || "All required demonstration checks passed"
                  }
                />
                {Object.entries(latest.checks).map(([name, result]) => (
                  <Detail key={name} label={name} value={result} />
                ))}
              </Card>
              {latest.outcome !== "Pass" && (
                <Button
                  label="View Linked Follow-up"
                  onPress={() => go("rework", task.id)}
                />
              )}
            </>
          ) : (
            <Notice>
              No verification attempt has been recorded for this task.
            </Notice>
          )}
          <Notice tone="danger">
            Not released for use. All release prerequisites still apply.
          </Notice>
          <Button
            label="View Release Requirements"
            variant="secondary"
            onPress={() => go("release", task.equipmentId)}
          />
          <Button
            label="View Checklist"
            variant="secondary"
            onPress={() => go(`${kind}-checklist`, task.id)}
          />
        </>
      )}
      {screen.endsWith("history") && (
        <>
          {attempts.length ? (
            attempts.map((a) => (
              <Card key={a.id} style={{ gap: 8 }}>
                <Txt weight="600">{a.outcome}</Txt>
                <Detail label="Verifier" value={a.actorId} />
                <Detail label="Time" value={a.at} />
                <Detail
                  label="Reason"
                  value={a.reason || "All checks passed"}
                />
              </Card>
            ))
          ) : (
            <Notice>No attempts in this release cycle.</Notice>
          )}
          <LinkRow
            title="Return to checklist"
            onPress={() => go(`${kind}-checklist`, task.id)}
          />
        </>
      )}
    </Screen>
  );
}
