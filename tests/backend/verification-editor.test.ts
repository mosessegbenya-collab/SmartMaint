import { expect, test } from 'vitest';
import { requireReviewedVerification, reviewVerification, verificationEditor, verificationNeedsReview } from '../../src/domain/verification-editor';

const current = () => ({ task: { _id: 'REPAIR', revision: 3, state: 'Completed', diagnosis: 'Original finding', cycle: 1 }, policy: { id: 'POLICY', approvalReference: 'TEST ONLY', checks: ['Test check'] } });
test('repair review retains prepared narrative but resets every check before a new decision', () => {
  const initial = current();
  const editor = { ...verificationEditor(initial), notes: 'Prepared finding', reference: 'Prepared evidence', due: '2027-01-01T08:00:00.000Z', checks: { 'Test check': 'Pass' as const }, outcome: 'fail' as const };
  const changed = { ...initial, task: { ...initial.task, revision: 4, diagnosis: 'Updated finding' } };
  expect(verificationNeedsReview(editor, changed)).toBe(true);
  expect(() => requireReviewedVerification(editor, changed)).toThrow(/Review/);
  const reviewed = reviewVerification(editor, changed);
  expect(reviewed).toMatchObject({ notes: editor.notes, reference: editor.reference, due: editor.due, outcome: 'fail', checks: {} });
  expect(editor.checks).toEqual({ 'Test check': 'Pass' });
  expect(verificationNeedsReview(reviewed, changed)).toBe(false);
  expect(() => requireReviewedVerification(reviewed, changed)).not.toThrow();
});
test('policy replacement, withdrawal and changed labels require review even with unchanged repair revision', () => {
  const initial = current(); const editor = verificationEditor(initial);
  for (const policy of [null, { ...initial.policy, id: 'REPLACEMENT' }, { ...initial.policy, checks: ['Replacement check'] }]) {
    expect(verificationNeedsReview(editor, { ...initial, policy })).toBe(true);
    expect(() => requireReviewedVerification(editor, { ...initial, policy })).toThrow();
  }
  expect(() => requireReviewedVerification(reviewVerification(editor, { ...initial, policy: null }), { ...initial, policy: null })).toThrow(/approved policy/);
  expect(() => reviewVerification(editor, { ...initial, task: { ...initial.task, _id: 'OTHER' } })).toThrow(/selected repair/);
});
test('review snapshots are isolated from incoming references and a completed repair is required', () => {
  const initial = current(); const editor = verificationEditor(initial);
  initial.policy.checks.push('Additional check'); initial.task.revision++;
  expect(editor.reviewed.policy?.checks).toEqual(['Test check']);
  expect(editor.reviewed.task.revision).toBe(3);
  const active = { ...current(), task: { ...current().task, state: 'In progress' } };
  expect(() => requireReviewedVerification(reviewVerification(editor, active), active)).toThrow(/completed repair/);
});
