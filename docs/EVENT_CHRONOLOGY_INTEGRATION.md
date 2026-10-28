# Recorded event times

28 October 2026. Report submission, repair completion and administrative closure now retain their distinct meanings across persistence, metrics and mobile presentation.

## Report timing

Publishing a reviewed draft records `submittedAt` while preserving its original `createdAt`. An exact retry returns the existing receipt without changing either time. Direct authenticated report creation records both times and cannot return an unpublished draft as a submission receipt. Existing submitted records without a recorded submission time remain valid; no historical time is inferred or backfilled.

Report receipts and detail screens share `ReportTimingDetails`. Lists identify the displayed date as Submitted when known or Created otherwise. Management export date filters explicitly refer to record creation, matching the existing query and CSV contract.

## Maintenance timing

Equipment timelines and completion-duration metrics resolve an authored, non-baseline Completed entry through the exact task/work revision using `workEntries.by_task_revision`. They reject missing authors, stale revisions, invalid times and imported baselines. A baseline imported later cannot displace the matching authored work entry.

Known repair completion appears at the immutable work-entry time. Administrative closure appears separately at the task update time with neutral styling. Where completion evidence is unavailable, the timeline identifies the displayed time as a record update and explicitly states that completion time was not recorded. Completion and closure continue to require separate assessment of independent verification and equipment release.

The equipment timeline remains a bounded overview of up to 50 most recently created records per source and up to 100 combined events. Its footer states the source selection; it is not a complete event-history export.

## Review and boundaries

Open `/design-system?example=chronology` during development to compare recorded times and older records through the actual shared components. The example is fictional and makes no backend or private-storage calls. [Validation evidence](../validation/current/EVENT_CHRONOLOGY_INTEGRATION_2026-10-28.md).

The optional field and index were synced to development deployment `greedy-bat-971`. No production deployment, historical timestamp rewrite, staff approval or institutional policy change was performed. Live authenticated chronological journeys, iOS, screen-reader traversal and the full reference acceptance remain open.
