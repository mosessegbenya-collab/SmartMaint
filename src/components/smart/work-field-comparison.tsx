import { View } from "react-native";
import { Badge, Card, Row, Txt } from "./ui";
import { compareWorkFields, type WorkFields } from "@/domain/work-editor";

export function WorkFieldComparison({ local, current }: { local: WorkFields; current: WorkFields }) {
  const rows = compareWorkFields(local, current);
  return <View style={{ gap: 12 }}>
    <Txt variant="label">{rows.filter(row => row.changed).length} of {rows.length} work fields differ</Txt>
    {rows.map(row => <Card key={row.key} style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Txt variant="label">{row.label}</Txt><Badge label={row.changed ? "Different" : "Matches"} tone={row.changed ? "warning" : "neutral"} /></Row>
      <Txt variant="caption" muted>Your unsaved details</Txt><Txt>{row.left || "Not recorded"}</Txt>
      <Txt variant="caption" muted>Current server</Txt><Txt>{row.right || "Not recorded"}</Txt>
    </Card>)}
  </View>;
}
