# Report recovery, conflict review and receipts

Updated 28 October 2026. This continues the existing SmartMaint design-system and management integration work. Institutional offline access and clinical/safety policy approval remain unchanged.

## Recovery lifecycle

Explicit device saves and debounced autosaves now use the same serial writer. An explicit save replaces pending typing and follows any write already in flight, so an older snapshot cannot overwrite its newly recorded server revision. Report controls are disabled during explicit saves.

After a matching publication receipt, the writer closes, cancels pending work and drains accepted writes before removing the device copy. An owner-bound handle remains available to an in-flight completion after form navigation; an account change cannot close another owner's writer. Resumed forms stay mounted through their own publication acknowledgment so cleanup feedback is retained.

Cleanup compares the remaining fields, server linkage and pending photos with the reviewed snapshot. Changed copies are preserved for review. Reviewed manual deletion checks the entire current device copy before removing it, preventing newer edits from being silently discarded. A cleanup failure stays visible on the confirmed receipt with retry and device-review actions; it does not turn a known server receipt into a failed submission.

These changes do not remove the 750 ms autosave window or authorize protected offline equipment/account access. Work not committed before abrupt process termination can still be lost.

## Complete conflict comparison

The shared comparison covers all eight report fields: category, symptoms, description, suggested priority, reported condition, in-use state, time noticed and urgent workflow. It displays differences first and offers all fields, including matching values. Equivalent timestamp formats compare as the same instant; dates are displayed in the device's locale.

New and resumed forms observe current server data. Revision conflicts offer two explicit choices: apply reviewed local details to the current revision, or load the server details into the form. Neither choice publishes a report or removes pending device photos. Confirmation controls remount when their reviewed revisions change, preventing an open confirmation from silently adopting a newer revision behind the dialog.

If a report is already submitted, saving over it is blocked. Reopening a submitted report through device recovery allows the authorized owner to compare its remaining local copy with the actual submitted fields and explicitly discard the reviewed device copy. Owner, operation, equipment, department and any stored server reference must match.

## Revision-bound receipts

The backend's publication retry and read-only receipt lookup now require both the reviewed draft revision and reviewed photo revision to match the published record. An exact lost-response retry remains idempotent. A different revision published by another session returns a conflict rather than acknowledging the older attempt.

The native queue also refuses to reuse a cached receipt for another reviewed snapshot. Older stored `SYNCED` entries without the new binding marker are checked against the server before display: matching entries are upgraded once, mismatches become review conflicts without another submission, and missing verification/authorization fails closed. New accepted receipts carry `receiptBindingVersion: 1` in the existing encrypted queue format; no Convex schema migration is needed.

## Review and validation

Open `/design-system?example=recovery` during development for the actual comparison and cleanup components with fictional examples. Preview actions do not query, publish or delete live records or device drafts. The separate existing `/diagnostics` route uses isolated synthetic storage to check native draft/photo persistence and owner separation.

Implementation: `draft-writer.ts`, `use-device-draft.ts`, `report-field-comparison.ts`, the shared comparison component, `reporting-journey.tsx`, `submitted-report-recovery.tsx`, `report-results.tsx`, `report-queue.ts`, `publication-coordinator.ts` and `convex/reporting.ts`.

Keep unit/mocked integration, native component interactions, native storage persistence and live endpoint authorization evidence separate. Full authenticated report/photo/restart journeys, institutional offline policy, physical camera testing, iOS and all 73 exact-reference acceptances remain open.
