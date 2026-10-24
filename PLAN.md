# SmartMaint implementation plan

Last updated: 2026-10-23

## Corrective checkpoint — 2026-10-23

- [x] Inventory all 73 actual reference files and create numbered evidence folders and the requested audit/matrix/reports.
- [x] Implement operational pagination/direct lookups, inventory onboarding, QR/manual and provisional report source.
- [x] Implement private resumable server drafts, photo actions, review/publication conflicts, triage and scoped hold controls.
- [x] Implement immutable work snapshots and policy-gated safety attempts/rework/hold resolution/release source.
- [x] Implement preventive schedule/occurrence/checklist source and native encrypted publication queue for saved drafts.
- [x] Bundle Inter; preserve approved assets and Clerk setup.
- [x] 96 local tests pass; TypeScript and lint pass after dependency restoration. Compatibility/Doctor passes are recorded separately.
- [x] Wire all mapped live routes, scoped report filters, verifier queues, equipment timelines and targeted in-app operational/request notices; retain explicit policy gates.
- [x] Android debug x86_64 APK builds, installs and renders public screens after the Windows linker/lifecycle correction; Doctor 21/21.
- [ ] Complete protected native/device regression, camera/permission/hardware tests and iOS/distribution validation.
- [ ] Full offline draft/photo storage, expanded work-order states, full notifications/analytics/admin integration.
- [ ] Real deployment, approved staff/safety/offline policies and live E2E acceptance.
- [ ] Individual visual and accessibility acceptance: currently 0/73 in the corrective run.

The source checkboxes above do not mean module acceptance. See SMARTMAINT_FINAL_ACCEPTANCE_REPORT.md and SMARTMAINT_REMAINING_ISSUES.md for exact gates.

## Staff-access scope expansion

The latest brief supersedes the earlier frontend-only boundary for staff authorization.

- [x] Convex schema, authenticated resolver/applications, scoped administration, audit and protected operational source.
- [x] Internal-only, allowlisted first-administrator bootstrap source; never executed.
- [x] Clerk bridge, locked status states, session/grant cache isolation and capability-filtered native navigation.
- [x] 71 automated tests pass, including direct Convex mock authorization tests.
- [x] Android sign-in/registration captured and inspected; visual discrepancies recorded.
- [ ] Configure a real Convex deployment and validate Clerk claims/live identity flows.
- [ ] Obtain institutional verification/role policy approval; verification remains disabled by user instruction.
- [ ] Authorized operator bootstrap and real-device staff lifecycle acceptance.
- [ ] Complete design acceptance, safety policy integration and deferred operational features.

See docs/STAFF_ACCESS.md and VALIDATION.md. No production completion is claimed.

Status: implementation started on 2026-10-20. The supplied Design folder contains 73 approved references mapped to 67 screen families. Development workflows are being implemented and validated. See DESIGN_IMPLEMENTATION_AUDIT.md for evidence; no final visual or production acceptance is claimed.

## 1. Objective and delivery boundaries

Build a polished mobile application for Cape Coast Teaching Hospital (CCTH), Ghana, supporting QR equipment identification, fault reporting, maintenance tracking, independent technical safety checks, clinical verification, and derived equipment availability.

Implement the actual application in this existing repository. Preserve working functionality, strict TypeScript, Expo, React Native, Expo Router, and the package lock. Do not recreate the project or run the starter reset script.

### Decisions agreed with the user

| Decision | Agreed approach |
| --- | --- |
| Design source | The user will provide the design interface. Wait for it before visual implementation. |
| Initial delivery | Complete UI and typed service adapters with clearly labeled synthetic development fixtures. |
| Authentication | Add Clerk as the authentication provider. Verify staff ID + PIN compatibility before implementing that method. |
| Application backend | Convex remains the intended data, authorization, and real-time backend. No existing functions are available to integrate. |
| Task model | Development proposal: Unassigned, Assigned, In progress, Completed, Cancelled. Hospital approval is still required for production. |
| Missing hospital policies | Explicitly unconfigured; synthetic examples are allowed, affected production operations remain blocked. |
| Offline scope | Demonstrate queue behavior using synthetic in-memory data. Durable encrypted storage and restart recovery are deferred. |
| Production readiness | Do not imply production readiness from successful fixture journeys or UI-only access checks. |

