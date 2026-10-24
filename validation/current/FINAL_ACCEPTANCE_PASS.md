# SmartMaint acceptance continuation - 2026-10-24

This pass continues `RESUMED_RECOVERY.md`. Existing uncommitted changes were preserved. No deployment, Clerk setting, staff verification, administrator bootstrap or institutional safety/release policy was enabled.

## Tested state

- HEAD: `89a20d68f3b314a010e220297a6ec8e55f24ba71`, with substantial tracked and untracked workspace changes. A commit alone does not identify this build.
- `workspace-state.json` records SHA-256 hashes of source/configuration/tests/tooling, including untracked files and excluding credentials. Native capture JSON files embed the source fingerprint at capture time. Tooling additions cause different overall fingerprints across the pass; early synthetic screenshots precede the final staff-recovery and header changes.
- Android: configured `Pixel_API35`, emulator `emulator-5556`, Android 15 / API 35, 1080 x 2400, density 420. The existing debug APK was installed, and current source ran through Metro. This is a development x86_64 build, not signed production or physical-camera acceptance.
- Metro 8081 used existing public Clerk configuration. Identity restore timed out. The same public endpoint returned HTTP 200 in an authorized read-only host reachability probe; that does not verify mobile sessions/JWT claims.
- Metro 8083 omitted Clerk/Convex variables only in its isolated process using `EXPO_NO_DOTENV=1`. Environment files were unchanged. Its role/layout evidence is fictional signed-out preview, never live staff acceptance.

## Implementation corrections

1. Upload finalization now checks whether a blob was committed before deleting it after an error. Uncertain or unauthorized reconciliation preserves evidence and the original failure. Local photo-pointer completion is also checked before finishing its index.
2. Queue reads serialize with generation replacement/cleanup. Old-session failures cannot overwrite a newer matching receipt; late receipts remain owned by the original account. Foreground initialization can resume after an initially backgrounded mount.
3. Identical immediate retries after a committed draft edit return the same report/revision. Different contents remain conflicts; revocation is checked before idempotent success.
4. Native and direct/web publication both require the exact expected report ID. An unresolved status query says “Checking Report Status”; it cannot imply receipt. Existing pending-photo/revision guards remain.
5. A selected photo remains in memory when device persistence fails. Pending operations block progression while busy. Keeping current fields preserves recovered server metadata and opens the saved server draft when necessary.
6. Device-save status applies only to the current committed field snapshot. Later edits show pending. Recovery files now have a global 128 MB / 512-file physical budget, including replacement generations and uncertain orphans. Full storage rejects new writes without erasing evidence.
7. The development-only storage probe can open while identity restoration is pending. It contains only isolated synthetic records and no staff data/backend calls. Production still redirects it away; live authorization gates remain.
8. A demonstrated 2x-text welcome-header overflow was fixed by wrapping the date/brand. Button labels can shrink/wrap within their touch target.
9. Integration preflight now respects environment-file priority and explicit process overrides, validates URL shape, and reports names/presence only. It explicitly cannot establish deployment-side issuer verification.
10. Acceptance tooling now rejects failed Android UI dumps instead of reusing stale XML. Each dump has a unique temporary path; regression tests cover this failure. Earlier capture hierarchies are provisional, and screenshots/route/state still require human inspection.

## Fresh local verification

Final command evidence is `final-tests.log`, `final-lint.log`, `final-typecheck.log`, `final-render-checks.log` and `final-exports.log`. **139 tests passed** (37 domain/configuration/tooling checks and 102 backend/client/storage tests). Lint passed with no reported warnings; TypeScript passed. `final-checks.json` summarizes the final evidence and workspace fingerprint.

- TypeScript passed on final app/backend source.
- 52 light/dark mock render cases passed, including unresolved receipt status. Native controls and backend hooks are stubbed; this suite is not a recovery interaction or screenshot acceptance test.
- Android and iOS Hermes bundles plus web/static routes exported to `artifacts/bundles/acceptance-final-2026-10-24/` (ignored build output). A Metro file-map cache deserialization warning caused a full crawl; the export completed successfully. No error was suppressed or test weakened.
- `convex codegen --dry-run --typecheck enable` stopped because `CONVEX_DEPLOYMENT` is missing. The installed CLI help was inspected; no external deployment was attempted.
- Earlier full-pass results (134 and then 137 tests) are retained separately and do not replace final command evidence.

## Native evidence and limits

