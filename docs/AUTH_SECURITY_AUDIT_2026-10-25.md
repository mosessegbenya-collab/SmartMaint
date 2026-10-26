# SmartMaint authentication and authorization audit

25 October 2026. PASS means an executed check or confirmed configuration; BLOCKED means external confirmation or a real authenticated session is needed; NOT IMPLEMENTED means intentionally deferred. Source implementation and live acceptance are distinguished below.

## Initial findings

- PASS: Audited the existing root, npm lockfile (v3), Expo configuration, strict TypeScript configuration, routes, providers, schema, public/internal functions, environment key presence and Git history before editing. Git started clean at `9d49f18`.
- PASS: Installed Expo **57.0.31**, React Native **0.86.3**, React **19.2.3**, Clerk **4.13.0**, Convex **1.47.0**. No dependency changes were needed; Expo compatibility and Doctor passed.
- Existing work already included secure Clerk token caching, session restoration/sign-out, a current-session Convex token bridge, transactional applications, server account/capability/department checks, approval, suspension/revocation, self-review denial, last-administrator protection and audit history. These were preserved.
- Gaps repaired: email-code primary authentication and passwordless recovery did not meet the requested password flow; social launchers and a biometric probe were still exposed; bootstrap lacked exact retry support and the requested system administrator identifier; Convex lacked its own TypeScript configuration.
- PASS: Existing development target is **greedy-bat-971**, team **moses-segbenya**, project **smartmaint**, personal development reference **dev/moses-segbenya**. The CLI confirmed this, and the user explicitly authorized keeping and syncing this deployment after the ownership discrepancy was raised. It is not evidence of an Edem-owned organisation. No replacement was created.
- BLOCKED: Whether Moses originally initialized/owns the Clerk application requires its Dashboard membership/history confirmation. A publishable key and issuer do not prove account ownership. No Clerk administrative credential was available or requested for the app.
- PASS: Read-only live configuration checks found no departments, applications, staff accounts or access policy; bootstrap is not completed. No real user was created or elevated during this work.

## Files and dependencies

| Files | Reason |
| --- | --- |
| `src/features/access/email-auth.tsx` | Password fields, password sign-in/registration, verification states and recovery. Passwords stay in transient component memory. |
| `src/features/access/password-reset-service.ts` | Verify-before-reset orchestration, matching password validation, error propagation and other-session revocation request. |
| `src/features/access/screens.tsx` | Remove social UI, update recovery copy and disable the existing biometric probe. Layout/design retained. |
| `src/features/access/sso.tsx`, `sso.web.tsx` | Removed unused social launch components to enforce the requested authentication scope. |
| `src/features/access/sso-continuation.web.tsx` | Historical links lead to custom email/password forms; session-task handling remains. |
| `convex/schema.ts` | Optional bootstrap receipt IDs and optional literal `systemRole`; compatible with existing rows. |
| `convex/operator.ts` | Internal-only explicit Clerk ID allowlist, intended verified email, original-grant retry receipt and audit. Uses generated server builder. |
| `convex/administration.ts` | Remove the bootstrap system-role tag when an authorized administrator downgrades its holder's existing role. |
| `convex/tsconfig.json` | Installed CLI's backend configuration, plus installed Node type declarations for server environment access. |
| `tests/backend/staff.test.ts`, `password-reset.test.ts`, `sso-callback.test.ts` | Bootstrap abuse/retry/suspension, client system-role injection, password recovery and removal of social launchers. |
| `.env.example`, `docs/AUTHENTICATION.md`, `docs/STAFF_ACCESS.md`, this report | Separate mobile public configuration, deployment settings, current acceptance status and operator procedure. |
| `validation/continuation-2026-10-25/live-signed-out.json` | Sanitized post-sync live denial evidence. |

Dependencies added, removed or updated: **none**. No real environment values, deployment bindings, native configuration, operational records or existing role hierarchy were replaced. Official generated bindings were regenerated without a Git diff.

## Authentication and backend security

The implementation supports email/password registration and sign-in, conditional email verification, resend cooldown, password reset, existing secure session persistence and sign-out. It preserves loading locks, field errors, secure password inputs, autofill hints, accessible labels and keyboard-aware screens. Unsupported Clerk requirements remain incomplete with an explanation. Sending a verification code can be retried without recreating a successful registration attempt.

The existing arrangement is `ClerkProvider` with Clerk's supported `tokenCache`, wrapping `ConvexProviderWithAuth` with the current-session adapter. That adapter uses the session token for audience `convex`, otherwise the existing legacy template path, honors forced refresh and withholds tokens during pending session tasks. This is retained to preserve the prior session-refresh repair. Convex validates the deployment issuer and audience; server helpers use `ctx.auth`, `tokenIdentifier` and Clerk subject.

