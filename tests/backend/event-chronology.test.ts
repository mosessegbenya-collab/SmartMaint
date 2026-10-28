import { expect, test } from 'vitest';
import { authoredCompletionAt, maintenanceTimelineEvents, reportSubmissionAt } from '../../src/domain/event-chronology';

const task = { _id: 'TASK', state: 'Completed' as const, workflowPhase: 'closed' as const, revision: 2, createdAt: 1000, updatedAt: 9000, cycle: 1 };
const entry = { state: 'Completed', revision: 2, at: 5000, actorId: 'TECH' };

test('submission timestamps are never inferred from record creation or private drafts', () => {
  const report = { createdAt: 1000, submissionState: 'submitted' as const };
  expect(reportSubmissionAt(report)).toBeNull();
  expect(reportSubmissionAt({ ...report, submittedAt: 5000 })).toBe(5000);
  expect(reportSubmissionAt({ ...report, submittedAt: 5000, submissionState: 'draft' })).toBeNull();
  for (const submittedAt of [999, NaN, Infinity, -1, 9e15]) expect(reportSubmissionAt({ ...report, submittedAt })).toBeNull();
});

test('only an authored completion for the current work revision supplies a completion time', () => {
  expect(authoredCompletionAt(task, entry)).toBe(5000);
  for (const invalid of [null, { ...entry, baseline: true }, { ...entry, actorId: undefined }, { ...entry, revision: 1 }, { ...entry, state: 'In progress' }, { ...entry, at: 999 }, { ...entry, at: 9001 }]) expect(authoredCompletionAt(task, invalid)).toBeNull();
  expect(authoredCompletionAt({ ...task, state: 'In progress' }, entry)).toBeNull();
});

test('completion and closure retain independent times and unknown completion does not become a repair event', () => {
  const events = maintenanceTimelineEvents(task, entry);
  expect(events.map(event => [event.title, event.at])).toEqual([['Repair completion recorded', 5000], ['Work order closed', 9000]]);
  const older = maintenanceTimelineEvents(task, null);
  expect(older).toHaveLength(1); expect(older[0]).toMatchObject({ at: 9000, title: 'Work order closed', kind: 'administrative' });
  expect(older[0].detail).toMatch(/Completion time is not recorded/);
});
