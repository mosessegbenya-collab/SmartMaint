# Current implementation and acceptance plan

Updated 2026-10-24. `screens.json` and `CHECKLIST.md` enumerate all 73 reference states. Prior results are historical; this pass records fresh evidence separately. Preserve the earlier recovery fixes and starting workspace edits.

## Priority implementation checks

| Priority | Risk | Concrete check | Status |
| --- | --- | --- | --- |
| P0 | Photo loss after uncertain server commit | Lose the upload-finalization result after commit; retain referenced blob and original error | Fixed; regression tests pass; live acceptance pending |
| P0 | Queue read races with generation cleanup | Pause reading a manifest while another queue write commits; reader must see a complete generation | Fixed; regression tests pass; live acceptance pending |
| P0 | Duplicate/lost drafts after uncertain save | Retry same operation and field snapshot after a lost update response; exactly one report and revision | Fixed; regression tests pass; live acceptance pending |
| P0 | Wrong-account receipt or replay | Account switch, sign-out, expiry, suspension and scope change stop new sends; late completion stays with original owner | Local account-switch/late-receipt tests pass; live gate pending |
| P0 | Submission discards pending evidence | Pending local uploads/removals block publish; only a matching report receipt acknowledges submission | Guards reviewed; receipt/render regressions pass; live interactions pending |
| P1 | Lost fields on navigation/restart | Device autosave, explicit save, background transition, conflict recovery and failed storage remain visible | Native synthetic recovery/restart and local tests pass; live gate pending |
| P1 | Infinite retries | Persisted attempt cap/backoff, foreground-only worker, fresh authorization after reconnect | Local/native probe and live gate |
| P1 | False success display | Pending/unknown report status never says received; submitted content stays immutable | Review current code and tests |

## Native acceptance

- [x] Discover SDK, AVDs, APK, emulator boot and app installation; start compatible configured AVD.
- [x] Run current Metro bundle on Android; record SDK/device/API and APK hash.
- [x] Native encrypted draft/photo save, force-stop/restart, verify contents/Unicode/account isolation, remove and verify removal.
- [x] Repeat storage verification with device network disabled; restore prior connectivity.
- [x] Capture public reference states and available synthetic states; inspect each against its reference. Synthetic data never counts as live workflow acceptance.
- [ ] Each of 73 states: screenshot comparison, 1x/2x text, labels/order, focus, minimum touch size, contrast, keyboard/scrolling, safe areas, TalkBack and reduced motion. Per-check results must identify unrun checks explicitly.
- [ ] Hardware camera denial/retry and image selection; emulator checks do not replace physical camera acceptance.
- [ ] iOS: pending supported physical device or Mac/simulator. Windows exports are compilation only.

## External prerequisites (not implementation defects)

- [ ] Authorized existing Convex deployment selection, public URL and deployment permission. Do not create/deploy resources in this pass.
- [ ] Existing Clerk issuer/JWT template audience `convex` and verified email claims confirmed by an authorized owner. No credential values in logs.
- [ ] Approved departments, authorized test staff, role/verification policy and separately authorized operator bootstrap; approval remains disabled.
- [ ] Approved technical/clinical verification, independence/evidence, hold-clearance and release policy; controls remain disabled.
- [ ] Approved protected offline cache/retention contract before offline route access or background replay can be implemented.

## Live journeys after authorization

For each approved test role: authenticate, resolve fresh staff authority, scoped inventory lookup, save/edit/restart draft, upload/remove/retry photo, publish with lost response, compare concurrent revisions, offline/reconnect, switch account, sign out/expire/revoke, assign/complete work, verify/hold/release under approved policy, inspect audit and recipient notices. Assert exactly one report/photo/notice/audit record where idempotency is required, and denial from a second account or department. Store redacted identifiers and artifact paths, never tokens.

## Fresh local checks

- [x] Meaningful regression tests for demonstrated gaps; full domain/backend suite once fixes are complete.
- [x] Lint and typecheck on final implementation.
- [x] Mock renders, separately labeled.
- [x] Android/iOS/web exports after changes to shared native services and screens; no signed distribution claim.
- [x] Evidence manifest: HEAD plus SHA-256 of tested source/config files, timestamp, commands, platform, scenarios and artifacts.

Other independent product gaps remain tracked in `SMARTMAINT_REMAINING_ISSUES.md`: work-order lifecycle variants, notification persistence/coverage, unbounded analytics/file exports and scoped administration tools. They must not be marked accepted from route coverage alone.

Final result: 139 tests, lint/typecheck, 52 mock renders and all-platform exports passed. All 73 routes have native attempts and 72 public/synthetic variants were reached; 0 exact-state/full-accessibility acceptances. The final native offline probe passed with fresh UI dumps, explicit cleanup and connectivity restored. See FINAL_ACCEPTANCE_PASS.md and final-checks.json.
