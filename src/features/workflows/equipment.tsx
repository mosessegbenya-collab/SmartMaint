import { Image } from "react-native";
import { brandAssets, Button, Card, Detail, LinkRow, Notice, Screen, Section, Txt } from "@/components/smart/ui";
import { equipment } from "@/services/fixtures";
import { allowed, releaseBlockers } from "@/domain/policy";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
import { EquipmentCard } from "@/features/workspace/lists";
export function EquipmentWorkflow({
  screen,
  id,
}: {
  screen: string;
  id?: string;
}) {
  const app = useApp();
  const item = equipment.find(
    (e) => e.id === (id ?? app.draft.equipmentId ?? "DEMO-VENT-014"),
  );
  if (!item || !app.account?.scope.includes(item.department))
    return (
      <Screen title="Equipment unavailable">
        <Notice>
          This identifier is unverified or outside your account scope.
        </Notice>
      </Screen>
    );
  const blockers = releaseBlockers(item, app.state);
  const holds = app.state.holds.filter(
    (h) => h.equipmentId === item.id && h.active,
  );
  const title =
    screen === "equipment-detail"
      ? "Equipment Details"
      : screen === "equipment-history"
        ? "Maintenance History"
        : screen === "availability"
          ? "Derived Availability"
          : screen === "release"
            ? "Release Prerequisites"
            : screen === "holds"
              ? "Active Safety Holds"
              : screen === "hold-detail"
                ? "Safety Hold Details"
                : "Equipment Status Timeline";
  return (
    <Screen
      title={title}
      subtitle="Equipment information and maintenance safety."
    >
      <EquipmentCard item={item} />
      {screen === "equipment-detail" && (
        <>
          <Card style={{ gap: 10 }}>
            <Image
              source={brandAssets[item.asset]}
              style={{ width: "100%", height: 160 }}
              resizeMode="contain"
            />
            <Detail label="Department" value={item.department} />
            <Detail label="Location" value={item.location} />
            <Detail label="Model" value={item.model} />
            <Detail
              label="Identity"
              value={item.verified ? "Verified synthetic record" : "Unverified"}
            />
          </Card>
          <Section title="Maintenance Status">
            <LinkRow
              title="Availability and release requirements"
              detail={`${blockers.length} release blockers`}
              icon="shield-checkmark-outline"
              onPress={() => go("availability", item.id)}
            />
            <LinkRow
              title="Active Safety Holds"
              detail={`${holds.length} active hold(s)`}
              icon="warning-outline"
              onPress={() => go("holds", item.id)}
            />
          </Section>
          {allowed(app.account, "report") && (
            <Button
              label="Report a Fault"
              icon="document-text-outline"
              onPress={() => {
                app.startReport(item.id);
                go("fault-details");
              }}
            />
          )}
          <Button
            label="View History"
            variant="secondary"
            onPress={() => go("equipment-history", item.id)}
          />
        </>
      )}
      {["availability", "release"].includes(screen) && (
        <>
          <Notice tone="danger">
            Not available. Availability is derived from all release
            requirements.
          </Notice>
          <Card style={{ gap: 12 }}>
            <Detail
              label="Identity verified"
              value={item.verified ? "Confirmed (synthetic)" : "Not verified"}
            />
            <Detail
              label="Maintenance"
              value={
                app.state.tasks
                  .filter((t) => t.equipmentId === item.id)
                  .map((t) => `${t.id}: ${t.state}`)
                  .join("\n") || "Unknown"
              }
            />
            <Detail
              label="Technical verification"
              value={
                app.state.attempts
                  .filter(
                    (a) =>
                      a.kind === "technical" &&
                      app.state.tasks.some(
                        (t) => t.id === a.taskId && t.equipmentId === item.id,
                      ),
                  )
                  .at(-1)?.outcome ?? "Pending"
              }
            />
            <Detail
              label="Clinical verification"
              value={
                app.state.attempts
                  .filter(
                    (a) =>
                      a.kind === "clinical" &&
                      app.state.tasks.some(
                        (t) => t.id === a.taskId && t.equipmentId === item.id,
                      ),
                  )
                  .at(-1)?.outcome ?? "Pending"
              }
            />
            <Detail label="Safety holds" value={`${holds.length} active`} />
          </Card>
          <Section title="Blocking conditions">
            {blockers.map((b) => (
              <Notice key={b} tone="warning">
                {b}
              </Notice>
            ))}
          </Section>
          <LinkRow
            title="Review Safety Holds"
            icon="shield-outline"
            onPress={() => go("holds", item.id)}
          />
          <Button
            label="Release unavailable · Policy required"
            disabled
            onPress={() => {}}
          />
          <Notice>
            There is no manual availability override. Approved production
            release policy and authorized backend enforcement are required.
          </Notice>
        </>
      )}
      {screen === "holds" && (
        <>
          {holds.length ? (
            holds.map((h) => (
              <LinkRow
                key={h.id}
                title={h.id}
                detail={h.reason}
                icon="warning-outline"
                onPress={() => go("hold-detail", item.id)}
              />
            ))
          ) : (
            <Notice>
              No active synthetic holds for this equipment. Other release
              requirements still apply.
            </Notice>
          )}
        </>
      )}
      {screen === "hold-detail" && (
        <>
          {holds.map((h) => (
            <Card key={h.id} style={{ gap: 12 }}>
              <Notice tone="danger">
                SAFETY HOLD · Active{"\n"}Equipment use is restricted until the
                hold is resolved.
              </Notice>
              <Detail label="Hold reference" value={h.id} />
              <Detail
                label="Date raised"
                value={new Date(h.createdAt).toLocaleString()}
              />
              <Detail label="Raised by" value={`Demo ${h.actorId}`} />
              <Detail label="Reason" value={h.reason} />
              <Detail
                label="Resolution guidance"
                value="Complete required verification and authorized hold review."
              />
            </Card>
          ))}
          <Notice>
            Hold clearance requires an authorized backend operation and an
            approved safety policy. This action is unavailable in this preview.
          </Notice>
          <LinkRow
            title="View status timeline"
            icon="time-outline"
            onPress={() => go("status-timeline", item.id)}
          />
        </>
      )}
      {["equipment-history", "status-timeline"].includes(screen) && (
        <>
          <Notice>
            Demonstration history only. This is not a real server audit trail.
          </Notice>
          {app.state.tasks
            .filter((t) => t.equipmentId === item.id)
            .map((t) => (
              <LinkRow
                key={t.id}
                title={`${t.id} · ${t.state}`}
                detail={t.notes || "No repair notes yet"}
                icon="construct-outline"
                onPress={() => go("maintenance-history", t.id)}
              />
            ))}
          {app.state.attempts
            .filter((a) =>
              app.state.tasks.some(
                (t) => t.equipmentId === item.id && t.id === a.taskId,
              ),
            )
            .map((a) => (
              <Card key={a.id}>
                <Txt weight="700">
                  {a.kind} · {a.outcome}
                </Txt>
                <Txt size={12} muted>
                  {a.at} · {a.actorId}
                </Txt>
              </Card>
            ))}
          {holds.map((h) => (
            <Card key={h.id}>
              <Txt weight="700">Safety hold raised</Txt>
              <Txt size={12} muted>
                {h.createdAt}
              </Txt>
              <Txt size={12}>{h.reason}</Txt>
            </Card>
          ))}
          <Button
            label="View release requirements"
            onPress={() => go("release", item.id)}
          />
        </>
      )}
    </Screen>
  );
}
