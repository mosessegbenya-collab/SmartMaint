# SmartMaint completion review — 2026-10-22

## Scope and limits

This is a source/feature-gap review against PLAN.md and the current live route graph, not a new visual or full security audit. Inspected the staff workspace, route dispatcher, operational schema/functions, settings, identity/status flows, app config, tests and handover records. No app source was changed and no deployment/policy was enabled.

Attempted current native inspection using ADB: emulator-5554 is connected, but its resumed activity is the Android launcher and package checks found neither SmartMaint nor Expo Go installed. No current app screenshots or flow acceptance could be obtained. Prior screenshots were not reused as fresh audit evidence. Existing docs describe earlier captures and exports; those are historical evidence only.

The repository now includes expo-dev-client and a generated android directory. Their presence does not establish an installed development build or signed release. No eas.json or iOS bundle identifier was found; Android currently uses com.anonymous.SmartMaint. Actual local environment values were not inspected. The last user-confirmed state is no Convex deployment and no approved institutional verification policy.

## Existing source worth preserving

Clerk email-code identity, role/capability definitions, isolated signed-out preview, trusted staff application/resolution, scoped administration and audit, one-time internal bootstrap guards, authorization cache/session isolation, and protected basic report/task operations exist. Do not rebuild these as if absent. Administrative pagination exists already.

## Fresh checks

`npm test` passed all 71 tests (29 domain and 42 backend/client); `npm run typecheck` and `npm run lint` passed. These validate existing source behavior, not completion of missing features or a live deployment. No dependency installation, app build or deployment was performed by this review.

## Outstanding delivery map

| Priority | Area | Current source | Remaining work |
| --- | --- | --- | --- |
| P0 | Live integration | Convex schema, auth config and functions exist | Select/deploy backend, run deployment/codegen checks, configure Clerk issuer/JWT claims, verify real session-to-account integration |
| P0 | Institutional staff access | Review and bootstrap source exists; verification intentionally disabled | Approved verification/evidence/role policy, approved departments and nominated first administrator; authorized bootstrap and live lifecycle tests |
| P0 | Equipment population | Equipment schema/read queries exist | Approved inventory import/create/update process, uniqueness/identity validation and QR lookup; there is no equipment creation/import function in current convex source |
| P0 | Safety lifecycle | submitVerification/clearHold/reconcile deliberately reject; availability always false | Approved technical/clinical checklists and release rules; actual attempt records, independent sign-off, failed/unable outcomes, linked rework, hold clearance and derived availability |
| P1 | Identification and provisional reporting | Preview camera/manual/provisional flows exist; live report requires an existing equipment ID | Live QR/manual lookup, confirm identity, unknown/provisional reports, preserved raw scan, authorized reconciliation and emergency reporting |
| P1 | Reporting | Live text-only submit and minimal list exist | Protected detail/history, full description/context, search/filter/status/review, triage UI and robust retry/recovery; backend triage exists but has no staff UI caller |
| P1 | Photos | Camera/library preview exists | Authorized upload/storage/download, attachment schema and access controls, failure/retry/deletion/retention; no live upload function or attachment storage schema exists |
| P1 | Maintenance/history | Create/assign/due/cancel/work/complete exist | Immutable work-entry history, usable timeline and richer task context; verification/rework integration. recordWork patches diagnosis/notes/parts and only audits state transition, so prior content is not preserved as an application history record |
| P1 | Safety-hold controls | holds/placeHold backend functions exist | Wire scoped hold list/create/detail controls into live equipment screens; current staff UI does not call them |
| P1 | Offline | Preview queue is in memory; live disconnect locks access | Approved offline access model, secure account-separated drafts/attachments/queue, durable storage, idempotent replay, conflicts, expiry/revocation handling and recovery |
| P1 | Notifications | Live tab displays unconfigured notice | Event records, read/unread, scoped deep links, push/email delivery and persistent preferences, delivery failure handling |
| P1 | Pagination and reporting correctness | Operational queries take at most 100 per department | Paginated equipment/reports/tasks and protected detail-by-ID queries; accurate date-filtered aggregates/exports. Current summaries are samples, not full totals |
| P2 | Settings/security UX | Theme/accessibility state exists; biometrics invokes a device check | Persist appropriate preferences; complete app/session reauthentication if required; wire notification settings for live accounts and remove misleading dead ends |
| P2 | Management/export | Three summary values and four-column CSV exist | Approved KPI definitions, workload/overdue/turnaround/trends, complete filtered reports and reliable native file export; native currently shares CSV text |
| P1 | Release/operations | SDK config and dev-client dependency exist | Stable app identifiers, EAS profiles/project, signing/build/distribution; verified OAuth callbacks, support contact/privacy/retention documentation and operational monitoring/recovery procedures |
| P1 | Acceptance | Unit/mock tests exist; historical exports passed | Real Clerk/Convex lifecycle tests, Android/iOS device testing, camera/QR/biometric/SSO permissions and cancellation, offline recovery, screen reader/text scaling/contrast, and matching-state design acceptance |

P0 blocks meaningful live onboarding or completion of the core lifecycle. P1 completes essential operational use; P2 completes polish and supporting workflows. These are delivery priorities, not severity claims about an exploit.

## Specific source findings

1. **Live preview parity is incomplete.** src/features/workflows/route.tsx dispatches real accounts to LiveFlow before preview workflows. LiveFlow handles a small explicit set and otherwise renders Workflow unavailable. Existing preview screens cannot be counted as live features.
2. **Records beyond the operational cap become unreachable.** convex/operations.ts uses take(100) for equipment/reports/tasks. EquipmentDetail and TaskLoader search those list responses instead of fetching one authorized ID. Equipment/tasks have no explicit descending order. For reporter-only users, ownership filtering occurs after the department's recent-report cap, so a user's reports may disappear even when fewer than 100 belong to that user.
3. **Live notification settings is a dead end.** SettingsWorkflow links to notification-settings, while the live dispatcher only exempts help/settings and LiveFlow has no notification-settings branch.
4. **Maintenance history is incomplete.** recordWork overwrites editable work fields; the audit event records a generic reason and old/new task state, not prior diagnosis, notes or parts. A dedicated append-only work log/history view is needed to satisfy PLAN.md's history journey.
5. **Core live data cannot be provisioned through the app.** Read-only equipment APIs and a report requiring equipmentId leave an empty deployment with no equipment workflow until an approved inventory onboarding path exists.
6. **Documentation needs reconciliation.** docs/IMPLEMENTATION.md has a superseding header but still contains older statements that no Convex schema/functions exist. README start commands also predate the new dev-client/local native setup. PLAN.md has both newer staff checkboxes and older unchecked implementation sections. These should be consolidated so acceptance status is clear.

## Suggested implementation sequence

1. Deploy/connect existing identity/backend source; obtain policy approvals without enabling unapproved verification.
2. Implement approved inventory onboarding, scoped detail lookups and pagination.
3. Complete live identification/reporting, attachments, triage and safety-hold controls.
4. Implement approved verification/rework/release lifecycle and immutable maintenance history.
5. Implement approved offline recovery, notifications, complete analytics/export and persistent settings.
6. Validate complete role journeys on Android/iOS, correct design discrepancies and prepare signed distribution.

Independent work can proceed while approvals are pending, especially pagination/detail queries, maintenance history, settings routing, inventory integration design, attachments and live UI parity. Policy-dependent grants and safety decisions must remain disabled until approved.