Authentication, verified email, pending application and active account are separate. Pending/rejected applications cannot perform operations. Only approved accounts with current policy, active departments and granted capabilities/scope can operate. Suspended/revoked accounts are denied on the backend. A missing profile produces `no_application`, not operational access. Public status/diagnostic queries deliberately return signed-out status without private data.

Authorization review covered identity arguments, ID-based reads/writes, private-data queries and parent/department references on writes. Existing helpers enforce account, scope and ownership. Client-supplied requested roles are only application requests; privileged grant inputs require backend authority and cannot be used for self-approval or self-escalation. Existing action storage access authorizes through server queries before access and rechecks before committing uploads.

The bootstrap now stores `systemRole: "SYSTEM_ADMINISTRATOR"` with the existing `role: "Administrator"` capability/scope model. This preserves UI and existing data compatibility without inventing a parallel hierarchy. The tag alone grants no permission. Public endpoints cannot submit it or gain authority from it; ordinary users cannot call the internal bootstrap. Legacy Administrator rows remain compatible. Downgrading a tagged administrator clears the tag.

The bootstrap requires an authenticated, verified application's actual Clerk ID, a deployment allowlist, the intended email `moses.segbenya@ucc.edu.gh`, independent institutional evidence and explicit scope. Email alone is insufficient. It atomically creates the account, verification, audit and receipt. An exact retry returns the original account ID without another grant or audit entry and without lifting suspension. Another identity, request or changed scope/details is refused. A pre-existing staff account or older completed bootstrap without a receipt stays closed.

## Executed checks

| Status | Command/check | Exact result |
| --- | --- | --- |
| PASS | `npm ls @clerk/expo convex expo react react-native --depth=0` | Installed versions resolve without a reported conflict. |
| PASS | `npx expo install --check` | Dependencies are up to date. |
| PASS | `npx expo-doctor` | **21/21** checks passed. |
| PASS | `npm run typecheck` | No TypeScript errors after repairs. |
| PASS | `tsc --noEmit -p convex/tsconfig.json` and deployed Convex typecheck | Passed after adding the backend config and installed Node types. |
| PASS | `npm run lint` | No lint errors or warnings. |
| PASS | `npm run test:domain` | **39/39** tests passed. |
| PASS | `npm run test:backend` | **162/162** tests passed across **15** files. Includes negative auth, cross-user/scope privacy, pending/suspended access, self-escalation, bootstrap and reset cases. |
| PASS | `npx convex dev --once --typecheck enable --tail-logs disable` | Existing development functions ready at 21:29 UTC; optional schema changes accepted. No bootstrap/approval function invoked. |
| PASS | `npx convex codegen --typecheck enable` | Official code generation and TypeScript passed. |
| PASS | `node scripts/identity-config-check.cjs` | Target expected, Clerk key present, issuer matches key, discovery/signing keys available, repeated after sync. |
| PASS | `node scripts/development-integration.cjs --signed-out` | `staff.resolve` returns unauthenticated; equipment/reports/tasks/preferences all deny access, repeated after sync. |
| PASS | `npx expo export --platform android --output-dir artifacts/bundles/auth-audit-2026-10-25` | Android bundle exported: **1,982 modules**, **39 assets**. This is bundling evidence, not an installed-device or Expo Go authentication pass. |
| PASS | `git diff --check`, environment ignore/tracking inspection | No whitespace errors; `.env` and `.env.local` ignored and untracked. No credentials were printed or committed. |
| BLOCKED | Real Clerk/password/mobile lifecycle | No real password, verification code or session token was supplied or generated for this audit. Delivery, session restoration after restart, reset, sign-out and authenticated Convex claims were not tested live. |

Earlier sandbox network checks failed with EACCES and were rerun with approved network access. The first strict Convex sync stopped before pushing because the backend tsconfig was missing; this was repaired and the subsequent sync passed. Intermediate type errors were repaired before final checks. None of these attempts is counted as a successful live authentication test.

## Dashboard actions and trusted bootstrap procedure

1. **Clerk:** Confirm the existing application's ownership/membership separately from Convex ownership. Match its publishable-key host to the existing issuer. Confirm Native API enabled, email required, email/password sign-up and sign-in enabled, email-code verification enabled, and password recovery available. Disable Google/Apple and primary passwordless sign-in if enforcing password-only entry across other clients. Do not recreate the application.
2. **Clerk:** Confirm the Convex integration is activated. Merge the following claims into Sessions > Customize session token (or the already-used legacy `convex` template). Keep the integration's `aud: convex`; do not derive email verification from unsafe metadata or a constant `true`.

   ```json
   {
     "email": "{{user.primary_email_address}}",
     "email_verified": "{{user.email_verified}}"
   }
   ```

   The shortcode must produce a boolean verification claim. Sign in freshly and use the existing account-status diagnostics to confirm Convex sees a verified identity; never paste tokens into logs. Unexpected required names/consent/invitations or enrollment must be handled or deliberately configured by the owner; they are not bypassed.