| Scenario | Evidence / outcome |
| --- | --- |
| Native AES-GCM + SecureStore + private file save | `recovery-native-save-current.*`; final bounded writer also saved successfully in `recovery-final-budget-saved.*` |
| Actual force-stop/relaunch, contents/Unicode/other-owner isolation | `recovery-native-restarted.*`; final writer restart was rechecked in `recovery-final-budget-restarted-confirmed.*` after waiting for UI readiness |
| Explicit synthetic cleanup | `recovery-final-removed.*` and `recovery-final-budget-removed-confirmed.*` show the expected missing-probe failure after removal |
| Earlier airplane-mode restart probe | `recovery-native-offline.*`; local probe only, with Metro still available via ADB reverse; not a production offline launch or authenticated sync journey |
| Final offline repeat | **Passed with the corrected fresh-dump helper**: `final-offline-results.json` records airplane 1, Wi-Fi 0, mobile data 0, successful encrypted recovery after a real restart and explicit cleanup. That helper restored its own starting 0/1/0 state; final cleanup then restored the session's original 0/1/1 connectivity, recorded in `device-restored.json`. Evidence: `final-offline-restarted.*` and `final-offline-cleanup.*`. The first failed automation attempt is retained in `final-offline-first-attempt.json`. This is a synthetic storage probe using ADB-reversed Metro, not an authenticated sync or standalone distribution test |
| Large text | `settings-font-2x.*` actually captured welcome after activity recreation, so settings scaling remains unaccepted. `welcome-final-2x.*` was visually checked and fixes the clipped date seen before; full-screen/all-state scaling is still pending |
| Keyboard | Unconfigured registration exposes no name input; that attempt was not a pass. `equipment-keyboard.*` shows the fictional manual-ID field focused and visible above the Android keyboard; no lookup/report was submitted |
| Camera denial | `camera-denied.*` shows camera access unavailable with a gallery alternative after Android denial. Physical camera, gallery selection and live upload remain pending |
| TalkBack | Installed TalkBack 15 was enabled and a traversal gesture attempted (`talkback-enabled.*`, `talkback-next-focus.*`). Speech and focus progression were not established; service activation is not a reading-order pass |
| Settings restoration | `native-accessibility-results.json` records font scale 1.0 and accessibility disabled/services null restored. Network restoration is recorded by the offline helper |

An Android System UI ANR during cold boot was captured separately. The first final restart automation captured a blank frame before the app was ready (`native-final-error.json`, `recovery-final-budget-restarted-blank-attempt.*`); it is not storage acceptance. The dump helper was corrected after discovering that Android can fail a dump while exiting successfully. No blank/redirect frame is accepted as its requested state.

## 73 reference coverage

`CHECKLIST.md` and `screens.json` retain every reference, route, evidence path and pending accessibility/live gate. All **73/73 routes have native capture attempts**, and **72/73 public/synthetic page variants** were reached. The distinct splash reference (41) was not captured: its mapped `/` route shows welcome. There are **0/73 accepted exact reference states** and **0 live states accepted**. Native variant counts do not establish distinct faithful screens or complete workflows.

The seven approved-reference contact sheets and six native contact sheets (`native-contact-0.jpg` through `native-contact-5.jpg`) were inspected. Broad comparisons found:

- Safety/hold/release pages preserve blocked availability, but current repair/verification history differs from the exact reference scenarios; policy-dependent controls stay disabled.
- Verification results are empty and queues use current synthetic fixture states, unlike the reference pass/unable-to-verify examples. These captures cannot accept those decision states.
- Saved/submitted/emergency receipts can show no matching preview report; fault review is unfilled and photo pages show permission-required states. These are not the populated reference receipts or attachment states.
- Management/export/admin screens have simpler cards, bounded samples, CSV-only export and session-only fictional approval/audit state. Uncapped metrics, PDF/multiple export types and live administrative journeys remain incomplete.
- PIN/password/biometric and institutional verification references differ from the implemented email-code and disabled-policy behavior. Do not invent credentials or approved rules to match images.
- Profile/settings follow the reference families, but navigation, spacing, populated content and session-only preference persistence differ. Native 2x/focus/contrast/keyboard/touch-target acceptance for every state remains open. The developer tools overlay also prevents pixel-identical acceptance.

## Remaining implementation versus external gates

Implementation still outstanding: complete new-draft/photo creation while offline; approved protected cache integration; background retry; full field-by-field conflict resolution and orphan reconciliation; work-order acceptance/parts/verification/closed transitions; persisted notification preferences and missing event fan-out; uncapped analytics/full file export; scoped inventory edit/import/configuration; exact-state visual corrections and full native accessibility.

Pending edits in the 750 ms debounce window can still be lost on abrupt termination before a commit; the UI now says pending. The current online authorization gate intentionally closes protected routes on disconnect. No stale grant or plaintext cache was introduced to simulate offline completion.

External prerequisites: selected existing Convex development deployment/public URL and explicit push authorization; deployment-side Clerk issuer/audience/email verification; approved departments/staff/role policy and separately authorized operator/bootstrap; approved safety/hold/release/evidence rules; approved offline protected-cache/retention behavior. Physical Android camera/TalkBack listening and a supported iPhone or Mac/iOS simulator are still required for remaining native acceptance.

Concrete deployment commands and live journeys are prepared in `docs/LIVE_INTEGRATION_ACCEPTANCE.md`. Native reproduction and iOS handoff are in `docs/NATIVE_ACCEPTANCE_PROCEDURE.md`. Do not run deployment/operator commands until their explicit authorization and real inputs are supplied.

Final cleanup restored airplane mode off, Wi-Fi/mobile data on, font scale 1.0 and accessibility disabled. The isolated synthetic Metro session was stopped and the app was returned to the original public-Clerk Metro session on port 8081. Pixel API 35 remains available for subsequent work. Final strict integration preflight exited 1 for missing configuration; this is an external gate, not a successful live check.
