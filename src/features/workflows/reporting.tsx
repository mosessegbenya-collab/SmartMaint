import { useRef, useState } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Badge, Button, Card, Choices, Detail, Field, Icon, LinkRow, Notice, Row, Screen, Select, Section, Txt } from "@/components/smart/ui";
import { allowed, validateFault } from "@/domain/policy";
import { categories, equipment, demoAccount } from "@/services/fixtures";
import { submitReport } from "@/services/development";
import { useApp } from "@/state/app-state";
import { go } from "@/navigation/go";
import { EquipmentCard } from "@/features/workspace/lists";
import { DateTimeField } from '@/components/smart/date-time-field';

export function Steps({ step }: { step: 1 | 2 | 3 }) {
  return (
    <Row style={{ justifyContent: "space-around", marginBottom: 2 }}>
      {["Details", "Photos", "Review"].map((label, index) => (
        <View key={label} style={{ alignItems: "center", gap: 3 }}>
          <Badge
            label={`${index + 1}`}
            tone={index < step ? "info" : "warning"}
          />
          <Txt size={10} color={index < step ? "#0866E8" : undefined}>
            {label}
          </Txt>
        </View>
      ))}
    </Row>
  );
}
export function Identification({ screen }: { screen: string }) {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const app = useApp();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const find = () => {
    if (!identifier.trim()) {
      setMessage("Enter the identifier printed on the equipment asset label.");
      return;
    }
    app.setDraft((d) => ({
      ...d,
      equipmentId: identifier,
    }));
    const match = equipment.find((e) => e.id === identifier);
    go(
      match ? (edit === "1" ? "review" : "equipment-detail") : "unmatched",
      identifier,
    );
  };
  if (screen === "manual")
    return (
      <Screen
        title="Enter Equipment ID"
        subtitle="Enter the equipment identifier manually if QR scanning is unavailable."
      >
        <Steps step={1} />
        <Card style={{ gap: 12 }}>
          <Field
            label="Equipment ID"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholder="DEMO-VENT-014"
          />
          {!!message && <Notice tone="danger">{message}</Notice>}
          <Button
            label="Search Equipment"
            icon="arrow-forward"
            onPress={find}
          />
        </Card>
        <Section title="Examples">
          {equipment.slice(0, 3).map((e) => (
            <LinkRow
              key={e.id}
              title={e.id}
              detail={e.name}
              onPress={() => {
                setIdentifier(e.id);
              }}
            />
          ))}
        </Section>
        <Button
          label="Browse All Equipment"
          variant="secondary"
          onPress={() => router.push("/workspace/equipment")}
        />
      </Screen>
    );
  if (screen === "unmatched")
    return (
      <Screen title="Equipment not recognised">
        <Icon name="qr-code-outline" size={72} />
        <Notice tone="warning">
          No verified equipment record matches this exact identifier. Scanning
          never creates a verified record.
        </Notice>
        <Card>
          <Detail label="Original scanned ID" value={app.draft.equipmentId} />
        </Card>
        <Button label="Try Again" onPress={() => go("scan")} />
        <Button
          label="Enter ID Manually"
          variant="secondary"
          onPress={() => go("manual")}
        />
        {allowed(app.account, "report") && (
          <Button
            label="Report as Provisional Equipment"
            variant="secondary"
            onPress={() => go("provisional")}
          />
        )}
      </Screen>
    );
  return (
    <Screen
      title="Provisional Equipment"
      subtitle="This equipment is not found in the verified inventory."
    >
      <Notice tone="warning">
        Provisional identity — requires authorized review. This does not verify
        equipment or availability.
      </Notice>
      <Field
        label="Original identifier"
        value={app.draft.equipmentId}
        onChangeText={(v) => app.setDraft((d) => ({ ...d, equipmentId: v }))}
      />
      <Select
        label="Equipment type *"
        values={[
          "Ventilator",
          "Infusion Pump",
          "Patient Monitor",
          "Other / Unknown",
        ]}
        value={app.draft.provisional?.type ?? ""}
        onChange={(type) =>
          app.setDraft((d) => ({
            ...d,
            provisional: {
              type,
              location: d.provisional?.location ?? "",
              notes: d.provisional?.notes ?? "",
            },
          }))
        }
      />
      <Select
        label="Department / location *"
        values={app.account?.scope ?? []}
        value={app.draft.provisional?.location ?? ""}
        onChange={(location) =>
          app.setDraft((d) => ({
            ...d,
            provisional: {
              type: d.provisional?.type ?? "",
              location,
              notes: d.provisional?.notes ?? "",
            },
          }))
        }
      />
      <Field
        label="Equipment identity notes"
        value={app.draft.provisional?.notes ?? ""}
        onChangeText={(notes) =>
          app.setDraft((d) => ({
            ...d,
            provisional: {
              type: d.provisional?.type ?? "",
              location: d.provisional?.location ?? "",
              notes,
            },
          }))
        }
        multiline
      />
      <Button
        label="Create Provisional Report"
        disabled={
          !app.draft.provisional?.type || !app.draft.provisional?.location
        }
        onPress={() => {
          go("fault-details");
        }}
      />
      <Button
        label="Cancel"
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
export function CaptureScreen({ scan = false }: { scan?: boolean }) {
  const app = useApp();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const scanned = useRef(false);
  const add = (uri: string) => {
    if (app.draft.photos.length >= 5) {
      setMessage(
        "Attach up to five photos. Remove an attachment before adding another.",
      );
      return;
    }
    app.setDraft((d) => ({
      ...d,
      photos: [
        ...d.photos,
        { id: `photo-${Date.now()}`, uri, status: "Local only" },
      ],
    }));
    setSelected(uri);
  };
  const gallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.75,
      });
      if (!result.canceled && result.assets[0]) add(result.assets[0].uri);
    } catch {
      setMessage(
        "The image could not be selected. Check photo access and try again.",
      );
    }
  };
  const shutter = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.75 });
      if (picture) add(picture.uri);
      else setMessage("The camera did not return a photo. Try again.");
    } catch {
      setMessage(
        "Photo capture failed. Retry or select a photo from your gallery.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title={scan ? "Scan Equipment QR" : "Take a Picture"}
      subtitle={
        scan
          ? "Align the equipment QR code inside the frame."
          : "Capture clear photos of the equipment and issue."
      }
    >
      {!scan && <Steps step={2} />}
      {!!message && <Notice tone="warning">{message}</Notice>}
      {permission?.granted ? (
        <View
          style={{
            height: scan ? 390 : 330,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: "#10254D",
          }}
        >
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing="back"
            enableTorch={torch}
            onCameraReady={() => setReady(true)}
            onMountError={() =>
              setMessage(
                "Camera unavailable. Use gallery selection or manual equipment entry.",
              )
            }
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              scan
                ? ({ data }) => {
                    if (scanned.current) return;
                    scanned.current = true;
                    app.startReport(data);
                    go(
                      equipment.some((e) => e.id === data)
                        ? "equipment-detail"
                        : "unmatched",
                      data,
                    );
                  }
                : undefined
            }
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 55,
              left: "15%",
              right: "15%",
              height: 210,
              borderWidth: 2,
              borderColor: "#FFFFFF",
              borderRadius: 20,
            }}
          />
          <View
            style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <Button
                label={torch ? "Light off" : "Flashlight"}
                icon="flash-outline"
                variant="secondary"
                onPress={() => setTorch(!torch)}
              />
              {!scan && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Take photo"
                  disabled={!ready || busy}
                  onPress={() => void shutter()}
                  style={{
                    width: 64,
                    height: 64,
                    borderWidth: 5,
                    borderColor: "white",
                    borderRadius: 40,
                    backgroundColor: "#0866E8",
                  }}
                />
              )}
            </Row>
          </View>
        </View>
      ) : (
        <Card style={{ gap: 14, minHeight: 220, justifyContent: "center" }}>
          <Icon name="camera-outline" size={48} />
          <Txt weight="700">
            {permission && !permission.canAskAgain
              ? "Camera permission denied"
              : "Camera access required"}
          </Txt>
          <Txt muted>
            Allow camera access to{" "}
            {scan ? "scan an equipment code" : "take equipment photos"}.{" "}
            {Platform.OS === "web"
              ? "Your browser must support camera access."
              : ""}
          </Txt>
          <Button
            label="Allow Camera"
            onPress={() => {
              void requestPermission().catch(() =>
                setMessage(
                  "Camera permission could not be requested. Use your device settings.",
                ),
              );
            }}
            disabled={!!permission && !permission.canAskAgain}
          />
        </Card>
      )}
      {scan ? (
        <>
          <Button
            label="Enter ID Manually"
            variant="secondary"
            icon="keypad-outline"
            onPress={() => go("manual")}
          />
          <Notice>
            Only exact QR identifiers are matched. Unknown codes remain
            unverified.
          </Notice>
        </>
      ) : (
        <>
          <Button
            label="Choose from Gallery"
            variant="secondary"
            icon="images-outline"
            onPress={() => void gallery()}
          />
          <Row style={{ flexWrap: "wrap" }}>
            {app.draft.photos.map((photo) => (
              <View key={photo.id} style={{ gap: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Preview attachment"
                  onPress={() => setSelected(photo.uri)}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={{ width: 74, height: 74, borderRadius: 10 }}
                  />
                </Pressable>
                <Button
                  label="Remove"
                  variant="secondary"
                  onPress={() => {
                    app.setDraft((d) => ({
                      ...d,
                      photos: d.photos.filter((p) => p.id !== photo.id),
                    }));
                    if (selected === photo.uri) setSelected("");
                  }}
                />
              </View>
            ))}
          </Row>
          {!!selected && (
            <>
              <Image
                source={{ uri: selected }}
                style={{ width: "100%", height: 210, borderRadius: 16 }}
                resizeMode="contain"
              />
              <Button
                label="Retake selected photo"
                variant="secondary"
                onPress={() => {
                  app.setDraft((d) => ({
                    ...d,
                    photos: d.photos.filter((p) => p.uri !== selected),
                  }));
                  setSelected("");
                }}
              />
            </>
          )}
          <Txt muted size={11}>
            {app.draft.photos.length} / 5 photos · Local attachments only
          </Txt>
          <Row>
            <View style={{ flex: 1 }}>
              <Button
                label="Back"
                variant="secondary"
                onPress={() => go("fault-details")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Next"
                icon="arrow-forward"
                onPress={() => go("review")}
              />
            </View>
          </Row>
        </>
      )}
    </Screen>
  );
}
export function FaultDetails({ emergency = false }: { emergency?: boolean }) {
  const app = useApp();
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const d = app.draft;
  const matched = equipment.find((e) => e.id === d.equipmentId);
  const patch = (update: Partial<typeof d>) =>
    app.setDraft((current) => ({ ...current, ...update }));
  return (
    <Screen
      title={emergency ? "Unverified Emergency Report" : "Report a Fault"}
      subtitle="Provide accurate details about the issue."
    >
      {!emergency && <Steps step={1} />}
      {emergency && (
        <Field
          label="Equipment identifier *"
          value={d.equipmentId}
          onChangeText={(v) => patch({ equipmentId: v })}
          autoCapitalize="none"
        />
      )}
      {emergency && (
        <Notice tone="danger">
          UNVERIFIED EMERGENCY REPORT{"\n"}Identity is unconfirmed. This report
          does not grant account access. Do not include patient information.
        </Notice>
      )}
      {matched ? (
        <EquipmentCard item={matched} />
      ) : (
        <Card>
          <Detail label="Provisional identifier" value={d.equipmentId} />
          <Badge label="UNVERIFIED" tone="warning" />
        </Card>
      )}
      {errors.length > 0 && <Notice tone="danger">{errors.join("\n")}</Notice>}
      {!matched && (
        <Select
          label="Provisional department / location *"
          values={
            app.account?.scope ?? ["Critical Care", "General Ward", "Emergency"]
          }
          value={d.provisional?.location ?? ""}
          onChange={(location) =>
            patch({
              provisional: {
                type: d.provisional?.type ?? "Other / Unknown",
                location,
                notes: d.provisional?.notes ?? "",
              },
            })
          }
        />
      )}
      {!!message && <Notice>{message}</Notice>}
      <Select
        label="Fault category *"
        values={categories}
        value={d.category}
        onChange={(v) => patch({ category: v })}
      />
      <Field
        label="Specific symptoms *"
        value={d.symptoms}
        onChangeText={(v) => patch({ symptoms: v })}
        maxLength={300}
      />
      <Field
        label="Full description (optional)"
        value={d.description}
        onChangeText={(v) => patch({ description: v })}
        multiline
        numberOfLines={3}
        maxLength={2000}
      />
      <Choices
        label="Reporter-suggested priority"
        values={["Urgent", "High", "Routine"]}
        value={d.priority}
        onChange={(v) => patch({ priority: v })}
      />
      <Select
        label="Provisional condition *"
        values={[
          "Not functioning (reported)",
          "Functioning with concern",
          "Unknown",
        ]}
        value={d.condition}
        onChange={(v) => patch({ condition: v })}
      />
      <Choices
        label="Equipment in use? *"
        values={["Yes", "No"]}
        value={d.inUse === null ? "" : d.inUse ? "Yes" : "No"}
        onChange={(v) => patch({ inUse: v === "Yes" })}
      />
      <DateTimeField
        label="Time noticed *"
        value={d.noticedAt}
        onChange={(v) => patch({ noticedAt: v })}
        required
      />
      <Button
        label="Save Draft"
        variant="secondary"
        onPress={() =>
          setMessage(
            "Draft retained in memory for this session. It has not been sent and will be lost on app restart.",
          )
        }
      />
      <Button
        label={emergency ? "Review Unverified Report" : "Next"}
        icon="arrow-forward"
        onPress={() => {
          const issues = validateFault(d);
          setErrors(issues);
          if (!issues.length) go(emergency ? "emergency-review" : "camera");
        }}
      />
    </Screen>
  );
}
export function ReviewReport({ emergency = false }: { emergency?: boolean }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const d = app.draft;
  const item = equipment.find((e) => e.id === d.equipmentId);
  const submit = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const actor = emergency
        ? {
            ...demoAccount("Clinician"),
            id: `emergency:${d.operationId}`,
            name: "Unverified emergency reporter",
            capabilities: ["report"] as const,
          }
        : app.account;
      if (!actor) throw new Error("An approved session is required.");
      const payload = { ...d, unverified: emergency || d.unverified };
      const result = submitReport(
        app.state,
        { ...actor, capabilities: [...actor.capabilities] },
        payload,
        app.online,
      );
      app.setState(result.state);
      go(emergency ? "emergency-result" : "submitted", result.report.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report could not be saved.");
      lock.current = false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Review Fault Report"
      subtitle="Check the details below before submitting."
    >
      <Steps step={3} />
      {emergency && (
        <Notice tone="danger">
          UNVERIFIED EMERGENCY REPORT · No verified identity
        </Notice>
      )}
      {!!error && <Notice tone="danger">{error}</Notice>}
      <Section title="Equipment">
        <Card style={{ gap: 9 }}>
          <Detail label="Asset ID" value={d.equipmentId} />
          <Detail
            label="Equipment"
            value={item?.name ?? "Provisional equipment"}
          />
          <Detail
            label="Location"
            value={item?.location ?? d.provisional?.location ?? "Unverified"}
          />
          <Detail
            label="Department"
            value={item?.department ?? d.provisional?.location ?? "Unverified"}
          />
          <Button
            label="Edit equipment"
            variant="secondary"
            onPress={() =>
              emergency
                ? go("emergency-form")
                : router.push({
                    pathname: "/flow/[view]",
                    params: { view: "manual", edit: "1" },
                  })
            }
          />
        </Card>
      </Section>
      <Section title="Photos">
        <Row style={{ flexWrap: "wrap" }}>
          {d.photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.uri }}
              style={{ width: 90, height: 90, borderRadius: 10 }}
            />
          ))}
        </Row>
        {!d.photos.length && (
          <Txt muted size={12}>
            No photos attached.
          </Txt>
        )}
        {!emergency && (
          <Button
            label="Edit photos"
            variant="secondary"
            onPress={() => go("attachments")}
          />
        )}
      </Section>
      <Card style={{ gap: 10 }}>
        <Detail label="Fault category" value={d.category} />
        <Detail label="Symptoms" value={d.symptoms} />
        <Detail label="Description" value={d.description || "None provided"} />
        <Detail label="Suggested priority" value={d.priority} />
        <Detail label="Condition" value={d.condition} />
        <Detail label="Equipment in use" value={d.inUse ? "Yes" : "No"} />
        <Detail label="Time noticed" value={new Date(d.noticedAt).toLocaleString()} />
        <Button
          label="Edit fault details"
          variant="secondary"
          onPress={() => go(emergency ? "emergency-form" : "fault-details")}
        />
      </Card>
      <Card style={{ gap: 10 }}>
        <Detail
          label="Reporter"
          value={app.account?.name ?? "Unverified emergency reporter"}
        />
        <Detail
          label="Identity mode"
          value={emergency ? "UNVERIFIED" : `Synthetic development identity`}
        />
      </Card>
      <Notice>
        Submission saves a demonstration report in memory. It does not notify
        maintenance personnel or establish server receipt.
      </Notice>
      <Button
        label={emergency ? "Save Unverified Report" : "Submit Report"}
        loading={busy}
        onPress={submit}
      />
      <Button label="Back" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
