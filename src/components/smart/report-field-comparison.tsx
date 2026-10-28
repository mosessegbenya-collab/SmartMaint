import { useState } from "react";
import { View } from "react-native";
import { Badge, Button, Card, Notice, Row, Txt } from "./ui";
import { compareReportFields } from "@/domain/report-field-comparison";
import type { RecoveryFields } from "@/domain/report-recovery";

function display(value: string | boolean, key: keyof RecoveryFields) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "noticedAt" && Number.isFinite(Date.parse(value))) return new Date(value).toLocaleString();
  return value || "Not entered";
}

export function ReportFieldComparison({ left, right, leftLabel, rightLabel }: { left: RecoveryFields; right: RecoveryFields; leftLabel: string; rightLabel: string }) {
  const [showMatching, setShowMatching] = useState(false);
  const rows = compareReportFields(left, right);
  const changed = rows.filter(row => row.changed);
  return <View style={{ gap: 12 }}>
    <Txt variant="label">{changed.length} of {rows.length} report fields differ</Txt>
    {!changed.length && <Notice>All report fields match. Review report and photo revisions separately before continuing.</Notice>}
    {(showMatching ? rows : changed).map(row => <Card key={row.key} style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Txt variant="label">{row.label}</Txt><Badge label={row.changed ? "Different" : "Matches"} tone={row.changed ? "warning" : "neutral"} /></Row>
      <View style={{ gap: 3 }}><Txt variant="caption" muted>{leftLabel}</Txt><Txt>{display(row.left, row.key)}</Txt></View>
      <View style={{ gap: 3 }}><Txt variant="caption" muted>{rightLabel}</Txt><Txt>{display(row.right, row.key)}</Txt></View>
    </Card>)}
    {changed.length < rows.length && <Button label={showMatching ? "Show differences only" : `Show all ${rows.length} report fields`} variant="secondary" onPress={() => setShowMatching(value => !value)} />}
  </View>;
}
