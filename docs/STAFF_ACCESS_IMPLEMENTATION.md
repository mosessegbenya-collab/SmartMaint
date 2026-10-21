# Staff access implementation checklist

## Current result — 2026-10-21

Source phases below are implemented, including schema/indexes, trusted submission/resolution, disabled-by-default manual verification, scoped administration/audit, internal bootstrap, Clerk/cache isolation, native staff UI and protected operations. All 71 automated tests pass, as do TypeScript and lint. Android sign-in/registration have actual captures; full visual acceptance remains open. Historical audit checkboxes below are retained as the initial assessment.

The user confirmed **no Convex deployment** and **unapproved verification policy: keep verification disabled**. Those integration gates remain open. No operator configuration, bootstrap or real staff approval was executed. See [handover](STAFF_ACCESS.md) and [validation](../VALIDATION.md).

Started 2026-10-21 under the new staff-access brief, which expands the earlier frontend-only delivery scope.

## Phase 0: audit

- [x] Read AGENTS.md, PLAN.md, validation records and the new brief.
- [x] Inspect current Clerk 4.13.0 email-code forms, secure token cache, session bridge and locked status screen.
- [x] Inspect role/capability definitions, native tabs, protected routes and synthetic adapters.
- [x] Confirm Convex 1.47.0 is installed, but no schema, functions, auth configuration or generated bindings exist.
- [x] Locate all 73 design references and existing native evidence.
- [x] Identify runtime limitations: Android ANRs and Metro watcher failures; latest auth UI has no accepted native capture.
- [ ] Confirm existing deployment public URL, Clerk issuer and deployment access with the user. No environment files or secrets will be printed.
- [ ] Obtain approved institutional verification/bootstrap policy. No administrator identity will be invented or bootstrap executed.

## Independent implementation

- [ ] Typed schema, indexes and transactional uniqueness/transition checks.
- [ ] Authenticated staff application submission and fail-closed resolver.
- [ ] Manual verification policy boundary, review/approval/rejection and immutable audit events.
- [ ] Role/scope changes, suspension/revocation/reinstatement and last-administrator protection.
- [ ] Internal-only, allowlisted, one-time operator bootstrap.
- [ ] Clerk/Convex client bridge, account isolation, disconnect/timeout handling and native role navigation.
- [ ] Live account/status/review screens, with synthetic preview isolated.
- [ ] Protected operational boundaries; no production safety rules will be invented.
- [ ] Direct backend-function security tests, plus existing tests and project checks.
- [ ] Device screenshots/comparisons where runtime permits; record blockers otherwise.
- [ ] Final validation record and deployment/operator instructions.

Source implementation, mock-backend tests, deployment validation and native visual acceptance are separate gates.
