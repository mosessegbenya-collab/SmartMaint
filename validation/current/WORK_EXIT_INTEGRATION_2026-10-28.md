# Work editor exit evidence

28 October 2026. This iteration adds protection against accidental route removal while maintenance fields are unrecorded.

## Checks

- `npm test`: **267 tests**, 44 domain/UI and 223 backend across 23 backend files. [Log](work-exit-tests-2026-10-28.log).
- `npm run typecheck`: [passed](work-exit-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](work-exit-lint-2026-10-28.log).

The new domain case exercises all six work-field groups, pending parts, acknowledged baselines and local fields retained against a newer server snapshot. Existing backend revision and rejection tests remain green. Native interactions below establish route behavior through the actual hook; mocked save controls do not prove a live authenticated mutation.

An initial lint check rejected assigning a ref during render; the unnecessary ref was removed and lint rerun successfully. The development Metro process was restarted after verifying its live owner, because CI mode disables reloads; the first reload HTTP attempt returned 404. Android then bundled 2,173 modules and rendered the updated preview.

## Android inspection

Android 15/API35, emulator-5554, 1080 by 2400, system font scale 1.0, light appearance. Each linked capture was visually inspected; JSON/XML sidecars contain source fingerprints and hierarchy. Preview data and saves are fictional; the hook and shared modal are the real implementation.

| Interaction | Evidence |
| --- | --- |
| Unsaved edit blocks actual route replacement and offers stay/discard | [Discard dialog](work-exit-2026-10-28-discard.png) |
| Stay cancels navigation and retains the edited note | [Retained findings](work-exit-2026-10-28-retained.png) |
| Header back during a simulated pending save shows explanation and disables leaving | [Saving](work-exit-2026-10-28-saving.png) |
| Acknowledged simulated save permits replacement without a discard prompt | [Catalogue reached](work-exit-2026-10-28-saved.png) |
| Android hardware back prompts for the unsaved edit | [Hardware back](work-exit-2026-10-28-hardware-back.png) |
| Explicit discard resumes hardware-back navigation and removes the editor | [Editor left](work-exit-2026-10-28-left.png) |

The dialog text and controls are readable without overlap in these states. Dark appearance, 200% system text, screen readers, browser-close and iOS gestures were not validated in this pass. Earlier shared-dialog checks are separate evidence.

No backend, deployment, dependency, staff approval or institutional policy changed. Encrypted work drafts, process/sign-out recovery, authenticated native save/failure journeys, full protected offline operation, all 73 reference acceptances and signed distribution remain open. The full product goal remains active. [Implementation contract](../../docs/WORK_EXIT_INTEGRATION.md).
