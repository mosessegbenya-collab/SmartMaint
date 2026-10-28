# Inventory identity evidence

28 October 2026. This iteration separates inventory identity from availability consistently across lookup, equipment, report and verification surfaces, and fixes compact detail-row wrapping found during native inspection.

## Checks

- `npm test`: **278 tests**, 44 domain/UI and 234 backend across 25 backend files. [Log](inventory-identity-tests-2026-10-28.log).
- `npm run typecheck`: [passed](inventory-identity-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](inventory-identity-lint-2026-10-28.log).

The added backend regression uses existing functions to prove that scoped lookup retains `identityVerified: false`, another department receives no match, current release remains unavailable with the identity blocker, reporting an observation does not verify inventory, and task creation rejects the unverified identity. The fixture uses convex-test identities and data; it does not establish live authenticated acceptance.

The initial lint pass found an unescaped apostrophe and an unused import. Both were corrected before final checks. The full suite, lint and typecheck were run again after the shared Detail refinement.

## Android component review

Android 15/API35, Pixel_API35, emulator-5554. Default viewport: 1080 by 2400, density 420, font scale 1.0. Compact review: 840 by 1800 (320 dp wide), system dark appearance, font scale 2.0. The final source bundled 2,184 modules. Each linked final capture was visually inspected and has JSON/XML sidecars with source fingerprints and hierarchy.

| Check | Evidence |
| --- | --- |
| Default layout identifies an unverified match, supplies model/location and separates identity from current availability | [Final unverified match](inventory-identity-2026-10-28-stacked-default-unverified.png) |
| Verified identity uses informational styling, while the urgent action names reporting as the next step | [Final urgent branch](inventory-identity-2026-10-28-stacked-default-urgent.png) |
| At compact dark/200% text, the full identity badge wraps within the card and asset/model details use stacked rows | [Compact badge and details](inventory-identity-2026-10-28-stacked-compact-badge.png) |
| Recorded location is a complete label above its value, followed by the unverified warning | [Stacked location](inventory-identity-2026-10-28-stacked-compact-details.png) |
| Scrolling reaches the complete availability explanation and review action | [Compact action](inventory-identity-2026-10-28-stacked-compact-action.png) |
| A second shared-Detail consumer retains readable date columns at default scale | [Chronology regression](inventory-identity-2026-10-28-detail-regression.png) |

Earlier light captures exercised the local review callback and verified/urgent choices before the Detail refinement. The final captures above establish the completed layout. Initial compact captures showed the wrong route after device configuration recreated the activity and are excluded. A subsequent confirmed identity preview exposed the old column layout's broken words; the `stacked-compact-*` captures above follow that fix. Filenames alone are not acceptance evidence.

The preview uses the real card/badge with fictional records and a local callback counter. It never scans hardware, queries inventory, opens protected records, submits reports or verifies/releases equipment. The live lookup uses the same card; inventory lists, equipment details, report headers and verification headers share the badge. Their authenticated rendered journeys are not established by the preview.

Metro stopped with a TLS connection reset during recheck. The server was restarted in offline CLI mode using the installed SDK; an initial `--offline --lan` combination was rejected, then `--offline --port 8081` served the final bundle. Identity/backend URLs and app authorization were unchanged. Native DNS/provider connectivity remains unverified.

## Boundaries

No backend, schema, deployment, dependency, account approval or institutional policy changed. System size/font/night-mode changes were restored after review. Other consumers of the adaptive Detail component still require their complete visual/accessibility acceptance. Live scan/report/verification journeys, physical camera checks, screen readers, iOS, full protected offline behavior, all 73 exact-reference acceptances and signed distribution remain open. The full product goal stays active. [Implementation contract](../../docs/INVENTORY_IDENTITY_INTEGRATION.md).
