# Reviewing changed preventive schedules

28 October 2026. Prepared scheduling inputs now survive incoming revisions of the same schedule. Schedule rows use the schedule ID as their identity instead of remounting for every revision.

The shared `ScheduleEditorControls` keeps the prepared date, justification and a detached snapshot of the last reviewed ID/revision/activity/due date. An incoming revision blocks task creation, date saving and activity changes until review. The comparison shows previously reviewed and current activity/due date alongside the prepared inputs. Keeping the prepared fields adopts the current revision without writing anything. Loading the current date explicitly replaces the prepared date and clears the justification.

Every mutation action rechecks the reviewed revision before invoking its callback. Existing backend scope, assignment capability and revision checks remain authoritative. A single shared pending guard prevents concurrent actions in one row; date/reason fields and all other actions are disabled during the request. Confirmation identity follows the server revision, so a dialog opened against an older revision cannot silently become a confirmation of newer data. Failed requests retain the prepared inputs.

Successful updates arrive through the existing reactive query. That updated revision also requires review before another action; no next revision or server acknowledgment is fabricated locally. Task creation continues to navigate to the resulting task. Pausing/resuming still uses the activity-only endpoint and never sends the prepared date.

The development `/design-system?example=schedule-review` preview renders the actual shared editor with fictional reactive snapshots and local callbacks. It supports incoming changes and both review choices without backend or private-storage access. [Validation evidence](../validation/current/SCHEDULE_REVIEW_INTEGRATION_2026-10-28.md).

This is in-memory retention for a mounted schedule row. Changing departments, removing the row, navigation or process/session termination can still discard the form. It does not provide encrypted schedule drafts or protected offline scheduling. No backend, dependency, deployment or institutional policy changed.