export function SubmissionResult({
  id,
  emergency = false,
}: {
  id?: string;
  emergency?: boolean;
}) {
  const { account, state, startReport, draft } = useApp();
  const report = state.reports.find(
    (r) =>
      r.id === id &&
      (r.ownerId === account?.id ||
        (emergency &&
          r.ownerId === `emergency:${draft.operationId}` &&
          r.unverified)),
  );
  return (
    <Screen title={emergency ? "Unverified Emergency Report" : "Saved locally"}>
      {emergency && <Notice tone="danger">UNVERIFIED EMERGENCY REPORT</Notice>}
      <Notice tone="warning">
        Not yet received by a server. Saved in this process only. This is not an
        acknowledgment by maintenance staff.
      </Notice>
      {report ? (
        <Card style={{ gap: 10 }}>
          <Detail label="Report reference" value={report.id} />
          <Detail label="Equipment" value={report.equipmentId} />
          <Detail label="Fault category" value={report.category} />
          <Detail label="Symptoms" value={report.symptoms} />
          <Detail label="Suggested priority" value={report.priority} />
          <Detail label="State" value={report.sync} />
          <Detail
            label="Photos"
            value={`${report.photos.length} local attachments`}
          />
        </Card>
      ) : (
        <Notice>There is no matching report in this session.</Notice>
      )}
      {account && (
        <Button
          label="View My Reports"
          onPress={() => router.replace("/workspace/reports")}
        />
      )}
      <Button
        label="Report Another Fault"
        variant="secondary"
        onPress={() => {
          startReport("");
          go(account ? "manual" : "emergency");
        }}
      />
    </Screen>
  );
}
