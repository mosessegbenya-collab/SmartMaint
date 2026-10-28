# Event chronology evidence

28 October 2026. This iteration corrects misleading report and repair timestamps within the active full-product objective.

## Reproduce and verify

Two regression tests failed against the original implementation: draft publication lacked a submission timestamp, and the equipment timeline placed repair completion at a later administrative update. [Before-change failures](event-chronology-before-2026-10-28.log).

Final checks passed on the implementation captured below:

- `npm test`: **266 tests**, comprising 44 domain/UI and 222 backend tests across 23 backend files. [Log](event-chronology-tests-2026-10-28.log).
- `npm run typecheck`: [passed](event-chronology-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](event-chronology-lint-2026-10-28.log).

New cases cover preserved draft creation, immutable submission retries, direct submission and draft rejection, legacy unknown timestamps, exact authored completion revision, invalid/baseline evidence, separate completion and closure, and unchanged duration after a later imported baseline. Positive backend tests use convex-test and mocked identities; they do not establish live authenticated acceptance.

## Development backend

`convex dev --once --typecheck enable --tail-logs disable` completed at 09:08:09 UTC against **dev:greedy-bat-971**, adding the optional submission field and exact task/revision work-entry index. [Result](event-chronology-dev-sync-2026-10-28.json), [log](event-chronology-dev-sync-2026-10-28.log). No historical timestamp backfill was performed.

A live unsigned `workflows:equipmentStatus` call was denied as expected. [Denial result](event-chronology-live-denial-2026-10-28.json). No real report, work completion, verification or release was created for this check. Production, account approval and institutional policies were unchanged.

## Android component inspection

Android 15/API35, emulator-5554, 1080 by 2400, system font scale 1.0. Both screenshots were captured from the current implementation and visually inspected. JSON/XML sidecars retain the UI hierarchy and source fingerprints. The preview uses fictional data through the real shared timing and timeline components.

| Check | Evidence |
| --- | --- |
| Record creation on 27 October is separate from submission on 28 October; completion at 10:00 is separate from neutral administrative closure at 14:00 | [Recorded times](event-chronology-2026-10-28-recorded.png) |
| Older report says Time not recorded; closed work explicitly identifies its timestamp as a record update, without inventing a completion event | [Older records](event-chronology-2026-10-28-legacy.png) |

Text and cards are readable without overlap in these captured light-appearance states. This pass does not establish chronology-specific dark mode, large-text, screen-reader or iOS acceptance, or authenticated native record creation.

## Remaining acceptance

The timeline remains a bounded overview rather than complete event pagination. Creation-based report list/export selection is retained and labeled explicitly. Full protected offline access, approved institutional policies, authenticated live journeys, physical camera/iOS checks, all 73 exact-reference acceptances and signed distribution remain open. The full goal is not complete. [Implementation contract](../../docs/EVENT_CHRONOLOGY_INTEGRATION.md).
