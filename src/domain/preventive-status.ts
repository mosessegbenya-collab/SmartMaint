export function preventiveStatus(schedule: { active: boolean; nextDueAt: number }, now: number): { label: string; tone: 'neutral' | 'danger' | 'info' } {
  if (!schedule.active) return { label: 'Paused', tone: 'neutral' };
  return schedule.nextDueAt < now ? { label: 'Overdue', tone: 'danger' } : { label: 'Scheduled', tone: 'info' };
}
