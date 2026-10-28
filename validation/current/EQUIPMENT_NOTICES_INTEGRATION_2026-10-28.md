# Equipment notification evidence

28 October 2026. This iteration aligns equipment safety events with the Equipment inbox filter and current equipment destination, and shares the notification card across the live inbox and development preview.

## Regression and checks

The corrected regression fails against the original helper: an equipment hold generates no matching Equipment-filter notices. [Original routing failure](equipment-notices-original-2026-10-28.log). An earlier fixture incorrectly used an unsupported category and then a technician to place a hold; those failures were fixture errors, not routing evidence. The corrected fixture uses valid report values and an authorized supervisor. The original helper was temporarily loaded only for the regression run and restored afterward; the final implementation was verified before the final checks.

Final checks on the completed source passed:

- `npm test`: **275 tests**, 44 domain/UI and 231 backend across 25 backend files. [Log](equipment-notices-tests-2026-10-28.log).
- `npm run typecheck`: [passed](equipment-notices-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](equipment-notices-lint-2026-10-28.log).

New backend cases prove that eligible reporter and technician inboxes receive an equipment-target hold event, both can open the scoped equipment query, another department receives none, combined reporter/technician recipients are not duplicated, repair-only permission still permits the technician path, and suspension/scope removal prevent further delivery. Existing report/task notices, recipient-only inbox/read-state rules and safety workflows remain covered by the full suite. Positive cases use convex-test identities; they do not prove live authenticated acceptance.

## Development backend

The target was checked and announced as **dev:greedy-bat-971**, team moses-segbenya/project smartmaint, with no deployment/key override or convex.json redirect. Development sync completed at 13:18:12 UTC. [Result](equipment-notices-dev-sync-2026-10-28.json), [log](equipment-notices-dev-sync-2026-10-28.log).

No schema migration, historical notice rewrite, production deployment, account approval or institutional policy change occurred. New equipment events use the existing equipment target kind. No real hold, release or notification was created to perform validation.

## Android component inspection

Android 15/API35, emulator-5554, 1080 by 2400, system font scale 1.0. Current bundle: 2,181 modules. The following captures were visually inspected; JSON/XML sidecars retain source fingerprints and hierarchy. The example uses the real shared card with fictional historical content and local callbacks.

| Check | Evidence |
| --- | --- |
| Historical release notice has neutral Unread/Recorded event labels and explains that current equipment status must be checked | [Unread event](equipment-notices-2026-10-28-unread.png) |
| Mark-read confirmation explicitly limits the action to inbox state | [Confirmation](equipment-notices-2026-10-28-confirm.png) |
| Read state and one explicit equipment-status callback are shown without current-clearance styling | [Read and opened](equipment-notices-2026-10-28-open.png) |
| Dark appearance and the app larger-text option retain readable labels, body and both actions | [Dark/larger text](equipment-notices-2026-10-28-dark-large.png) |

The larger-text option is not a 200% system-font test. The card fits the viewport in the dark capture; an additional scroll capture shows the same reachable actions. No screen-reader, iOS or live authenticated notification navigation acceptance is claimed.

An initial development-launcher attempt crashed before the preview loaded with `App react context shouldn't be created before`. [Runtime crash log](equipment-notices-dev-launcher-crash-2026-10-28.log). Force-stopping the development app and opening it once produced the accepted captures. Null-root hierarchy failures were rejected without stale reuse. This runtime issue is recorded separately from the card interactions; it is not claimed fixed by notification changes.

## Remaining work

Historical notices retain their existing report/task destinations. Recipient selection remains targeted rather than institution-wide, and existing source-query filtering is not redesigned here. Live authenticated workflows, external push/email delivery, protected offline operation, institutional approval, full reference/accessibility acceptance and signed distribution remain open. The full product goal remains active. [Implementation contract](../../docs/EQUIPMENT_NOTICES_INTEGRATION.md).
