# Corrective workflow test report

Checkpoint: 2026-10-23. Latest resumed full run: **96 tests pass** (31 domain/config and 65 Vitest across five files), artifacts/corrective-tests-resumed.log. Exit codes are recorded in validation/checks-resumed.json. An earlier incorrect history test expectation was corrected to recognize the Clinician fixture's clinical-verifier capability, then check restricted access after removing it. Production authorization was not weakened to satisfy the test.

Latest TypeScript and Expo lint pass: artifacts/corrective-typecheck-resumed.log and corrective-lint-resumed.log. The earlier lint initialization failure was resolved by a successful single-installer lockfile restore (1,020 packages, exit 0; corrective-single-installer-restore.log). Doctor passed 21/21 again (corrective-doctor-restored.log). Earlier compatibility/all-platform exports are separate evidence. The earlier verified-log rerun was interrupted; use the resumed logs and status record for final check results. Native results are recorded separately.

Actual backend-function tests cover authentication, scope/grant escalation, idempotency, concurrent approvals, pagination beyond 100, reporter ownership before pagination, inventory uniqueness, provisional reports, append-only work history, recipient-only inbox/read state, private drafts/conflicts/publication, authenticated photos/type/size/read/delete, missing safety policy, independent ordered checks, linked rework and release invalidation.

Additional corrective tests cover effective triaged-priority/status filtering (including legacy submissions and private drafts), self-excluding completed-repair verifier queues, scoped equipment history without work-note disclosure, raw provisional identifiers, schedule-creation retry deduplication, and preservation/repair of the observed malformed native property.

Notification tests cover triage, completion, verification/rework and targeted hold notices; unread state; exclusion of suspended/out-of-scope recipients; immutable request-versus-decision separation; policy/repair/recipient checks on independent-verifier requests; and retry deduplication. Push/email delivery is not tested or claimed.

Pure queue tests cover restart restoration, account isolation, write failures, corruption, concurrent updates, overflow, Unicode chunking and explicit conflict states. Native SecureStore integration still requires device verification.

Preventive tests verify supervisor scope, duplicate-safe occurrence generation, checklist-required completion and rescheduling revision conflicts. Photo tests verify reviewed attachment revisions, immutable submitted evidence and bounded decoder dimensions. The Windows config test checks idempotent regeneration without replacing surrounding native settings.

The 12 requested live E2E journeys remain **0/12 verified** because no deployment/approved identities/policies are available. Mock integration success is not a live Clerk integration or emulator journey. Hardware, permissions, external escalation and delivery remain unaccepted.


Seven sampled public native controls passed: welcome sign-in navigation, empty sign-in validation, registration navigation, picker opening, requested-role selection, cancel preservation and empty registration validation. Their exact evidence paths are recorded in validation/native-checkpoint.json. These checks are separate from the 96 automated tests and do not establish completed OTP/SSO, staff approval or protected workflow acceptance.
