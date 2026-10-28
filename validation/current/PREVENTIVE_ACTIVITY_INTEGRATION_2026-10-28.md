# Preventive activity evidence

28 October 2026. This iteration separates activity changes from due-date changes and fixes paused schedule styling.

## Regression and backend checks

The original pause path called `preventive.reschedule` with the recorded overdue date and failed its future-date validation. [Before-change failure](preventive-activity-before-2026-10-28.log). The completed regression uses the new activity-only endpoint; the legacy reschedule contract remains unchanged.

Final implementation checks passed:

- `npm test`: **270 tests**, 44 domain/UI and 226 backend across 24 backend files. [Log](preventive-activity-tests-2026-10-28.log).
- `npm run typecheck`: [passed](preventive-activity-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](preventive-activity-lint-2026-10-28.log).

New cases prove overdue pause/resume preserves the next due date, existing work orders stay identical, paused schedules reject new occurrence creation, resumed occurrence generation uses the original obligation, and audit entries record Active/Paused transitions. Negative cases reject unsigned callers, missing assignment capability, wrong department, stale revision and blank justification without changing the schedule or adding an activity audit. A domain case verifies paused styling takes precedence over overdue styling and resuming reveals the retained overdue status.

Positive backend cases use convex-test and mocked identities. They do not establish live authenticated acceptance or institutional approval.

## Development sync

The target was checked and announced as **dev:greedy-bat-971**, team moses-segbenya/project smartmaint. No process deployment/key override or convex.json changed the target. The once-only development sync with typechecking completed at 09:40:39 UTC. [Result](preventive-activity-dev-sync-2026-10-28.json), [log](preventive-activity-dev-sync-2026-10-28.log).

No schema, stored schedule, real work order, staff approval or institutional policy was changed. Production was not deployed. The source adds a callable endpoint; tests and native previews did not invoke it against real schedule data.

## Android component checks

Android 15/API35, Pixel_API35, emulator-5554, 1080 by 2400, system font scale 1.0, light appearance. The current bundle contains 2,176 modules. All three linked captures were visually inspected and have JSON/XML sidecars carrying source fingerprints and the fresh hierarchy.

| Check | Evidence |
| --- | --- |
| Confirmation explains date preservation, unapplied prepared edits and existing work orders | [Confirmation](preventive-activity-2026-10-28-confirm.png) |
| Paused uses neutral styling, explains the retained obligation and shows 27 October at 08:00 as the recorded due date | [Paused](preventive-activity-2026-10-28-paused.png) |
| Resume restores Overdue at revision 3 while the recorded due date remains 27 October at 08:00 | [Resumed](preventive-activity-2026-10-28-resumed.png) |

Text and controls are readable without overlap in these states. The preview uses the actual shared status and confirmation components with local fictional activity changes. It never reads or changes backend records. The full live row remounts on revisions; this preview does not prove preservation of prepared date/reason inputs in that row.

The first capture sequence was interrupted before any accepted capture. On resuming, the emulator and Metro were confirmed absent and restarted without wiping data. The emulator showed a [System UI ANR](preventive-activity-2026-10-28-system-ui-anr.png); Wait allowed recovery. Null-root hierarchy requests failed explicitly without reusing stale dumps. A raw [device observation](preventive-activity-2026-10-28-device-observation.png) showed the loaded preview; the developer menu was then dismissed before the accepted captures above. These observations are excluded from app acceptance.

## Remaining work

Retaining schedule-form inputs across external revisions, live authenticated scheduling, dark appearance/large text/screen-reader/iOS checks, full protected offline operation, institutional approval, all 73 reference acceptances and signed distribution remain open. This iteration is progress within the active full-product goal. [Implementation contract](../../docs/PREVENTIVE_ACTIVITY_INTEGRATION.md).