The Clerk addition does not authorize inventing hospital policy or expanding the task into a full production backend. Integrate live Clerk capabilities when configuration is supplied; otherwise expose an honest unconfigured state and a separate development preview.

## 2. Repository baseline

Project root: `C:\Users\Edem Segbenya\Desktop\SmartMaint\SmartMaint`.

Inspected versions and structure:

- Expo: installed 57.0.30; package range `~57.0.30`.
- Expo Router: installed 57.0.28; package range `~57.0.28`.
- React Native: 0.86.3; React: 19.2.3.
- Reanimated: 4.5.1; Worklets: 0.10.1.
- TypeScript: `~6.0.3`, strict mode enabled.
- Node observed: 24.22.0; npm and `package-lock.json` are in use.
- Routes live under `src/app/`; components, hooks, constants, global CSS, and starter assets already exist.
- Native tabs already use `expo-router/unstable-native-tabs`; web has a separate `expo-router/ui` implementation.
- NativeWind, Tailwind, Clerk, Convex schema/functions, and application authentication are absent.
- ESLint dependency and configuration are absent, although an `expo lint` script exists.
- Baseline `tsc --noEmit` passed during planning. This is not runtime or native-device validation.
- The working tree already contains staged starter files and an untracked package lock. Preserve that state; do not reset, unstage, or commit unrelated files.

Before future implementation, read `AGENTS.md`, inspect the current repository again, and recheck versions. Follow the Expo SDK-specific documentation and install required packages through `npx expo install`.

## 3. Architecture and design foundation

### Navigation

- Use genuine native tabs on Android and iOS, retaining the SDK 57 entry point `expo-router/unstable-native-tabs`.
- Use Expo Router stacks for details and workflows, and native modal/sheet presentation where appropriate.
- Keep the web-specific navigation implementation for browser previews; web rendering is not evidence of native-tab behavior.
- Resolve authentication, account approval, primary role, and capabilities before mounting protected tabs.
- Reset protected navigation and loaded account data when accounts change or access is revoked.
- Preserve each tab's navigation state during normal tab changes. Use native back behavior and avoid duplicate headers or nested tab bars.

| Primary role | Tabs |
| --- | --- |
| Clinician | Home, Equipment, Reports, Notifications, Profile |
| Biomedical technician | Home, My Tasks, Equipment, Notifications, Profile |
| Unit Head | Overview, Tasks, Reports, Notifications, Profile |
| Authorized maintenance supervisor | Overview, Tasks, Reports, Notifications, Profile |
| Head of Equipment Department | Overview, Equipment, Reports, Notifications, Profile |
| Director of Technical Services | Overview, Equipment, Reports, Notifications, Profile |
| System Administrator / authorized registration approver | Overview, Accounts, Notifications, Profile |

Use contextual links for verification, audit, analytics, reconciliation, safety holds, and the queue. Registration approvers receive only their granted account-management actions, not all administrator powers.

### Route organization

- Authentication group: welcome, sign-in, registration, pending approval, activation, PIN setup/recovery, and reauthentication.
- Authenticated tab group: role-filtered primary destinations with nested browsing stacks.
- Shared protected workflow stack: scanning, new-report steps, assignment, completion, verification, reconciliation, administrative review, and queue recovery.
- Thin route files render feature screens outside `src/app/`. Shared domain types, service adapters, permissions, and state selectors also live outside the route tree.
- Carry record IDs through routes; resolve protected records through scoped services. Do not put protected form content or attachments in URLs.

### NativeWind and visual system

