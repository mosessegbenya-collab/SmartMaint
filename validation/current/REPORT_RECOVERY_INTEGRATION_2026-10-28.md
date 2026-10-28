# Report recovery integration evidence

28 October 2026. This pass continues the design-system and management passes; it does not close the overall product acceptance objective.

## Delivered

- Explicit saves and autosaves share an ordered writer. Confirmed publication closes and drains accepted writes before conditional cleanup. Newer fields, server linkage or pending photos preserve the copy for review. An already absent copy requires no removal.
- Shared comparison covers all eight report fields, shows differences first and can disclose matching fields. Equivalent timestamp instants compare equally. Current server revisions are observed by both new and resumed forms, and stale confirmations close when reviewed revisions change.
- Submitted reports cannot be overwritten through recovery. Authorized owners can compare remaining device data with their submitted report and explicitly discard the reviewed device copy.
- Cleanup failures remain on the confirmed receipt with retry. Publication receipts require the reviewed field and attachment revisions. Older unbound cached receipts require server verification before display; mismatches remain conflicts without a resend.

See [implementation contract](../../docs/REPORT_RECOVERY_INTEGRATION.md) for behavior and limitations.

## Automated checks

Final-source checks: `npm test`, `npm run lint`, `npm run typecheck`. Logs are `report-recovery-{tests,lint,typecheck}-2026-10-28.log` in this directory. Tests total **249**: 44 domain/UI and 205 backend tests across 20 backend files. Added coverage includes ordered writes and cleanup races, all-field comparison, recovery ownership, reviewed deletion, wrong-revision publication acknowledgment, cached receipt binding and legacy receipt verification.

These are unit and mocked backend integration checks. They do not establish authenticated native end-to-end acceptance.

## Development backend

Synced only the configured development deployment `dev:greedy-bat-971` using `convex dev --once --typecheck enable --tail-logs disable`; functions ready at 2026-10-27 23:53:56 UTC. No schema migration, production deployment, staff bootstrap or institutional policy enablement occurred.

An unsigned call to the deployed `reporting:publicationReceipt` endpoint was denied with sign-in required. [Live denial record](report-recovery-live-denial-2026-10-28.json). No authenticated positive publication was performed in this pass.

## Android observations

Installed development build on emulator-5554, Android 15/API 35, 1080 by 2400. Captures include screenshot, UI hierarchy and source fingerprint sidecars. Screenshots were visually inspected.

| Observation | Screenshot |
| --- | --- |
| Five differences among eight fields, readable local/server values | [Differences](report-recovery-2026-10-28-differences.png) |
| Equivalent timestamp formats and other matching fields show zero differences | [Matching](report-recovery-2026-10-28-matching.png) |
| All-field disclosure opens after tapping its control | [Expanded](report-recovery-2026-10-28-expanded.png) |
| Confirmed fictional receipt retains cleanup warning | [Cleanup warning](report-recovery-2026-10-28-cleanup-warning.png) |
| Retry clears fictional cleanup failure and keeps receipt confirmed | [Cleanup retry](report-recovery-2026-10-28-cleanup-retry.png) |
| Dark appearance, app larger-text setting and higher contrast; readable wrapping | [Upper comparison](report-recovery-2026-10-28-dark-large.png), [lower comparison](report-recovery-2026-10-28-dark-large-lower.png) |

These component examples use fictional data and do not read, publish or delete real reports. Android system font scale remained 1.0; the app's own larger-text option was enabled. This is not a system-font-scale or screen-reader acceptance claim. Captures precede the final nonvisual absent-copy cleanup guard; final automated checks include that guard.

The existing isolated `/diagnostics` probe saved an encrypted synthetic draft and PNG, then survived an actual force-stop and relaunch with a distinct process ID. Verification checked persisted draft/photo content, Unicode and owner separation. [Restart record](report-recovery-native-restart-2026-10-28.json), [saved](report-recovery-2026-10-28-storage-saved.png), [verified](report-recovery-2026-10-28-storage-verified.png).

The probe was then removed. A subsequent verification correctly reported it missing. [Removal](report-recovery-2026-10-28-storage-removed.png), [expected negative check](report-recovery-2026-10-28-storage-absent.png). This proves logical removal through the storage interface, not forensic erasure. Native persistence evidence is separate from the mocked writer-race checks and from live server integration.

## Still open

Authenticated report/photo/restart and lost-response journeys against the development backend; institutional offline access policy and protected offline inventory; physical camera and iOS checks; screen-reader/system-text scaling; and all 73 exact-reference acceptance states. Existing conflicting legacy queue attempts remain preserved for review, with no new archive action. No clinical release approval is implied.
