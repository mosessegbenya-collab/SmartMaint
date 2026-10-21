# Staff-access validation

Recorded 2026-10-21. Source implementation is reviewable; production authorization is not declared complete.

## Executed checks

- `npm test`: **71 passed** — 29 domain/preview tests and 42 Vitest backend/client tests. See artifacts/staff-test-run.log.
- `tsc --noEmit`: passed after fixing an explicit result type in the pagination test.
- `expo lint`: passed.
- `expo install --check`: dependencies up to date after SDK-compatible patches to Expo 57.0.31, Router 57.0.29 and Expo UI 57.0.26. Clerk 4.13.0 is preserved.
- `expo-doctor`: 21/21 checks passed.
- `convex codegen --init --typecheck disable`: blocked by missing CONVEX_DEPLOYMENT. No generated deployment files or backend success were fabricated.
- `expo export --platform all --output-dir artifacts/bundles`: **passed** on final source. Android and iOS Hermes bundles, web JavaScript/CSS and 13 static routes exported (89 output files). Static exports do not constitute signed native builds. Non-blocking NO_COLOR/FORCE_COLOR notices were emitted.

Backend tests call actual registered Convex functions using convex-test, including anonymous and unverified denial, metadata escalation, pending/rejected access, manual-policy disablement, uniqueness, competing approvals, optimistic revisions, role/capability/scope/delegation escalation, self-administration, pagination, last administrator, bootstrap controls, suspension/reinstatement/revocation and audit. Client tests cover malformed grants, disconnect/reconnect, authorization cache generation, account changes, OTP finalization/errors/cooldown and capability-filtered navigation. Mock identities and approved policies exist only in tests.

## Native evidence

Android Pixel API 35, Expo Go 57.0.9, 720 × 1600 at density 280:

- [Sign-in](artifacts/runtime/staff-sign-in-native-current.png): actual app rendered and inspected.
- [Empty-email validation](artifacts/runtime/staff-sign-in-validation.png): tapping Send sign-in code with an empty address produces “Enter a valid email address”; UI hierarchy saved alongside capture. No email was sent.
- [Registration after correction](artifacts/runtime/staff-registration-native-final.png): inspected fresh runtime capture confirms separated text/image columns with no overlap. UI hierarchy saved alongside capture. Earlier comparison preserves the defect for provenance.

Expo Go tools overlay is runtime chrome. One stale framebuffer capture is explicitly named staff-sign-in-framebuffer-stale.png and is not visual evidence. Initial stale Metro asset map/ANRs required cache clearing and relaunch. No authenticated live staff/admin states are claimed from these captures. No iOS device, SSO callback, camera or complete accessibility acceptance is claimed.

## External gates and deferred work

The user confirmed no deployment and no approved institutional verification policy. Verification remains disabled; no first administrator was invented or bootstrapped. Live JWT claim mapping, actual email-code completion, persisted sessions, staff approval, subscriptions, role reduction, account switching and revocation require a configured deployment and authorized identities. See [operator handover](docs/STAFF_ACCESS.md).

Institutional safety/release/checklist rules, attachments, notifications, durable offline synchronization and full operational parity remain unavailable. Native design acceptance across all 73 references remains open. The requested production completion criteria are therefore not yet satisfied.
