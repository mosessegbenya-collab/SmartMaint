# Preventive schedule activity

28 October 2026. Pausing or resuming a preventive schedule is now separate from editing its next due date.

Previously the pause control sent the prepared date field through the reschedule mutation. This could apply an uncommitted date edit as part of pausing, and an overdue schedule could not be paused without moving its due date into the future.

`preventive.setActivity` changes only activity and revision. It derives the actor from authentication, requires assignment capability and department scope, checks the reviewed revision, requires a justification and records a `preventive.activity` audit entry with Active/Paused values. It accepts overdue dates because it never changes the obligation. Existing work orders, occurrence identities and due dates remain unchanged. Paused schedules cannot generate a new occurrence; resuming retains the original next occurrence and can restore an overdue status.

The mobile schedule row calls this action without the prepared date. Its confirmation explains that date edits are not applied. Date changes retain their separate Save next due date action and future-date validation. Older clients using the existing combined reschedule endpoint retain its previous contract.

Shared `ScheduleStatus` gives paused status precedence with neutral styling and explains the retained date and existing work. Active overdue schedules remain visibly overdue. `ScheduleActivityAction` shares the existing confirmation surface and is bound to the reviewed activity/revision. The subsequent [schedule-review continuation](SCHEDULE_REVIEW_INTEGRATION.md) preserves prepared inputs across reactive revisions and requires explicit review.

The development preview `/design-system?example=preventive` uses these real status and activity controls with a fictional overdue schedule and a distinct prepared date. It changes only local example state and never calls the backend. Its prepared text is illustrative; it does not establish retention behavior of the complete live schedule row.

[Validation evidence](../validation/current/PREVENTIVE_ACTIVITY_INTEGRATION_2026-10-28.md). No approved checklist, staff access, institutional policy or equipment-release behavior changed. Full live authenticated preventive workflows and cross-platform acceptance remain open.
