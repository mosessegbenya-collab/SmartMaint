import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { reportRecovery } from "@/services/report-recovery";
import type { RecoveryDraft, RecoveryFields } from "@/domain/report-recovery";
import { useStaffAccess } from "./provider";
import { authErrorMessage } from "@/features/access/auth-policy";
import { DraftWriter } from "@/domain/draft-writer";

export function useDeviceDraft({ equipmentId, departmentId, operationId, fields, server, requestedOperation, enabled = true }: { equipmentId: string; departmentId?: string; operationId: string; fields: RecoveryFields; server?: { id: string; revision: number }; requestedOperation?: string; enabled?: boolean }) {
  const { account } = useStaffAccess();
  const owner = account?.id;
  const allowed = enabled && !!owner && !!departmentId && !!account?.scope.some((id) => id === departmentId);
  const [candidate, setCandidate] = useState<RecoveryDraft | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [committed, setCommitted] = useState<{ snapshot: string; at: number } | null>(null);
  const writer = useRef<DraftWriter<{ snapshot: string; data: Omit<RecoveryDraft, "photos" | "updatedAt"> }> | null>(null);
  useEffect(() => {
    let current = true;
    const pending = new DraftWriter<{ snapshot: string; data: Omit<RecoveryDraft, "photos" | "updatedAt"> }>(async ({ snapshot, data }) => {
      const updatedAt = Date.now(); await reportRecovery?.saveDraft({ ...data, updatedAt });
      if (current) { setCommitted({ snapshot, at: updatedAt }); setError(""); }
    }, (failure) => { if (current) setError(authErrorMessage(failure)); });
    writer.current = pending;
    const listener = AppState.addEventListener("change", (state) => { if (state !== "active") void pending.flush().catch((failure) => { if (current) setError(authErrorMessage(failure)); }); });
    return () => { current = false; listener.remove(); void pending.flush().catch(() => { console.warn("Device draft flush did not complete; only the last committed device copy is recoverable."); }); if (writer.current === pending) writer.current = null; };
  }, [owner]);
  const snapshot = JSON.stringify({ owner, equipmentId, departmentId, operationId, fields, server });
  useEffect(() => {
    let current = true;
    if (!allowed || !owner || !reportRecovery) return;
    void reportRecovery.list(owner).then((items) => {
      if (!current) return;
      const candidates = items.filter((item) => item.departmentId === departmentId && item.equipmentId === equipmentId && item.fields.emergency === fields.emergency && (!requestedOperation || item.operationId === requestedOperation)).sort((a, b) => b.updatedAt - a.updatedAt);
      setCandidate(candidates[0] ?? null); setReady(true);
    }).catch((failure) => { if (current) setError(authErrorMessage(failure)); });
    return () => { current = false; };
  }, [allowed, owner, equipmentId, departmentId, requestedOperation, fields.emergency]);
  useEffect(() => {
    if (!allowed || !ready || candidate || !reportRecovery) return;
    const data = JSON.parse(snapshot) as Omit<RecoveryDraft, "photos" | "updatedAt">;
    if (!data.server && !data.fields.category && !data.fields.symptoms && !data.fields.description) return;
    writer.current?.schedule({ snapshot, data });
  }, [allowed, ready, candidate, snapshot]);
  const save = async (nextServer = server) => {
    if (!reportRecovery) return;
    if (!allowed || !owner || !departmentId) throw Error("Fresh approved access to this department is required for device recovery.");
    if (!ready) throw Error("Device recovery is still loading. Wait before replacing saved work.");
    if (candidate) throw Error("Review the saved device draft before replacing its contents.");
    writer.current?.cancel();
    await reportRecovery.saveDraft({ owner, equipmentId, departmentId, operationId, fields, server: nextServer, updatedAt: Date.now() });
    setCommitted({ snapshot: JSON.stringify({ owner, equipmentId, departmentId, operationId, fields, server: nextServer }), at: Date.now() }); setError("");
  };
  return { candidate, clearCandidate: () => setCandidate(null), error, savedAt: committed?.snapshot === snapshot ? committed.at : null, available: !!reportRecovery && allowed, save };
}
