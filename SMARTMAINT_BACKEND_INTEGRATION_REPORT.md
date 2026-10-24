# Corrective backend integration

New source modules: convex/workflows.ts (inventory/lookups/pagination/provisional/detail/history/inbox); reporting.ts (private draft/review/publication); attachments.ts (authenticated upload/read/delete); safety.ts (disabled-until-approved institutional policy, attempts/rework/release/hold resolution); preventive.ts (approved schedule references, occurrence creation and rescheduling).

Schema additions include workEntries, notifications, provisionalReports, reportAttachments, safetyPolicies, safetyAttempts, releaseRecords and preventiveSchedules. Existing task/report/hold fields are extended compatibly; old submitted reports retain legacy semantics. Typed references derive from source; no generated deployment binding is fabricated.

Operational additions include effective-priority/submission filters, independent completed-repair verifier queues, scoped equipment timeline summaries, targeted operational notices, unread state and explicit independent-verifier requests. Requests recheck policy, task revision, independence, recipient scope/current grants and technical-before-clinical ordering. Notification request retries are deduplicated; requests never create safety decisions. Notification fan-out and preferences remain incomplete; external dispatch is unavailable.

Operational source is wired to actual backend calls rather than fixture acknowledgments. Preview remains separate. Backend integration status: **Blocked**, because no selected deployment, Clerk issuer/verified claims, approved policy, operator bootstrap or real inventory exists. No functions were deployed and no actual staff/safety decision was recorded.

Public setup/operator instructions remain in docs/STAFF_ACCESS.md. Additional safety policy configuration is internal-only in safety:configurePolicy; do not invoke it until an institution approves exact checklist labels, evidence handling and release roles. Preventive schedules require real approved procedure references entered by an authorized supervisor. No fictional checklist or policy is seeded outside tests.
