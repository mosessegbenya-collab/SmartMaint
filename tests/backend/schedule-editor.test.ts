import { expect, test } from 'vitest';
import { requireReviewedSchedule, reviewSchedule, scheduleEditor, scheduleNeedsReview } from '../../src/domain/schedule-editor';

const initial = { _id: 'SCHEDULE', revision: 1, active: true, nextDueAt: Date.UTC(2026, 9, 27, 8) };
test('incoming schedule changes preserve prepared date and reason but block operations until reviewed', () => {
  const editor = { ...scheduleEditor(initial), due: '2026-11-15T08:00:00.000Z', reason: 'Prepared justification' };
  const current = { ...initial, revision: 2, active: false, nextDueAt: Date.UTC(2026, 10, 10, 8) };
  expect(scheduleNeedsReview(editor, current)).toBe(true);
  expect(() => requireReviewedSchedule(editor, current)).toThrow(/Review/);
  const retained = reviewSchedule(editor, current, true);
  expect(retained.due).toBe(editor.due); expect(retained.reason).toBe(editor.reason);
  expect(() => requireReviewedSchedule(retained, current)).not.toThrow();
  expect(scheduleNeedsReview(retained, { ...current, revision: 3 })).toBe(true);
  expect(editor.reviewed).toEqual(initial);
});

test('loading current schedule explicitly replaces prepared date and clears justification', () => {
  const editor = { ...scheduleEditor(initial), due: '2026-12-01T08:00:00.000Z', reason: 'Old justification' };
  const current = { ...initial, revision: 2, nextDueAt: Date.UTC(2026, 10, 10, 8) };
  const loaded = reviewSchedule(editor, current, false);
  expect(loaded.due).toBe(new Date(current.nextDueAt).toISOString());
  expect(loaded.reason).toBe(''); expect(scheduleNeedsReview(loaded, current)).toBe(false);
  expect(editor.reason).toBe('Old justification');
  current.revision = 3;
  expect(loaded.reviewed.revision).toBe(2);
});

test('a review cannot transfer prepared inputs to another schedule', () => {
  const editor = scheduleEditor(initial);
  const different = { ...initial, _id: 'OTHER' };
  expect(scheduleNeedsReview(editor, different)).toBe(true);
  expect(() => requireReviewedSchedule(editor, different)).toThrow();
  expect(() => reviewSchedule(editor, different, true)).toThrow();
  expect(() => reviewSchedule(editor, different, false)).toThrow();
});