3. **Convex:** The development issuer already matches; no replacement URL/key is needed. Local `.env` values do not configure the deployment. Keep deployment-side `CLERK_JWT_ISSUER_DOMAIN` matching the existing Clerk Frontend API URL. [Selected development dashboard](https://dashboard.convex.dev/t/moses-segbenya/smartmaint/greedy-bat-971).
4. **Institutional operator:** Obtain real approved departments, the approved role/capability policy, staff-verification procedure and non-secret authorization references. In the development Dashboard Functions editor run internal `operator:configureDepartments` with `departments: [{ code: "<approved-code>", name: "<approved-name>" }]` and `authorizationReference: "<approval-reference>"`. Configure internal `operator:configurePolicy` with `approvedRolePolicyVersion: "smartmaint-role-policy-v1"`, the actual `institutionalPolicyReference` and `manualVerificationEnabled: true` **only once institutional approval exists**. Do not invent data to enable these gates.
5. **Moses:** Register/sign in and verify the intended email through Clerk. Submit a separate staff application using a real approved department. The operator independently confirms the current verified primary email and actual Clerk user ID in the Clerk Dashboard, matches it to the authenticated application, verifies institutional Staff ID/full name and approves scope. No ID is guessed and no placeholder Clerk user is created.
6. **Convex operator:** Set deployment-only `SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT` to that actual user ID and `SMARTMAINT_BOOTSTRAP_AUTHORIZATION_REFERENCE` to the non-secret approval-record reference. These are additional operator guards, not credentials to embed in the client.
7. In the Dashboard Functions editor run **internal** `operator:bootstrapAdministrator` with this shape, replacing every placeholder with verified values:

   ```json
   {
     "applicationId": "<actual-authenticated-application-id>",
     "clerkUserId": "<actual-dashboard-verified-clerk-user-id>",
     "institutionalAuthorizationReference": "<approved-reference>",
     "verifiedStaffId": "<verified-institutional-staff-id>",
     "verifiedFullName": "<verified-full-name>",
     "scope": ["<approved-department-document-id>"]
   }
   ```

8. Confirm one `staffAccounts` row, the `SYSTEM_ADMINISTRATOR` tag, the original scoped Administrator grants, verification and `operator.bootstrap` audit event. An exact retry before removing the settings is safe. Remove both bootstrap environment settings after verification; subsequent bootstrap calls then fail closed. Do not remove the receipt or reset `bootstrapCompletedAt`. No bootstrap was executed in this audit.
9. With approved test identities, verify live permitted operations, cross-account denial, role reduction, suspension and revocation. Do not use real maintenance records merely to test access.

## Commands to run next

After the Clerk Dashboard checks, start the existing app for manual authentication acceptance:

```powershell
npx expo start --go
```

Use an SDK 57-compatible Expo Go installation. If testing the existing development build instead, use `npx expo start --dev-client`. The email/password flow itself adds no native-only authentication components or dependencies.

To repeat the audit checks from the project root:

```powershell
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
node scripts/identity-config-check.cjs
node scripts/development-integration.cjs --signed-out
```

The backend is already synced; no additional deploy command is required for the delivered changes. Production was not deployed.

## Limits and next milestone

BLOCKED: Complete real email/password/verification/reset/restart/sign-out tests and prove a real session's claims reach Convex; then perform the trusted institutional setup and bootstrap above. Confirm Clerk ownership and any desired Edem team membership administratively; the user chose to retain the existing Convex deployment.

NOT IMPLEMENTED: Google/Apple authentication, biometric sign-in, PIN authentication, new operational modules, production rollout and a new visual design. Existing device-dependent screens outside this authentication scope were preserved. Historical session-task/callback handling and development-only synthetic diagnostics remain; this audit did not run those diagnostics to create identities.

Recommended next milestone: verified device authentication and approved staff lifecycle on this development deployment, before operational onboarding or production release. Additional Clerk-required profile/consent/enrollment flows may need focused UI after their actual configuration is known.

Official sources reviewed: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [password flow](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password), [password recovery](https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password), [Clerk/Convex integration](https://clerk.com/docs/guides/development/integrations/databases/convex), [Convex/Clerk](https://docs.convex.dev/auth/clerk), [JWT claim shortcodes](https://clerk.com/docs/guides/sessions/jwt-templates). Installed SDK declarations were also checked before using methods.
