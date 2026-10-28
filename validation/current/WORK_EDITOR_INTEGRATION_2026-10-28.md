# Work editor integration evidence

28 October 2026. This is a completed implementation/validation iteration within the active full-product objective. Full product acceptance remains unproven.

## Automated checks

- `npm test`: **252 tests** (44 domain/UI, 208 backend across 21 backend files). [Log](work-editor-tests-2026-10-28.log).
- `npm run typecheck`: passed. [Log](work-editor-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: passed. [Log](work-editor-lint-2026-10-28.log). Earlier cached diagnostics referred to already removed text; the uncached check is the final evidence.

New checks cover all six work-field groups, checklist result preservation, detached editable snapshots, workflow-only revision changes, stale saves after an accept/pause/resume cycle, no history writes on rejection, exact saved revision acknowledgment, and stale work after a due-date change. Existing assignment, contributor independence, preventive checklist, authorization and demo restrictions remain covered. Existing mutation callers/tests were updated for the required workflow revision argument.

## Development backend

Only `dev:greedy-bat-971` was targeted. The initial sync reported functions ready but PowerShell reported a native stderr error; [final sync status](work-editor-dev-sync-final-2026-10-28.json) and [final output](work-editor-dev-sync-final-2026-10-28.log) record the clean verification. No production, schema, institution-policy or staff-account change was made.

[Unsigned endpoint probes](work-editor-live-denial-2026-10-28.json) verified that `operations:recordWork` requires the new workflow argument and denies a well-formed unsigned request with sign-in required. No live maintenance write succeeded or was attempted with an authenticated identity. Mocked positive mutation tests and unsigned live rejection are separate evidence.

## Android component interactions

Android 15/API35, emulator-5554, installed development build. Every listed screenshot was visually inspected. JSON and XML sidecars record source fingerprints and view hierarchy.

| Check | Evidence |
| --- | --- |
| Typed `LOCAL-FINDING` remains after a fictional server update; conflict displays reviewed/current revisions | [Retained notes](work-editor-2026-10-28-retained.png) |
| Local/server notes, parts and every checklist result are disclosed | [Comparison](work-editor-2026-10-28-comparison.png) |
| Keep-local choice requires explicit consequential confirmation | [Confirmation](work-editor-2026-10-28-confirmation.png) |
| Confirming keeps the typed local notes, clears the review conflict and saves nothing | [Local kept](work-editor-2026-10-28-local-kept.png) |
| Explicit load replaces local notes with server work | [Server loaded](work-editor-2026-10-28-server-loaded.png) |
| Simulated reassignment retains comparison, removes keep-local and explains recording is unavailable | [Reassigned](work-editor-2026-10-28-reassigned.png) |

The first two captures include Android's floating keyboard toolbar. Its overlay is visible and is not counted as application layout evidence for obscured content. The later captures show the confirmation and resulting states unobscured. A first failed capture attempt returned to the welcome screen; the retained-notes artifact was replaced only after a fresh, successful interaction and inspected again.

These are actual shared-component interactions using fictional data. They do not prove preservation within an authenticated live task session, native maintenance publication, restart recovery, system font scaling, dark-mode review or screen-reader behavior. Captures precede the final nonvisual mutation-return acknowledgment change; final automated checks cover that change.

## Remaining scope

Authenticated concurrent-session maintenance journeys; all 73 exact-reference states and accessibility checks; native iOS and physical camera/distribution validation; protected offline inventory/access policy; and institution-approved safety/release acceptance remain open. In-memory maintenance fields still need separate navigation/restart recovery work. See the [implementation contract](../../docs/WORK_EDITOR_INTEGRATION.md).
