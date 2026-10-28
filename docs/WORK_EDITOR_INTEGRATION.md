# Work editor revision review

28 October 2026. This continues the SmartMaint design-system integration. It addresses concurrent work-order changes, not offline maintenance editing or clinical approval.

## Behavior

The live task editor previously remounted whenever a work or workflow revision changed. That silently replaced unsaved technician fields with server values. Its identity now depends on the task and destination; incoming revisions update the visible task while preserving local work fields.

The editor retains its reviewed work and workflow revisions. A change to either blocks saving until the user compares diagnosis, diagnostic evidence, cause assessment, notes, parts and every scheduled checklist result. The two explicit choices retain the reviewed local fields or replace them with current server fields. Neither choice writes maintenance work. An unadded part must be added or cleared before saving; loading server work explicitly clears that pending input.

Fresh task state and assignment determine whether work can be recorded. After reassignment, parts pause, completion or cancellation, retained local fields remain available in the conflict comparison, but retaining a review does not grant repair access. Assignment, due-date and cancellation forms also retain prepared input across incoming revisions and require explicit review before acting.

Work saves now require both `expectedRevision` and `expectedWorkflowRevision`. The backend rejects an old workflow snapshot even if a pause/resume cycle returns to the same visible status. Rejected work creates no history entries. A successful mutation returns the recorded work/workflow revisions, so the editor recognizes its own save acknowledgment. Older clients missing the required workflow argument fail validation and must update. There is no schema migration.

All consequential task confirmation components are bound to the reviewed server revisions. The shared confirmation also rechecks `disabled` at execution and disables the confirm control when eligibility changes. Technician text, choices and parts controls are unavailable during an explicit work save. Existing scope, assigned technician, independent-verification and equipment-release rules remain authoritative.

## Review

`/design-system?example=work` contains fictional interactive examples using the actual shared comparison and confirmation components. Type notes, simulate a server update, then retain or replace local work. Simulated reassignment removes the keep-local choice. These controls never call the backend or device recovery store.

Implementation: `src/domain/work-editor.ts`, `src/components/smart/work-field-comparison.tsx`, `src/features/staff/work-revision-review.tsx`, `workspace.tsx`, `extensions-ui.tsx`, the shared `ConfirmAction`, and `convex/operations.ts`.

Evidence: [work editor validation](../validation/current/WORK_EDITOR_INTEGRATION_2026-10-28.md). The subsequent [route-removal guard](WORK_EXIT_INTEGRATION.md) warns before discarding unsaved fields. Local fields are still held in memory; sign-out, process termination and parent access-boundary unmounts can discard them. Encrypted maintenance drafts remain unfinished.
