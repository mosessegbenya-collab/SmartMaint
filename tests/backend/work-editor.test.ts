import { expect, test } from 'vitest';
import { compareWorkFields, hasUnsavedWork, workFields, workRevision, type WorkSource } from '../../src/domain/work-editor';

test('work comparison includes evidence, cause, hidden parts and every checklist result', () => {
  const task: WorkSource = { _id: 'TASK', revision: 2, diagnosis: 'Power fault', notes: 'Measured supply', parts: ['Fuse'], preventiveChecklist: ['Inspect cable', 'Check alarm'] };
  const local = workFields(task);
  const current = workFields({ ...task, diagnosis: 'Alarm fault', diagnosisEvidence: 'Recorded test', causeAssessment: 'Confirmed by testing', notes: 'Replaced cable', parts: ['Cable'], preventiveResults: [{ label: 'Inspect cable', passed: true }, { label: 'Check alarm', passed: false }] });
  const rows = compareWorkFields(local, current);
  expect(rows).toHaveLength(6);
  expect(rows.every(row => row.changed)).toBe(true);
  expect(rows.find(row => row.key === 'checklist')?.right).toContain('Check alarm: Not completed');
  expect(compareWorkFields(local, workFields(task)).every(row => !row.changed)).toBe(true);
  expect(task.preventiveResults).toBeUndefined();
});

test('leaving work detects every field, checklist and pending part until recorded or explicitly replaced', () => {
  const recorded = workFields({ _id: 'TASK', revision: 1, diagnosis: 'Original', notes: '', parts: [], preventiveChecklist: ['Inspect'] });
  expect(hasUnsavedWork({ ...recorded }, recorded)).toBe(false);
  for (const local of [
    { ...recorded, diagnosis: 'New findings' },
    { ...recorded, diagnosisEvidence: 'New evidence' },
    { ...recorded, causeAssessment: 'Suspected cause' as const },
    { ...recorded, notes: 'Repair observations' },
    { ...recorded, parts: 'Fuse' },
    { ...recorded, preventiveResults: [{ label: 'Inspect', passed: true }] },
  ]) {
    expect(hasUnsavedWork(local, recorded)).toBe(true);
    expect(hasUnsavedWork(local, local)).toBe(false);
  }
  expect(hasUnsavedWork(recorded, recorded, 'Pending fuse')).toBe(true);
  expect(hasUnsavedWork(recorded, recorded, '   ')).toBe(false);
  const currentServer = { ...recorded, notes: 'Changed by another session' };
  expect(hasUnsavedWork(recorded, currentServer)).toBe(true);
});

test('work snapshots do not mutate server checklists and workflow-only changes invalidate review', () => {
  const task: WorkSource = { _id: 'TASK', revision: 4, workflowRevision: 2, diagnosis: '', notes: '', parts: [], preventiveResults: [{ label: 'Check', passed: false }] };
  const local = workFields(task); local.preventiveResults![0].passed = true;
  expect(task.preventiveResults![0].passed).toBe(false);
  expect(workRevision({ ...task, workflowRevision: 3 })).not.toBe(workRevision(task));
  expect(workRevision({ ...task, revision: 5 })).not.toBe(workRevision(task));
  expect(workRevision({ ...task, _id: 'OTHER' })).not.toBe(workRevision(task));
  expect(workRevision({ ...task, workflowRevision: undefined })).toBe(workRevision({ ...task, workflowRevision: 0 }));
});
