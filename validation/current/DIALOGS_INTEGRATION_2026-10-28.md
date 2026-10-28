# Dialog integration evidence

28 October 2026. This pass fixes shared mobile interaction defects found in actual native component checks. The full SmartMaint goal remains active.

## Final automated checks

- `npm test`: **252 tests**, comprising 44 domain/UI and 208 backend tests across 21 backend files. [Log](dialogs-tests-2026-10-28.log).
- `npm run typecheck`: passed. [Log](dialogs-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: passed. [Log](dialogs-lint-2026-10-28.log).

No dependencies, backend functions, schema or deployment settings changed in this pass. Earlier work-editor/backend changes in the shared worktree remain intact.

## Reproduced failures and correction

Android 15/API35, emulator-5554. Every cited screenshot was inspected after capture. JSON/XML sidecars record source fingerprints, actual system font scale and view hierarchy. Bounds checks are saved in [native checks](dialogs-native-checks-2026-10-28.json).

1. At system font scale **2.0**, a long confirmation initially fit, but its light card was translucent. [Before](confirmation-2026-10-28-before-large.png). Triggering the sample failure pushed the title and both actions off-screen with no scroll recovery; neither action appeared in the captured hierarchy. [Reproduced error](confirmation-2026-10-28-before-error.png).
2. The shared opaque scrollable surface retained the heading and review text. After a sample failure, scrolling exposed the complete error and both actions, fully within the safe viewport. [After, review](confirmation-2026-10-28-after-large-top.png), [after, error/actions](confirmation-2026-10-28-after-error-actions.png).
3. At **840 by 1400 pixels**, density 420 (320 logical points wide), and system font scale **2.0**, the review remained scrollable and both actions wrapped into full-width controls. [Short viewport, top](confirmation-2026-10-28-short-top.png), [reachable actions](confirmation-2026-10-28-short-actions.png). The bounds checks reject off-screen or inverted nodes.
4. The priority selector remained usable in that same viewport; selecting High closed the list. [Priority](dialogs-2026-10-28-priority-short.png).
5. An intermediate date-picker check exposed a missing next-month control: the unbounded month label consumed its width. [Intermediate defect](dialogs-2026-10-28-date-short-top.png). The final wrapped heading shows both arrows, and a day list replaces cramped calendar cells. [Final date list](dialogs-2026-10-28-final-date-list.png). Next month was tapped; selecting Wednesday 2 December from the nested list returned **12/2/2026, 12:00 PM** to the fictional form. [Day options](dialogs-2026-10-28-final-day-options.png), [selected value](dialogs-2026-10-28-final-date-selected.png).
6. At normal resolution/text size, two rapid Confirm taps and Android Back during the four-second sample callback kept the dialog busy. [Busy state](confirmation-2026-10-28-busy.png). It finished with exactly one attempt and one confirmed result. [Single result](confirmation-2026-10-28-single-result.png).
7. Dark appearance with the app's larger-text and higher-contrast settings retained an opaque readable dialog and reachable actions. System font scale was **1.0** for this check. [Dark example](confirmation-2026-10-28-dark-large.png).

The intermediate date-grid captures are defect evidence, not accepted final states. Earlier confirmation/error captures precede the final date-only adaptation; final day-list, selection, busy/result and dark captures use the final source. Device resolution was restored to **1080 by 2400** and system font scale to **1.0** after the narrow-screen checks.

The headless emulator produced an Android System UI ANR during startup. Wait was selected, the actual app state was re-observed, and no startup blank/ANR screenshot is counted as product acceptance.

## Limits and next coverage

These checks exercise real shared controls with fictional screen state. They do not perform live report/maintenance/safety mutations. Full TalkBack/VoiceOver traversal and focus return, iOS/device validation, keyboard navigation, all 73 exact-reference states, authenticated end-to-end journeys and approved institutional release/offline policies remain open. See [implementation contract](../../docs/DIALOGS_INTEGRATION.md).
