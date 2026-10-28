import { Detail, Txt } from './ui';
import { reportSubmissionAt, type ReportChronology } from '@/domain/event-chronology';

export function reportListDate(report: ReportChronology) {
  const submittedAt = reportSubmissionAt(report);
  return `${submittedAt === null ? 'Created' : 'Submitted'} ${new Date(submittedAt ?? report.createdAt).toLocaleString()}`;
}
export function ReportTimingDetails({ report }: { report: ReportChronology }) {
  const submittedAt = reportSubmissionAt(report);
  return <>
    <Detail label="Record created" value={new Date(report.createdAt).toLocaleString()} />
    {report.submissionState !== 'draft' && <Detail label="Submitted" value={submittedAt === null ? 'Time not recorded' : new Date(submittedAt).toLocaleString()} />}
    {report.submissionState !== 'draft' && submittedAt === null && <Txt variant="caption" muted>The submission time is unavailable for this older report. Record creation time is shown separately.</Txt>}
  </>;
}
