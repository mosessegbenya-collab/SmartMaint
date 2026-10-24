import { useState } from "react";
import { Redirect } from "expo-router";
import { Button, Card, Notice, Screen, Txt } from "@/components/smart/ui";
import { reportRecovery } from "@/services/report-recovery";
import { authErrorMessage } from "@/features/access/auth-policy";

// Development-only native storage probe. It has no backend calls, credentials or authorization grants.
export default function StorageDiagnostics() {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  if (!__DEV__) return <Redirect href="/" />;
  const run = async (action: "save" | "verify" | "remove") => {
    setBusy(true); setResult("");
    try {
      if (!reportRecovery) throw Error("Native encrypted storage is unavailable on this platform.");
      if (action === "save") {
        await reportRecovery.saveDraft({ owner: "NATIVE_STORAGE_PROBE", operationId: "PROBE", equipmentId: "TEST_DEVICE", departmentId: "TEST_SCOPE", updatedAt: Date.now(), fields: { category: "TEST", symptoms: "Synthetic encrypted restart probe 🔧", description: "No live staff or hospital records.", priority: "Routine", condition: "Unknown", inUse: "No", noticedAt: new Date().toISOString(), emergency: false } });
        const prior = (await reportRecovery.list("NATIVE_STORAGE_PROBE"))[0];
        if (!prior.photos.length) await reportRecovery.savePhoto("NATIVE_STORAGE_PROBE", "PROBE", { operationId: "PHOTO", contentType: "image/png", base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8c8AAAAASUVORK5CYII=" });
        setResult("PROBE SAVED: encrypted draft and photo. Restart the app before verifying persistence.");
      } else if (action === "verify") {
        const rows = await reportRecovery.list("NATIVE_STORAGE_PROBE");
        if (rows[0]?.fields.symptoms !== "Synthetic encrypted restart probe 🔧") throw Error("Probe is missing or changed.");
        const photo = await reportRecovery.readPhoto("NATIVE_STORAGE_PROBE", "PROBE", "PHOTO");
        if (!photo.base64.startsWith("iVBOR")) throw Error("Probe photo is missing or changed.");
        if ((await reportRecovery.list("DIFFERENT_NATIVE_PROBE_OWNER")).length) throw Error("Owner isolation failed.");
        setResult("PROBE VERIFIED: native draft/photo persistence, Unicode and owner isolation passed.");
      } else { await reportRecovery.removeDraft("NATIVE_STORAGE_PROBE", "PROBE"); setResult("PROBE REMOVED: no draft or photo remains in the probe index."); }
    } catch (error) { setResult("PROBE FAILED: " + authErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <Screen title="Development Storage Check"><Notice>Isolated synthetic probe only. This tests native encryption and restart persistence, not approved offline access or server integration.</Notice><Card style={{ gap: 14 }}><Button label="Save native storage probe" disabled={busy} onPress={() => void run("save")} /><Button label="Verify native storage probe" disabled={busy} onPress={() => void run("verify")} /><Button label="Remove native storage probe" disabled={busy} variant="secondary" onPress={() => void run("remove")} /></Card>{!!result && <Txt accessibilityLiveRegion="polite">{result}</Txt>}</Screen>;
}