- Target stable NativeWind 4.2.7 and Tailwind 3.4.17, documented as compatible with Expo 57 at planning time. Recheck compatibility before installation; do not silently migrate to the v5 release candidate.
- Configure Tailwind's NativeWind preset and `src/**/*.{ts,tsx}` content paths.
- Configure the NativeWind Babel preset, Expo's Babel preset, and Metro's `withNativeWind` wrapper with the global CSS input.
- Import global CSS once from the root layout and add NativeWind TypeScript declarations.
- Retain compatible Reanimated, Worklets, safe-area, and system appearance dependencies.
- Centralize semantic colors, spacing, typography, borders, radii, and elevation. Prefer reusable variants to repeated long class strings.
- Starting design constraints: navy/medical blue, white and neutral surfaces, restrained teal, semantic red/amber/green, readable system typography, subtle borders and shadows.
- Follow system appearance with light/dark overrides. Final visual values and component composition follow the user's design.
- Use NativeWind `className` primarily; reserve inline/native styles for dynamic values, native APIs, or interop limitations.
- Use at least 48-point touch targets, scalable text, meaningful screen-reader labels, and text/icon status cues independent of color.
- Validate keyboard avoidance, safe areas, status bars, small screens, scroll behavior, reduced motion, and contrast in the running application.

### Shared components

- Headers, screen containers, native-tab configuration, and section headings.
- Primary, secondary, and destructive buttons; inputs; selectors; validation messages.
- Search bars, filter controls, equipment/task/report cards, priority and availability badges.
- Timelines, checklist rows, attachment pickers, attachment/upload status items.
- Notification items, connection banners, sync/provenance indicators.
- Confirmation dialogs and sheets; loading, empty, offline, error, and unauthorized states.

## 4. Clerk authentication and account lifecycle

### Integration approach

- Use a custom React Native authentication interface matching the supplied design, backed by supported Clerk Expo APIs.
- Current documentation uses `@clerk/expo`, `ClerkProvider`, and its secure token-cache integration. Confirm the compatible SDK version before installation.
- Configure the publishable key, secure token storage, native application settings, deep-link callbacks, and enabled providers. Keep server secrets out of the app bundle.
- Support Google and Apple through configured Clerk flows, including cancellation and provider errors. Never fabricate a successful session.
- Use Clerk's supported Convex authentication integration when a deployment is available; authenticated identity must be checked again by Convex functions.

