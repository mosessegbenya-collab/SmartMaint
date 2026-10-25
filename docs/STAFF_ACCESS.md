# Trusted staff access

Updated 2026-10-21. This implements the new staff-access brief in the existing Expo app. It supersedes the earlier frontend-only integration boundary. Source and mock tests exist; no live backend has been deployed or validated.

The user confirmed there is no Convex deployment and institutional verification policy is unapproved. Verification stays disabled. No operator configuration, real staff verification, approval or administrator bootstrap was executed.

## Identity and authority

Clerk 4.13 email-code authentication and secure token storage remain. Registration collects requested name, Staff ID, department and role. Clerk unsafe metadata is only a form hint. After email verification, the applicant selects a backend department and submits a separate authenticated application. No client role or metadata grants access.

`ConvexProviderWithClerk` supplies Clerk tokens. Backend helpers first require `ctx.auth.getUserIdentity()`, verified email, tokenIdentifier and subject; approved accounts bind both identity and Clerk subject. Every protected operation then checks current account status, policy, capability and department scope. Navigation derives from the same approved grants but is not an authorization boundary.

`convex/auth.config.ts` reads deployment-side `CLERK_JWT_ISSUER_DOMAIN` with applicationID `convex`. The installed Convex client supports the activated Clerk Convex integration (session audience `convex`, no named template required), or the legacy JWT template named `convex`. Include standard email and boolean email_verified claims in whichever token path is configured. Confirm these claims reach Convex as email/emailVerified in a live integration before enabling staff access. No provider is configured when the issuer is absent.

Mobile configuration contains only the existing public Clerk key and `EXPO_PUBLIC_CONVEX_URL`. No secret/admin key belongs in the app. Existing keys were preserved and environment files were not inspected for this implementation.

## Backend inventory

`convex/schema.ts` defines departments, accessPolicy, staffAccounts, registrationRequests, staffVerifications and authorizationAudit; equipment, faultReports, maintenanceTasks and safetyHolds support protected operational records. Indexes support identity, verified Staff ID, department, status and history lookups. Unique ownership and transitions are checked transactionally, rather than assumed from indexes.

- `staff.ts`: departments, resolve and submitApplication. Rejected resubmission requires the previous revision; unchanged pending submissions are idempotent.
- `administration.ts`: scoped application/account/audit pagination and detail queries; verify, approve, reject, changeRole and changeStatus. Convenience bounded list queries also exist.
- `operator.ts`: internal-only configureDepartments, configurePolicy and bootstrapAdministrator. No public wrapper exposes these functions.
- `operations.ts`: authorized equipment/report/task queries and reporting, triage, assignment, work, completion, cancellation, due-date, protective hold, analytics and export operations. Unsupported safety/release transitions fail closed.
- `lib/access.ts`: authentication, active scope, capability/grant limits, last-administrator protection, validation and audit inserts. `lib/server.ts` uses maintained typed Convex SDK builders; `src/services/staff-api.ts` derives public references from source types.

No generated deployment bindings were fabricated. Convex codegen was attempted and stopped because CONVEX_DEPLOYMENT is unset. Deployment/codegen remains an integration gate.

## Review and administration

Applications remain pending until an authorized reviewer verifies Staff ID through an approved institutional process. A verification records minimal external evidence reference, verified name/ID/department, operator/reviewer provenance and current policy reference; do not store identity documents or credentials in reference fields. Staff ID normalization and the proposed role policy must be institutionally reviewed before enabling this mechanism.

Approval requires current verified evidence, an enabled approved policy, revision match, no existing account/verified Staff ID collision, and authority to grant the selected role, capabilities and complete scope. Self-review is denied. Rejection records an applicant-visible reason. Role, capability, scope, delegation and status changes require authorized grants and revision checks; self-administration is denied, revocation is final, and the last active administrator is protected. All critical transitions insert immutable audit events in the same transaction. No public update/delete audit function exists.

Administrative screens expose department filters, load-more pagination, review history, confirmation dialogs, and server errors. Verification controls are disabled when policy is disabled; backend enforcement is independent of the controls.

## Operator handover — not executed

1. An authorized owner creates/selects a Convex deployment and supplies its public URL and Clerk issuer. Deploy and validate the schema/functions, JWT claims and authenticated resolver with an actual Clerk session. Run codegen against that deployment.
2. Approve the institutional verification procedure, evidence retention, exact `smartmaint-role-policy-v1` grants and Staff ID handling. Until approval, do not enable manual verification or bootstrap.
3. An authorized deployment operator uses internal configureDepartments with real approved department records and a non-secret authorization reference. ConfigurePolicy requires an institutional approval reference and exact role-policy version. Keep manualVerificationEnabled false until approved.
4. Only after approval, the nominated first administrator authenticates, verifies email and submits an application. An operator independently verifies that person's institutional details and authorized scope. Set deployment-only SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT and SMARTMAINT_BOOTSTRAP_AUTHORIZATION_REFERENCE to the approved subject and opaque, non-secret approval-record reference. Invoke the internal bootstrap with matching application, verified details and explicit scope. It atomically closes when any staff account exists or bootstrap has completed. Remove bootstrap settings afterward. Never use a fabricated/default administrator or client endpoint.
5. Validate approval, cross-department denial, role reduction, suspension/revocation, account switching and audit with authorized test identities on devices before live use.

## Client isolation

`src/domain/staff-access.ts` validates resolver responses and rejects malformed grants. `src/features/staff/provider.tsx` locks access during identity/backend loading, disconnect, timeout, pending session tasks and expiry. Reconnect uses a fresh resolver query. A changed server-confirmed authorization fingerprint destroys the Convex client and its record cache before accepting fresh access; session and grant changes also remount protected state. Stale approved cache does not unlock access during reconnection.

`AppProvider` has preview/live/locked modes. Real sessions start with empty operational state; fictional records remain signed-out preview only. Live routes use staff features and real mutations. Role tabs additionally filter granted capabilities. No preview completion can produce a live approval or receipt.

## Remaining gates

No deployment, approved verification policy or first administrator exists. Real email receipt/code completion, Clerk JWT claim mapping, live subscriptions/revocation and staff workflows have not been tested end to end. Google/Apple need a configured development build; Expo Go cannot validate their callbacks.

Institutional safety checklists, clinical/technical release policy, hold clearance and reconciliation remain disabled. Attachments, notifications, durable offline queue and complete operational parity remain deferred. Operational lists are bounded to 100 records per department; administrative applications/accounts/audit are paginated. Mock security tests and static exports are not production acceptance. See ../VALIDATION.md and ../design-qa.md.
