export type VerificationSnapshot = {
  task: { _id: string; revision: number; state: string; diagnosis: string; cycle: number };
  policy: { id: string; approvalReference: string; checks: string[] } | null;
};
export type VerificationEditor = {
  reviewed: VerificationSnapshot;
  checks: Record<string, 'Not checked' | 'Pass' | 'Fail'>;
  outcome: 'pass' | 'fail' | 'unable';
  notes: string;
  reference: string;
  due: string;
};
const snapshot = (current: VerificationSnapshot): VerificationSnapshot => ({
  task: { ...current.task },
  policy: current.policy ? { ...current.policy, checks: [...current.policy.checks] } : null,
});
export function verificationEditor(current: VerificationSnapshot): VerificationEditor {
  return { reviewed: snapshot(current), checks: {}, outcome: 'pass', notes: '', reference: '', due: '' };
}
export function verificationNeedsReview(editor: VerificationEditor, current: VerificationSnapshot) {
  const prior = editor.reviewed;
  return prior.task._id !== current.task._id || prior.task.revision !== current.task.revision ||
    prior.task.state !== current.task.state || prior.policy?.id !== current.policy?.id ||
    prior.policy?.approvalReference !== current.policy?.approvalReference ||
    JSON.stringify(prior.policy?.checks) !== JSON.stringify(current.policy?.checks);
}
export function reviewVerification(editor: VerificationEditor, current: VerificationSnapshot): VerificationEditor {
  if (editor.reviewed.task._id !== current.task._id) throw Error('Open the selected repair before reviewing it.');
  // Never carry a pass/fail check forward to a different repair revision or policy.
  return { ...editor, reviewed: snapshot(current), checks: {} };
}
export function requireReviewedVerification(editor: VerificationEditor, current: VerificationSnapshot) {
  if (verificationNeedsReview(editor, current)) throw Error('Review the current repair and policy, then perform the checks again. Your findings are retained.');
  if (!current.policy || current.task.state !== 'Completed') throw Error('A completed repair and approved policy are required.');
}