References: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [Convex and Clerk](https://docs.convex.dev/auth/clerk).

### Application approval is separate from identity

- A Clerk session alone does not authorize hospital records or operational tabs.
- Associate the verified identity with an application account containing staff ID, approval/activation status, exactly one primary role, granted capabilities, and record-access scope.
- Do not grant permissions from user-editable profile fields. Production roles and approval state must come from trusted server data.
- Preserve the intended lifecycle: registration application, staff-ID verification, authorized approval, time-limited activation through a verified contact, and credential setup where supported.
- Keep awaiting approval, suspended/deactivated, unconfigured, and session-expired screens distinct.
- Historical actions reference stable account identifiers so deactivation does not erase attribution.

### Staff ID, PIN, activation, recovery, and biometrics

- Staff ID + PIN remains a requested feature, not a claim of native Clerk support.
- Before enabling it, establish a documented Clerk-compatible authentication approach and required backend support. Do not translate a short PIN into an improvised password or implement a parallel local credential system.
- Until resolved, keep PIN, activation, and recovery UI reviewable through synthetic scenarios and clearly unavailable for unsupported live operations.
- Staff approval and activation-code expiry/delivery require server operations and contact verification; do not simulate them as live success.
- Biometrics are an optional supported session-unlock/reauthentication entry point, not independent proof of staff approval or permission.
- Handle loading, expired/revoked sessions, provider failure, sign-out, and reconnect. Stop protected synchronization when authentication is invalid.
- Keep demonstration identity selection separate from sign-in, development-only, and visibly labeled. Never fall back to it after a production authentication error.

## 5. Domain contracts and permissions

Define strict TypeScript models for account/session, role/capabilities, equipment identity, fault report, maintenance task, technical checklist/attempt, clinical attempt, safety hold, attachment, notification, audit event, analytics result, and queued operation.

Expose feature-oriented service interfaces for authentication/account access, equipment lookup, reports/triage, maintenance, verification, administration/reconciliation, notifications, analytics/export, audit, and synchronization.

Provide:

1. A development adapter with synthetic records, interactive operations, configurable latency/errors, and labeled simulated acknowledgments.
2. An unconfigured adapter that returns explicit unavailable results without fabricated success.
3. Clerk integration and future Convex integration behind those boundaries when the required configuration and functions exist.

Do not invent Convex generated bindings or claim nonexistent functions are integrated. Document intended queries, mutations, upload operations, and subscriptions as integration contracts.

### Permission rules

- Clinicians report faults and perform clinical verification only where authorized.
- Technicians access permitted equipment/tasks and record authorized maintenance/technical activity.
- Only the Unit Head or specifically authorized supervisors assign, reassign, cancel, or change due dates.
- Authorized biomedical personnel triage priorities and reconcile equipment identities.
- Technical verification requires an authorized verifier independent of the repairing technician and clinical verifier.
- Management roles receive only explicitly authorized summaries and records.
- Administrators/registration approvers act only within granted account-management permissions.
- Deny unspecified permissions and unknown scopes. A primary role does not imply unrestricted access.
- Apply route and action guards for usability, and adapter checks for development consistency. Neither replaces future Convex authorization.

### Keep independent concepts separate

- Maintenance-task state.
- Equipment identity verification/provisional linkage.
- Technical safety prerequisites and attempts.
- Safety holds.
- Clinical verification attempts/results.
- Derived equipment availability.
- Transport/synchronization state and server acknowledgment.

Unknown state must not render as available, verified, approved, or server-confirmed.

## 6. Workflow rules

### Equipment discovery and fault reporting

- Scan existing CCTH QR codes for an equipment ID and query for an exact record. Preserve the original scanned value and validate format without silently remapping identity.
- Support camera-denied/unavailable states and manual lookup. Do not create an equipment record for an unmatched ID.
- Offer a provisional report for unmatched equipment. Require authorized linking to a verified record before equipment-dependent maintenance actions.
- Require equipment/scanned ID, one main category, specific symptoms, suggested priority, provisional condition, noticed time, and whether currently in use.
- Categories: Electrical/Power; Mechanical/Physical; Performance/Function; Controls/Display; Accessories/Connections; Alarm/Safety Concern; Other/Unknown.
- Priorities: Urgent, High, Routine. Preserve reporter suggestion separately from the authorized triage decision.
- Priority never automatically sets availability.
- Support optional photos/documents, selection errors, upload state, cancellation, and retry. Device-selected attachments are not represented as server-uploaded without acknowledgment.

### Maintenance

- Development states: Unassigned -> Assigned -> In progress -> Completed, plus Cancelled for permitted nonterminal cancellation.
- Assignment transitions unassigned work to assigned; reassignment preserves work/history. Completion does not mean technical or clinical verification has passed.
- Manually set/adjust due dates through authorized actions. Overdue is derived; reminders never reassign or cancel automatically.
- Record findings, work notes, parts, attachments, actor, and timestamps.
- Completed work stays in history. Failed verification leads to linked follow-up/rework instead of silently reopening or overwriting completed history.
- Exact production transitions remain subject to approval of the proposed model.

### Technical and clinical verification

- Technical checklists are equipment-specific and explicitly unconfigured without authoritative policy; use labeled examples only in development.
- Prevent self-verification and preserve independent verifier identities.
- Clinical checks: equipment identity; physical condition; accessories/connections; startup/indicators; controls/safety features; intended function.
- Capture each check's result and required comments. Failed/unable checks require reasons; incomplete required checks cannot produce a pass.
- Clinical outcomes: Pass, Fail, Unable to Verify. Submission requires an online connection and valid authorization.
- Preserve every attempt, verifier, time, checklist results, and reasons. A new repair invalidates reliance on earlier verification for the new release cycle.
- Failed/incomplete verification keeps equipment unavailable and links to the appropriate follow-up workflow. Repeated submissions must not create duplicate follow-up tasks once server idempotency exists.

### Availability and holds

- Derive availability from all applicable release requirements: completed maintenance, technical prerequisites satisfied, no blocking holds, required authorized clinical pass, and other configured release conditions.
- Consider all relevant active work/holds; completing one task cannot release equipment while another blocker remains.
- Show a release checklist and specific blockers, not an independent manual availability toggle.
- Missing release policy or unverified equipment identity blocks a positive availability declaration.
- Preserve hold creation/review/clearance history and authorized actors. Do not invent automatic hold policy from fault priority.

### Administration, audit, and reporting

- Registration requires staff-ID review and authorized approval. Role/account changes preserve history.
- Deactivation flags active tasks for supervisor review without automatic unassignment.
- Reconciliation preserves the scanned ID and links an existing verified equipment record with an audit trail.
- Audit access itself must generate a server-side audit event in production; development demonstrates that contract explicitly.
- Analytics exclude pending/provisional records from confirmed hospital metrics and distinguish unavailable metrics from zero.
- CSV exports honor record scope and filters, include confirmed/pending/unverified status where applicable, and label synthetic exports as demonstration data. Escape CSV fields and neutralize spreadsheet formula injection.

## 7. Offline and synchronization scope

### This delivery

- Use synthetic in-memory reports, notes, attachment metadata, and queue entries only; disclose that restart loses demonstration changes.
- Demonstrate Saved locally, Pending synchronization, Uploading, Server-confirmed, Failed/Not accepted, and Unverified/Provisional distinctly. Simulated persistence/acknowledgments must be explicitly labeled.
- Include operation IDs, automatic retry with capped backoff, manual retry, recoverable rejection, and duplicate-submission simulation.
- Retry transient failures; pause authentication failures; surface validation/permission rejection for correction or review.
- Isolate queues by synthetic account. On sign-out warn about pending work, hide protected content, and require reauthentication before reopening/syncing; do not prompt on every local edit.
- Demonstrate both versions of a conflict. Never automatically merge identity, status, availability, custody/location, holds, or verification conflicts.
- Do not store protected clinical data in AsyncStorage, localStorage, plain files, or an unencrypted database.

### Deferred production work

- Durable account-isolated encrypted storage, protected keys, encrypted attachments, process-death recovery, and storage migration.
- Backend idempotency, server conflict detection, durable retries, and real upload/sync acknowledgment.
- Device security capability checks; if required encryption/key protection is unavailable, disable protected local persistence and show the approved physical fallback.
- Hospital-approved fallback wording is currently unavailable. Show that it is unconfigured instead of inventing instructions.

Secure Clerk session-token storage is separate from durable offline clinical-data storage; adding the former does not complete the latter.

## 8. Complete screen coverage checklist

Each item may be a route, reusable screen state, form step, sheet, or dialog. Record its eventual route/component, integration mode, and validation evidence as implementation progresses. An item is not done merely because it is named in navigation.

### A. Authentication and access

- [ ] 01. Welcome/splash.
- [ ] 02. Sign-in: Google, Apple, staff ID + PIN entry and honest availability states.
- [ ] 03. Registration/application.
- [ ] 04. Pending approval.
- [ ] 05. Activation-code verification.
- [ ] 06. PIN creation/confirmation.
- [ ] 07. PIN recovery instructions/reset pending.
- [ ] 08. Supported biometric authentication entry.
- [ ] 09. Session expired/reauthentication.

### B. Dashboards

- [ ] 10. Clinician dashboard.
- [ ] 11. Technician dashboard.
- [ ] 12. Unit Head/supervisor dashboard.
- [ ] 13. Authorized management overview.
- [ ] 14. Administrator dashboard.

### C. Equipment

- [ ] 15. QR scanner and camera permission states.
- [ ] 16. Manual equipment search.
- [ ] 17. Equipment details.
- [ ] 18. Availability and history.
- [ ] 19. Unmatched/unverified equipment ID.
- [ ] 20. Provisional report and safety-hold details.

### D. Fault reports

- [ ] 21. New report entry.
- [ ] 22. Equipment identification/confirmation.
- [ ] 23. Fault details form.
- [ ] 24. Attachment selection/upload status.
- [ ] 25. Submission confirmation or queued/rejected outcome.
- [ ] 26. Report details/history.
- [ ] 27. Triage/priority review.
- [ ] 28. Report list/search/filters.

### E. Maintenance

- [ ] 29. Task list.
- [ ] 30. Task details.
- [ ] 31. Assignment/reassignment.
- [ ] 32. Due-date selection/adjustment.
- [ ] 33. Cancellation confirmation.
- [ ] 34. Work progress.
- [ ] 35. Findings/notes.
- [ ] 36. Repair completion.
- [ ] 37. Parts/attachments.
- [ ] 38. Linked follow-up/rework.
- [ ] 39. Maintenance history/timeline.

### F. Technical verification

- [ ] 40. Technical verification task list.
- [ ] 41. Equipment-specific technical checklist.
- [ ] 42. Technical verification results.
- [ ] 43. Technical verification history.

### G. Clinical verification

- [ ] 44. Pending clinical verification list.
- [ ] 45. Verification details.
- [ ] 46. Six-check clinical checklist.
- [ ] 47. Outcome/reason.
- [ ] 48. Verification history.

### H. Availability and safety holds

- [ ] 49. Derived availability status.
- [ ] 50. Active safety holds.
- [ ] 51. Hold details/review.
- [ ] 52. Equipment status timeline.

### I. Notifications and offline operation

- [ ] 53. Notification centre.
- [ ] 54. Notification preferences.
- [ ] 55. Connection/offline indicator.
- [ ] 56. Pending synchronization queue demonstration.
- [ ] 57. Failed upload/retry.
- [ ] 58. Conflict review/resolution interface.
- [ ] 59. Session expiry/queued-operation recovery demonstration.

### J. Administration and reporting

- [ ] 60. Registration approval.
- [ ] 61. Account details/role assignment.
- [ ] 62. Suspension/deactivation.
- [ ] 63. Equipment linking/reconciliation.
- [ ] 64. Audit history.
- [ ] 65. Analytics/data-quality dashboard.
- [ ] 66. Filtered CSV export.
- [ ] 67. Profile/preferences/help/sign-out.

## 9. Step-by-step implementation sequence

### Phase 0: Receive design and confirm integration prerequisites

- [x] Inspect repository, versions, existing tabs, styling, and backend availability.
- [x] Record UI/adapters scope, provisional task model, missing-policy behavior, and in-memory offline scope.
- [x] Add Clerk to the planned architecture.
- [x] Receive the user's design and map it to roles, screen families, component states, and mobile constraints.
- [ ] Resolve any design contradictions with the workflow/permission rules before implementing affected screens.
- [ ] Inventory Clerk configuration, provider settings, app identifiers, Convex deployment, and hospital policy inputs without requesting secrets in chat.
- [ ] Confirm supported staff-ID/PIN integration or retain its explicit blocked status.

Exit: design is available and integration blockers are documented; no invented live capabilities.

### Phase 1: Foundation

- [ ] Recheck repository and SDK/package compatibility; preserve unrelated work.
- [ ] Configure NativeWind, theme tokens, appearance, shared primitives, and ESLint.
- [ ] Establish domain/service interfaces, fixtures, capabilities, and unconfigured adapters.
- [ ] Implement root providers, authentication boundaries, role-aware native tabs, and shared stacks.
- [ ] Render and visually verify a representative screen, form, and modal using NativeWind.

Exit: navigation and styling run correctly, strict typing/lint pass, and fixture mode is unmistakable.

### Phase 2: Authentication and dashboards

- [ ] Integrate Clerk provider/session handling and secure token cache where configured.
- [ ] Build screens 01-14 and role/approval/session guards.
- [ ] Implement provider cancellation/error handling and development-only scenario entry.
- [ ] Validate that signed-in but unapproved users cannot enter operational screens.

Exit: each access state and role dashboard is reachable through appropriate real or labeled development paths.

### Phase 3: Equipment and fault reporting

- [ ] Implement screens 15-28 and shared scan/search/report components.
- [ ] Add SDK-compatible camera and attachment-selection packages as needed.
- [ ] Validate exact ID lookup, unmatched reports, required fields, triage permissions, and attachment errors.
- [ ] Implement report search/filter/detail navigation and synthetic submission/rejection scenarios.

Exit: matched and unmatched reporting journeys work without creating unverified equipment records.

### Phase 4: Maintenance, verification, availability

- [ ] Implement screens 29-52 and task actions with role/capability guards.
- [ ] Implement separate technical and clinical attempts and release-blocker presentation.
- [ ] Add linked rework, attempt history, safety holds, and derived availability selectors.
- [ ] Test verifier independence, online-only clinical submission, and every release prerequisite.

Exit: successful and failed repair/verification journeys preserve history and never release equipment prematurely.

### Phase 5: Supporting workflows

- [ ] Implement screens 53-67, notifications/preferences, and synthetic queue scenarios.
- [ ] Implement admin review, reconciliation, scoped audit/analytics, and labeled CSV export.
- [ ] Exercise sign-out/expiry/account switching with pending demonstration work.
- [ ] Make unavailable production operations explain their missing prerequisite.

Exit: every screen inventory item is implemented or explicitly blocked with a reason.

### Phase 6: Integration review and validation

- [ ] Integrate only available, authorized Clerk/Convex operations; keep unavailable ones isolated.
- [ ] Execute automated checks, bundle exports, runtime inspection, and device checks where available.
- [ ] Review all six end-to-end journeys and all role navigation configurations.
- [ ] Record actual validation evidence and remaining integration/device-test gaps.
- [ ] Update this plan and README with completion status, setup instructions, and next steps.

Exit: UI delivery criteria are met without representing deferred backend/security work as complete.

## 10. Acceptance tests and journeys

### Required journeys

1. Home -> scan/search -> confirm equipment -> fault form -> submit/queue -> report details.
2. My Tasks -> task -> record work -> complete repair -> independent technical check -> clinical check -> derived availability.
3. Failed/unable verification -> linked follow-up -> further maintenance -> repeat required verification.
4. Unmatched scan -> provisional report -> authorized linking -> verified equipment-dependent workflow.
5. Synthetic offline report -> demonstration queue -> reconnect -> retry -> simulated acknowledgment or recoverable rejection.
6. Application -> staff-ID review -> approval -> activation -> credential setup; unavailable live steps remain explicitly blocked.

### Automated checks

- Permission matrix, direct-link guards, unknown scopes, and account isolation.
- Required report fields, exact equipment lookup, and no automatic record creation.
- Task transitions, protected assignment/due dates/cancellation, and history preservation.
- Independent technical verifier, clinical authorization/connectivity, and immutable attempts.
- Availability matrix covering missing policy, outstanding maintenance, failed technical checks, blocking holds, and missing/failed clinical verification.
- Retry classification/backoff, duplicate-operation simulation, expiry pauses, and conflicts preserving both versions.
- Analytics exclusion of pending/provisional data and scoped/status-labeled CSV output.
- Clerk session loading/error/revocation and signed-in-but-unapproved access, using supported test/mocking facilities.

### Runtime and accessibility

- Verify NativeWind visibly changes layout, color, spacing, typography, and theme in the running app.
- Check all role tab sets, nested stacks, focused forms, back behavior, safe areas, keyboard avoidance, and state preservation.
- Exercise camera denied/unavailable, attachment cancellation/error, loading/empty/error/offline states, and retries.
- Check larger font settings, screen-reader labels, touch targets, contrast, and non-color status cues.
- Test Android and iOS on available devices/builds. Record missing device access as untested; Windows cannot locally provide an iOS simulator.
- Do not equate browser preview or successful bundling with native runtime validation.

### Commands for implementation validation

Run from the project root after dependencies/configuration are ready:

```powershell
npx tsc --noEmit
npx expo lint
npx expo install --check
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
npx expo export --platform web
npx expo start
```

Add a project test command with an Expo-compatible test setup for the behavioral checks above. Do not repeatedly rerun broad checks without a new change or unresolved failure. Do not install dependencies or rewrite configuration merely to validate this documentation-only change.

## 11. Blockers, deferred work, and definition of done

### Current prerequisites and blockers

- User-provided design: received in `Design/`; 73 images mapped before implementation.
- Clerk application configuration, supported provider setup, and app identifiers: not yet verified/provided.
- Staff ID + PIN, activation delivery, recovery policy, and biometric integration details: require compatibility/policy resolution.
- Convex deployment/schema/functions, server authorization, audit enforcement, upload/sync, and idempotency: absent.
- Approved production task transitions, access scopes, technical checklists, release policy, and physical fallback: absent.
- Durable encrypted offline clinical-data persistence: explicitly deferred by user decision.
- Push delivery/background execution and physical-device coverage: require later capability/configuration verification; do not claim support from notification UI alone.

### UI delivery is complete when

- All 67 experiences are implemented or documented with explicit blockers.
- Actual native tabs drive role-specific navigation; stacks handle deeper workflows.
- NativeWind demonstrably styles the app and follows the supplied design consistently.
- Every visible action works or explains its unavailable prerequisite; no silent no-op controls.
- Fixture, pending, rejected, provisional, and real server-confirmed states remain distinguishable.
- Technical verification, clinical verification, maintenance state, holds, and availability remain separate.
- Required behavioral checks and available runtime checks pass, or limitations are explicitly recorded.
- Existing working project behavior and unrelated changes are preserved.
- Mocked features and deferred production requirements are clearly documented.

### Final implementation handoff must include

- Implemented screens/routes and role-specific native-tab structure.
- NativeWind/configuration changes and reusable components.
- Clerk capabilities actually integrated and remaining provider/authentication blockers.
- Convex functions actually integrated; explicitly state none if none exist.
- Development fixtures, blocked production capabilities, and offline limitations.
- Validation commands, results, device/runtime evidence, and untested requirements.
- Outstanding issues and the next recommended development step.

No production deployment, app-store submission, or migration is included in this UI delivery.

### Plan-file validation (2026-10-16)

- Confirmed all 67 screen checklist numbers are present exactly once.
- TypeScript check passed after creating this document.
- Lint could not run with the existing dependencies/configuration. Expo attempted automatic ESLint installation; that process was stopped and its package manifest edits were reverted. ESLint setup remains a Phase 1 task.
- No application implementation or dependency changes are part of this documentation delivery.

## 12. Technical references

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo documentation index](https://docs.expo.dev/llms.txt)
- [Expo Router native tabs: use the SDK 55-57 examples](https://docs.expo.dev/router/advanced/native-tabs/)
- [NativeWind stable installation](https://www.nativewind.dev/docs/getting-started/installation)
- [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart)
- [Convex and Clerk](https://docs.convex.dev/auth/clerk)

Recheck these sources against installed versions when implementation resumes. Current documentation may show newer APIs than this project's SDK.
