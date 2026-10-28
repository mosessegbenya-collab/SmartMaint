import { expect, test } from 'vitest';
import { releaseEditor, releaseNeedsReview, requireReviewedRelease, reviewRelease, type ReleaseSnapshot } from '../../src/domain/release-editor';

const current = (): ReleaseSnapshot => ({ equipmentId: 'TEST', evidenceSnapshot: 'REVIEWED', expectedTaskRevision: 3, policyReference: 'TEST ONLY', eligible: true, available: false, canRelease: true, blockers: ['An authorized return-to-service decision is required.'] });
test('release evidence changes require explicit review even when policy and repair revision are unchanged', () => {
  const initial = current(); const editor = { ...releaseEditor(initial), reason: 'Prepared justification' };
  const changed = { ...initial, evidenceSnapshot: 'NEW-EVIDENCE' };
  expect(releaseNeedsReview(editor, changed)).toBe(true);
  expect(() => requireReviewedRelease(editor, changed)).toThrow(/Release evidence changed/);
  const reviewed = reviewRelease(editor, changed);
  expect(reviewed.reason).toBe(editor.reason);
  expect(editor.reviewed.evidenceSnapshot).toBe('REVIEWED');
  expect(reviewed.reviewed.evidenceSnapshot).toBe('NEW-EVIDENCE');
  expect(() => requireReviewedRelease(reviewed, changed)).not.toThrow();
});
test('review cannot bypass a safety hold, absent completed repair, missing policy or withdrawn authority', () => {
  const editor = { ...releaseEditor(current()), reason: 'Prepared justification' };
  for (const change of [{ eligible: false }, { canRelease: false }, { expectedTaskRevision: null }, { policyReference: null }]) {
    const changed = { ...current(), ...change };
    expect(() => requireReviewedRelease(reviewRelease(editor, changed), changed)).toThrow(/prerequisites/);
  }
  expect(() => requireReviewedRelease(releaseEditor(current()), current())).toThrow(/justification/);
  expect(() => reviewRelease(editor, { ...current(), equipmentId: 'OTHER' })).toThrow(/selected equipment/);
});
test('a reactive availability receipt leaves the reviewed evidence intact and snapshots isolate restrictions', () => {
  const initial = current(); const editor = { ...releaseEditor(initial), reason: 'Prepared justification' };
  expect(releaseNeedsReview(editor, { ...initial, available: true, blockers: [] })).toBe(false);
  initial.blockers.push('Additional restriction');
  expect(editor.reviewed.blockers).toHaveLength(1);
  expect(releaseNeedsReview(editor, { ...current(), expectedTaskRevision: 4 })).toBe(true);
  expect(releaseNeedsReview(editor, { ...current(), policyReference: 'REPLACEMENT' })).toBe(true);
});
