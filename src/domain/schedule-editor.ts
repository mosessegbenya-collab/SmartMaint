export type ScheduleSnapshot = { _id: string; revision: number; active: boolean; nextDueAt: number };
export type ScheduleEditor = { reviewed: ScheduleSnapshot; due: string; reason: string };
export function scheduleEditor(schedule: ScheduleSnapshot): ScheduleEditor {
  return { reviewed: { ...schedule }, due: new Date(schedule.nextDueAt).toISOString(), reason: '' };
}
export function scheduleNeedsReview(editor: ScheduleEditor, current: ScheduleSnapshot) {
  return editor.reviewed._id !== current._id || editor.reviewed.revision !== current.revision;
}
export function reviewSchedule(editor: ScheduleEditor, current: ScheduleSnapshot, keep: boolean): ScheduleEditor {
  if (editor.reviewed._id !== current._id) throw Error('Open the selected schedule before reviewing it.');
  return keep ? { ...editor, reviewed: { ...current } } : scheduleEditor(current);
}
export function requireReviewedSchedule(editor: ScheduleEditor, current: ScheduleSnapshot) {
  if (scheduleNeedsReview(editor, current)) throw Error('Review the current schedule before applying this change. Your prepared fields are retained.');
}
