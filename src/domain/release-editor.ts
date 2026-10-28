export type ReleaseSnapshot = {
  equipmentId: string;
  evidenceSnapshot: string;
  expectedTaskRevision: number | null;
  policyReference: string | null;
  blockers: string[];
  eligible: boolean;
  available: boolean;
  canRelease: boolean;
};
export type ReleaseEditor = { reviewed: ReleaseSnapshot; reason: string };
const snapshot = (current: ReleaseSnapshot): ReleaseSnapshot => ({ ...current, blockers: [...current.blockers] });
export function releaseEditor(current: ReleaseSnapshot): ReleaseEditor {
  return { reviewed: snapshot(current), reason: '' };
}
export function releaseNeedsReview(editor: ReleaseEditor, current: ReleaseSnapshot) {
  const prior = editor.reviewed;
  // Availability changes after a release receipt without changing its underlying evidence.
  return prior.equipmentId !== current.equipmentId || prior.evidenceSnapshot !== current.evidenceSnapshot ||
    prior.expectedTaskRevision !== current.expectedTaskRevision || prior.policyReference !== current.policyReference ||
    prior.eligible !== current.eligible || prior.canRelease !== current.canRelease;
}
export function reviewRelease(editor: ReleaseEditor, current: ReleaseSnapshot): ReleaseEditor {
  if (editor.reviewed.equipmentId !== current.equipmentId) throw Error('Open the selected equipment before reviewing release.');
  return { ...editor, reviewed: snapshot(current) };
}
export function requireReviewedRelease(editor: ReleaseEditor, current: ReleaseSnapshot) {
  if (releaseNeedsReview(editor, current)) throw Error('Release evidence changed. Review the current prerequisites before authorizing return to service. Your justification is retained.');
  if (!current.canRelease || !current.eligible || current.expectedTaskRevision === null || !current.policyReference) throw Error('Current release prerequisites and institutional authority are required.');
  if (!editor.reason.trim()) throw Error('Enter a return-to-service justification.');
}
