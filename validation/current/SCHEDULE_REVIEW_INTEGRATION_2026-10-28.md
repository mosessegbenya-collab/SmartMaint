# Schedule revision review evidence

28 October 2026. The previous schedule row used an ID/revision React key, remounting the form and discarding prepared date/justification on every reactive revision. Rows now retain their ID-based identity, and the actual shared editor gates actions on an explicit reviewed snapshot.

## Automated checks

- `npm test`: **273 tests**, 44 domain/UI and 229 backend across 25 backend files. [Log](schedule-review-tests-2026-10-28.log).
- `npm run typecheck`: [passed](schedule-review-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](schedule-review-lint-2026-10-28.log).

Three new domain cases prove that an incoming revision blocks operations while preserving prepared inputs; keeping inputs adopts a detached current snapshot; loading the current date clears justification; later revisions require review again; and prepared input cannot be reviewed into another schedule ID. These tests cover the domain guard and review choices; native checks below exercise the shared React editor. Existing backend revision/scope tests remain green; no backend function changed.

## Android checks

Android 15/API35, Pixel_API35, emulator-5554, 1080 by 2400, system font scale 1.0, light appearance. The current bundle contains 2,179 modules. The linked captures were visually inspected and have JSON/XML sidecars with source fingerprints and hierarchy. The isolated preview renders `ScheduleEditorControls` with local fictional callbacks.

| Check | Evidence |
| --- | --- |
| Incoming revision 2 changes activity to Paused and recorded due to 10 November; prepared 27 October date and typed justification remain | [Changed schedule](schedule-review-2026-10-28-changed.png) |
| Scrolling reaches both review choices and all three disabled mutation controls | [Comparison](schedule-review-2026-10-28-comparison.png) |
| Tapping disabled Resume before review opens no confirmation | [Blocked attempt](schedule-review-2026-10-28-blocked.png) |
| Keeping prepared fields removes the review panel, retains date/reason and enables appropriate actions, with zero action callbacks | [Kept fields](schedule-review-2026-10-28-retained.png) |
| After another incoming revision, loading the server date uses 10 November and clears the reason; action callbacks remain zero | [Loaded date](schedule-review-2026-10-28-loaded.png) |

Text and controls remain readable in these captured states. Partial headings at the top of scrolled views are outside the scroll viewport; the review fields and actions were reached by scrolling. These captures do not establish 200% system-text, dark appearance, screen-reader or iOS acceptance.

Metro was restarted after verifying the task-owned listener because CI mode disables refresh. The first app launch reached the development launcher before Metro was ready; reconnecting loaded the current source. The emulator could not resolve the development backend hostname, so these checks remain isolated component evidence. No authenticated maintenance records were queried or mutated by the preview, and no live-backend success is claimed.

## Boundaries

No backend, deployment, schema, dependency, account approval or institutional policy changed. Form retention remains in memory and can end when the row unmounts, the department changes or the session/process terminates. Live authenticated scheduling, protected offline operation, cross-platform/accessibility checks, all 73 exact-reference acceptances and signed distribution remain open. The full goal remains active. [Implementation contract](../../docs/SCHEDULE_REVIEW_INTEGRATION.md).
