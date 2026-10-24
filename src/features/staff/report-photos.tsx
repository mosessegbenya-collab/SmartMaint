import { useEffect, useState } from "react";
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { randomUUID } from "expo-crypto";
import { useAction, useMutation, useQuery } from "convex/react";
import type { GenericId } from "convex/values";
import { Button, Card, Detail, Notice, Txt } from "@/components/smart/ui";
import { staffApi } from "@/services/staff-api";
import { authErrorMessage } from "@/features/access/auth-policy";
import { ConfirmAction } from "./ui";
type PendingPhoto = { uri: string; base64: string; contentType: string; operationId: string };
export function ReportPhotos({ reportId, editable = false, onSnapshot }: { reportId: GenericId<"faultReports">; editable?: boolean; onSnapshot?: (revision: number) => void }) {
  const snapshot = useQuery(staffApi.attachments.list, { reportId }); const list = snapshot?.items; const upload = useAction(staffApi.attachments.upload); const read = useAction(staffApi.attachments.read); const remove = useMutation(staffApi.attachments.remove);
  useEffect(() => { if (snapshot) onSnapshot?.(snapshot.revision); }, [snapshot, onSnapshot]);
  const [photo, setPhoto] = useState<PendingPhoto | null>(null); const [viewed, setViewed] = useState<{ id: string; uri: string } | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const select = async (camera: boolean) => {
    setBusy(true); setMessage("");
    try {
      if (camera) { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) throw Error("Camera permission denied. You can select an existing equipment photo instead."); }
      const result = await (camera ? ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, base64: true }) : ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true }));
      if (result.canceled) return;
      const asset = result.assets[0]; const base64 = asset.base64;
      if (!base64 || Math.floor(base64.length * 3 / 4) > 2 * 1024 * 1024) throw Error("Choose a JPEG, PNG or WebP photo smaller than 2 MB.");
      const contentType = base64.startsWith("/9j/") ? "image/jpeg" : base64.startsWith("iVBOR") ? "image/png" : base64.startsWith("UklGR") ? "image/webp" : "";
      if (!contentType) throw Error("Unsupported photo format.");
      setPhoto({ uri: asset.uri, base64, contentType, operationId: randomUUID() });
    } catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); }
  };
  const send = async () => { if (!photo || busy) return; setBusy(true); setMessage(""); try { await upload({ reportId, operationId: photo.operationId, contentType: photo.contentType, base64: photo.base64 }); setPhoto(null); setMessage("Photo stored securely for this report."); } catch (error) { setMessage(authErrorMessage(error)); } finally { setBusy(false); } };
  return <Card style={{ gap: 10 }}><Txt size={20} weight="700">Equipment photos ({list?.length ?? 0}/5)</Txt><Txt size={12} muted>Photograph equipment only. Avoid patients, documents and identifying information. Up to five JPEG/PNG/WebP files, 2 MB each.</Txt>
    {editable && <><Button label="Take a picture" loading={busy} disabled={(list?.length ?? 0) >= 5} onPress={() => void select(true)} /><Button label="Choose existing photo" variant="secondary" loading={busy} disabled={(list?.length ?? 0) >= 5} onPress={() => void select(false)} /></>}
    {photo && <><Image source={{ uri: photo.uri }} style={{ height: 200, width: "100%", borderRadius: 16 }} accessibilityLabel="Selected equipment photo, not yet uploaded" /><Button label="Upload / retry photo" loading={busy} onPress={() => void send()} /><Button label="Remove selected photo" variant="secondary" disabled={busy} onPress={() => setPhoto(null)} /></>}
    {list?.map((r, index) => <Card key={r.id} style={{ gap: 8 }}><Detail label={`Photo ${index + 1}`} value={`${Math.ceil(r.size / 1024)} KB · ${r.contentType}`} /><Button label={`View photo ${index + 1}`} variant="secondary" disabled={busy} onPress={() => { setBusy(true); void read({ id: r.id }).then((data) => setViewed({ id: r.id, uri: data.dataUri })).catch((error) => setMessage(authErrorMessage(error))).finally(() => setBusy(false)); }} />{viewed?.id === r.id && <Image source={{ uri: viewed.uri }} style={{ height: 220, width: "100%", borderRadius: 16 }} accessibilityLabel={`Equipment attachment ${index + 1}`} />}{editable && <ConfirmAction label={`Remove photo ${index + 1}`} title="Remove this equipment photo?" detail="The stored image will be deleted; the removal is audited." danger onConfirm={() => remove({ id: r.id })} />}</Card>)}
    {busy && <Notice>Photo request in progress…</Notice>}{message && <Notice>{message}</Notice>}
  </Card>;
}
