import { expect, test } from 'vitest';
import { preventiveStatus } from '../../src/domain/preventive-status';

test('paused status takes precedence over overdue styling, and resuming reveals the retained obligation', () => {
  expect(preventiveStatus({ active: false, nextDueAt: 10 }, 20)).toEqual({ label: 'Paused', tone: 'neutral' });
  expect(preventiveStatus({ active: true, nextDueAt: 10 }, 20)).toEqual({ label: 'Overdue', tone: 'danger' });
  expect(preventiveStatus({ active: true, nextDueAt: 30 }, 20)).toEqual({ label: 'Scheduled', tone: 'info' });
});
