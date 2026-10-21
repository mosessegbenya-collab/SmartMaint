# Validation record

Current staff-access checks and blockers are recorded in [root VALIDATION.md](../VALIDATION.md), which supersedes the historical auth-only results below. Current automated total: **71 pass** (29 domain plus 42 backend/client). No deployment or approved verification policy exists.

Updated 2026-10-21 after Clerk email-code authentication.

| Check | Actual result |
| --- | --- |
| TypeScript | Pass |
| Expo lint | Pass |
| Automated domain/auth tests | 29 pass, 0 fail |
| Expo export --platform all | Android, iOS, web and static routes pass |
| Expo dependency check | Pass 2026-10-20; auth work added no dependencies |
| Expo Doctor | 21/21 pass 2026-10-20 |
| Clerk CLI Doctor | Not logged in/linked; account checks skipped |
| Real email-code sign-in and restart persistence | Not verified; owned account/code required |
| Latest native auth UI | Retest pending after watcher timeout and emulator ANRs |
| Full reference visual acceptance | Not passed |

Exports are not signed APK/IPA builds, deployment or end-to-end native tests. Clerk CLI's secret-key warning does not require a secret in a mobile client; this integration uses only the publishable key.

Coverage includes account/scope boundaries, provisional reporting, idempotency, assigned-technician restrictions, independent verification, release blockers, queue isolation, export safety and separation of Clerk identity from synthetic workspace access. These tests do not replace live Clerk, component, permission or accessibility testing.

See ../design-qa.md for earlier native reporting evidence and AUTHENTICATION.md for live identity acceptance.
