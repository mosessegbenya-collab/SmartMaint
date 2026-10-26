# SmartMaint live authentication acceptance

Started 25 October 2026. Continues [the implementation audit](AUTH_SECURITY_AUDIT_2026-10-25.md). This record is separate from mocked tests and bundle exports. No live account outcome is inferred from either.

## Preserved starting state

- PASS: Inspected Git status and the audit before making changes. HEAD remains `9d49f18`; the prior implementation's modified/deleted files and untracked report/tests/configuration are still present. No implementation or deployment was repeated.
- Existing selected backend: development `greedy-bat-971`, team `moses-segbenya`, project `smartmaint`. Backend access for acceptance is diagnostic/read-only. No departments, policies, approvals or administrator provisioning are authorized by this acceptance run.
- PASS: Reused the existing workspace Expo process (PID 17376), launched as `expo start --go`, listening on port 8081. Both localhost and 127.0.0.1 returned HTTP 200 and `packager-status:running`.
- PASS: Android manifest returned HTTP 200, slug `SmartMaint`, SDK `57.0.0`, runtime `exposdk:57.0.0`, host `127.0.0.1:8081`.
- PASS: Connected Android emulator `emulator-5554` has Expo Go **57.0.9** installed (versionCode 444). Expo's [official SDK 57 Android download page](https://expo.dev/go?sdkVersion=57&platform=android&device=true) lists this release. The browser tool could not fetch the redirected binary; availability here is supported by the official listing and the installed matching runtime, not a fresh APK download.
- Native server address: `exp://127.0.0.1:8081`, with emulator-to-host adb reverse on port 8081. Deep link: `exp://127.0.0.1:8081/--/access/sign-in`. This loopback address is for the connected emulator, not a physical phone on Wi-Fi.
- If the selected native runtime fails compatibility checks, use an SDK 57 development build with `npx expo start --dev-client`; no native rebuild is needed merely for a JavaScript password-flow change. No development build was started or created in this acceptance run.

## Acceptance ledger

The user selected Android for the first scenario. PASS requires an observed live result, with user-reported observations identified as such. BLOCKED identifies an actual obstacle. NOT TESTED covers remaining scenarios and platforms.

| Scenario | Android native | Web | Evidence / next step |
| --- | --- | --- | --- |
| 1. Authorized development account email/password sign-in | NOT TESTED | NOT TESTED | Sign-in deep link prepared; awaiting the user's interactive sign-in and non-secret outcome. |
| 2. Email verification and authenticated Convex identity | NOT TESTED | PASS for existing verified identity recognition; email challenge NOT TESTED | User-provided live diagnostic: current token, matching issuer/audience/email, server verified_identity and staff no_application. |
| 3. Verified/unapproved denial: equipment, reports, tasks, preferences, administration | NOT TESTED | PASS under current unconfigured-policy gate | Real verified session, no_application, all five read requests denied with policy_unconfigured. Approval-specific denial with configured policy is NOT TESTED live. |
| 4. Sign-out and subsequent protected request denial | NOT TESTED | PASS for UI sign-out and fresh unsigned backend requests; browser Back NOT TESTED | User clicked Sign out and saw Staff Sign In; new unsigned client received explicit sign_in_required for all five reads. Browser history behavior awaits interactive confirmation. |
| 5. App restart and supported session restoration | NOT TESTED | NOT TESTED | Distinguish signed-out restart from a separate signed-in restoration check. |
| 6. Controlled-email password reset, invalid/expired codes and session behavior | NOT TESTED | NOT TESTED | User enters all email codes/passwords directly in the app; no values retained here. |

iOS: NOT TESTED for every scenario. No web server response or native bundle export counts as web acceptance.

## Available redacted diagnostics

Inspected the existing `src/features/access/identity-diagnostics.tsx`, `identity-diagnostic-service.ts` and staff status screen. The signed-in development account screen exposes `Check identity connection`, using a fresh token and fresh Convex HTTP client without logging claim values.

- Token stage: issuance errors include fixed `unauthenticated`, `resource_not_found` and `session_expired` codes. Client token inspection reports issuer/audience/expiry/email-match/verification status codes and claim types only. Client decoding is diagnostic and does not prove JWT validation.
- JWT validation stage: a successful signed `auth_diagnostics:inspect` request with a non-null verified server identity proves Convex accepted the token. A rejected request is not automatically an email-claim or staff-policy failure.
- Claim parsing stage: server diagnostic returns fixed status and claim types for `email`, `emailVerified`, `email_verified`; distinguish missing claims, wrong types and unverified email.
- Staff stage: `staff:resolve` distinguishes `no_application`, pending/approved/suspended/revoked and service configuration failures. An authenticated identity does not approve staff access.
- If a request fails before a useful diagnostic result, inspect a bounded development log window and summarize fixed error categories; do not retain raw tokens, passwords, email codes, claim values or raw credential-bearing logs.

At the initial runtime-preparation stage no code defect had been demonstrated and no application changes, package changes, backend sync or provisioning were performed. A subsequent user-reported web defect and its local repair are recorded below; authentication acceptance remains incomplete.

The remaining staff-provisioning requirements will be prepared for review after authentication acceptance. The earlier audit's procedure remains a reference only and is not authorization to execute it.

## Switch to web acceptance

The user could not complete the Android emulator test and requested web testing. All Android authentication scenarios remain **NOT TESTED**; launching the emulator did not establish a sign-in pass. Web acceptance is now the active track, starting with scenario 1 only.

The earlier port 8081 server was no longer reachable. Started the existing project with `node node_modules/expo/bin/cli start --web --localhost --port 8081`. Intended browser sign-in address: `http://localhost:8081/access/sign-in`. Server/page readiness is checked separately from actual browser rendering and authentication. No application code, dependencies, backend deployment or provisioning changed.

PASS: The web server announced `Waiting on http://localhost:8081`; a GET of `http://localhost:8081/access/sign-in` returned HTTP 200 and HTML. Browser rendering and all web authentication scenarios remain **NOT TESTED**, awaiting the user's interactive observations.

## Confirmed web defect: task component provider context

- BLOCKED (user-observed live failure): The browser rendered `TaskChooseOrganization` on the task continuation screen and threw `@clerk/react: TaskChooseOrganization can only be used within the <ClerkProvider /> component`. This does not establish that a fresh email/password sign-in passed; the pending session may predate this scenario.
- PASS (local reproduction): The root already wraps the route in `@clerk/expo`'s `ClerkProvider`. Installed Expo SDK 4.13 loads `@clerk/react/internal` through CommonJS; the route's direct ES import loaded separate Clerk/shared contexts. `npm ls` confirmed a single installed version, so dependency duplication was not the cause. All three ES-imported task components reproduced the reported error inside the SDK-compatible CommonJS context. Their CommonJS variants rendered correctly in the same fixture.
- Repair: Added typed `src/features/access/clerk-web-tasks.ts`, loading the three task components through `require('@clerk/react')`, matching the installed Expo SDK. Updated only the task import in `sso-continuation.web.tsx`. No second provider, dependency changes, global Metro resolver changes, task bypass or backend deployment.
- PASS (automated regression): `node --test tests/clerk-provider-context.test.cjs`: **4/4** passed. Tests reproduce the old ESM context failure and render each adapter component's fallback against the actual SDK-compatible context; a source guard protects the import boundary. These are local React rendering tests, not live authentication results.
- PASS (checks after repair): `npm run typecheck`; `npm run lint` (no remaining warnings/errors); `npx vitest run tests/backend/sso-callback.test.ts tests/backend/client-access.test.ts` (**19/19**); `git diff --check`. The adapter has one documented, line-specific lint exception because the tested SDK context boundary requires CommonJS; lint remains enforced elsewhere.
- PASS (server readiness): `/status` returned HTTP 200 and running; `/sso-continue/task` returned HTTP 200 and HTML after the patch. This does not establish browser task completion.
- Live retest pending: Hard-refresh the browser task screen and report whether the provider error disappears and which task UI appears. Do not mark sign-in, email verification, Convex identity, staff denial, sign-out, restoration or password reset PASS yet. Android remains **NOT TESTED** throughout.

Module-resolution evidence: [Metro package exports documentation](https://metrobundler.dev/docs/package-exports/) explains that `import` and `require` select different package conditions; the installed SDK and package exports were inspected directly. Clerk's [session task documentation](https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks) confirms that pending tasks must complete before the session is active. No task requirement was removed.

## Web observation after provider repair

- PASS (user-reported browser rendering): The account-status screen now renders without the earlier task-provider exception. The user reported `Verify your email`, `identity unverified`, the development identity diagnostic button and the message that Clerk already considers the email verified. No credentials or token values were requested or recorded.
- BLOCKED: Scenario 2, authenticated Convex verified-identity recognition. The displayed state establishes a mismatch between Clerk's reported primary-email verification and staff resolution, but does not yet identify stale claims, absent claims or wrong claim types as its cause. Await one explicit verified-identity refresh, then use the existing redacted connection diagnostic if the mismatch remains.
- Scenario 1 remains NOT TESTED as a fresh email/password acceptance result: this observation alone does not establish how the current session was authenticated. No protected-access, sign-out, restoration or reset scenario is marked PASS. Android remains NOT TESTED.

## Web observation after verified-identity refresh

- BLOCKED (user-reported): After the requested refresh, the user reported backend unavailable / unable to confirm authorization, with staff records locked. This is not evidence of successful authenticated Convex identity recognition and is not yet a confirmed code defect.
- PASS (read-only network checks from this computer): `node scripts/identity-config-check.cjs` returned development target expected, Clerk key present, matching issuer and available issuer discovery/signing keys. Separate unsigned requests reached both `auth_diagnostics:inspect` and `staff:resolve`; each returned `unauthenticated` as expected. No deployment or environment values changed.
- These checks establish backend reachability from this computer, not the browser's WebSocket connection or acceptance of its Clerk token. The next single interactive step is `Check identity connection` on the account-status page, reporting only its redacted result. Browser token issuance, JWT validation, email-claim parsing and staff resolution remain unconfirmed until that result is available.

## Confirmed diagnostic result-display failure

- BLOCKED (user-observed): Clicking `Check identity connection` finishes loading but displays no result. This prevents determining the cause of the Clerk/backend verification mismatch; no successful live diagnostic is claimed.
- PASS (local regression reproduction): The existing `SessionBoundary` changes its React key between `identity_unverified` and transient `loading` states. The diagnostic's prior component-local result and active flag were inside that remounted tree, so a reload could unmount it before the asynchronous result was committed.
- Repair: Added `/identity-connection` as a caller-only development diagnostic screen under the existing Clerk provider, outside the staff-client and authorization-state remount boundaries. The account-status diagnostic button opens that screen. The check remains session-keyed, has no operational records or provisioning calls, and all normal account/workspace routes retain their existing staff boundaries. No tokens or results are persisted to browser storage.
- Diagnostic failures now display the failed request stage (`identity_reload`, `token_issuance`, `token_parsing`, `backend_identity_request` or `staff_resolution`) and fixed error codes. If available, the redacted client claim summary remains visible even if a backend request fails. A failed backend request still does not by itself prove JWT rejection rather than transport failure.
- Files: `src/app/_layout.tsx`, new `src/app/identity-connection.tsx`, `src/features/access/identity-diagnostics.tsx`, `identity-diagnostic-service.ts`, new `tests/backend/identity-diagnostic-route.test.ts`.
- PASS (executed local checks): **36/36** relevant tests across diagnostic route, diagnostic service/backend, email refresh and client-access suites; `npm run typecheck`; `npm run lint` with no warnings/errors; `git diff --check`. GET `/identity-connection` returned HTTP 200 and HTML on the existing localhost:8081 server.
- BLOCKED: Browser retest and live authenticated Convex claim recognition are still pending. Next action: open `http://localhost:8081/identity-connection`, run `Check identity connection` and report only the redacted result. Android remains **NOT TESTED**. No dependency changes, backend sync or provisioning occurred.

## Live web identity recognition: PASS

User supplied the redacted result from the repaired diagnostic screen:

- PASS (live, user-reported): `stage: complete`; client issuer and audience expected, token current, primary email matches and email verified. Token claim types: email string, email_verified boolean.
- PASS (live, user-reported): Convex `auth_diagnostics:inspect` returned `verified_identity` and `issuer_expected`, with email string and emailVerified boolean. This establishes that Convex accepted this real Clerk token and parsed the required verified-email claims. The client/server difference between email_verified and emailVerified is the expected normalized representation, not a missing-claim defect.
- PASS (live, user-reported): `staff:resolve` returned `no_application`. This is authenticated identity without a SmartMaint staff application/operational grant, not authentication failure.
- Limits: This proves the diagnostic's fresh HTTP path. The earlier reactive account-status display has not yet been rechecked. Fresh password entry (scenario 1), an email-verification challenge, protected-query denial, sign-out, restoration and reset are not inferred from these results. Android remains NOT TESTED.

Prepared scenario 3 without deploying or changing grants: `Check unapproved access` on the same development diagnostic screen obtains a fresh token, rechecks server verified identity and unapproved status, then issues only five reads: `operations:equipment`, `operations:reports`, `operations:tasks`, `extensions:preferences`, `administration:accounts`. It records fixed outcomes/reasons, discards any returned records and never invokes mutations. Only known deliberate Convex authorization errors count as `denied`; transport/unknown errors are `request_failed`, and successful reads are `unexpected_access`. A missing-policy denial is identified as `policy_unconfigured`, rather than attributed to an isolated account-status check. Signed-out/unverified/approved sessions cannot be counted as an unapproved-user pass.

Added `src/features/access/unapproved-access-check.ts`, its three regression tests and the diagnostic button. The **11/11** relevant diagnostic/probe tests passed, including all five actual function handlers under mocked verified identity. Live scenario 3 remains NOT TESTED until the user runs this button and returns its redacted output. No staff configuration, privileged action or backend deployment was performed.

## Live web verified/unapproved protected reads: PASS with stated scope

The user supplied the actual redacted `Check unapproved access` result. The freshly issued token was current with expected issuer/audience and verified primary email. The backend again returned `verified_identity`; staff resolution was `no_application`.

`protectedAccess.status` was `complete`, `allDenied` was `true`, and every protected area returned `outcome: denied`, `reason: policy_unconfigured`: equipment, reports, tasks, preferences and administration. This is live authenticated fail-closed evidence for all five queried read endpoints, separate from mocked tests and signed-out checks. No request was marked denied merely because of a network failure.

Scope limitation: the requests were denied at the missing institutional-policy gate. This does not isolate the subsequent approval/status check with a configured policy, nor test all mutations or every endpoint in those functional areas. Such live approval-specific coverage remains NOT TESTED; no policy or staff configuration will be created for this acceptance run.

Next scenario: user signs out through the existing account-status screen; confirm browser state and subsequent signed-out protected requests before marking scenario 4 PASS. Fresh password-entry acceptance, restart/restoration and password reset remain NOT TESTED. Android remains NOT TESTED. No application changes or deployment were needed to record this result.

## Continuation on 26 October 2026

Inspected the current Git state and ledger; prior implementation and acceptance work remain present. The prior localhost:8081 server was not running, so restarted the same Expo web command on port 8081. No implementation or backend deployment was repeated. Continue with scenario 4: sign out from the account-status screen and report the resulting browser state. If the browser is already signed out, record that observation without attributing it to the unexecuted sign-out action. Android remains NOT TESTED.

## Web sign-out and fresh signed-out backend reads — 26 October 2026

- PASS (live, user-reported): The user explicitly clicked **Sign out** and **Staff Sign In** appeared. This is an observed UI sign-out transition, rather than an inferred session expiry.
- PASS (live, executed at 16:12 UTC): A new unauthenticated `ConvexHttpClient`, without a token or prior client cache, called `staff:resolve` and received `unauthenticated`. Fresh reads to equipment (`operations:equipment`), reports (`operations:reports`), tasks (`operations:tasks`), preferences (`extensions:preferences`) and administration (`administration:accounts`) all returned deliberate Convex `Sign in to continue.` errors. All five were classified `denied / sign_in_required`. No transport failures or policy errors were counted as signed-out denials.
- Evidence: [sanitized signed-out probe](../validation/auth-live-2026-10-26/signed-out.json). This probe ran from the local Node process against the existing development deployment, not inside the user's browser. It proves unauthenticated backend enforcement; it does not independently inspect the browser's retained state or replay/revocation behavior of a previously issued JWT.
- PASS (readiness): Existing web server responded HTTP 200 with running status at `http://localhost:8081`.
- NOT TESTED: Browser Back behavior after sign-out. The user must press Back and report whether the page stays signed out/locked or restores protected access. Do not sign in again until this observation is recorded. Subsequent fresh password sign-in and restart/restoration acceptance remain NOT TESTED.
- Android and iOS remain NOT TESTED. No application change, deployment, policy setting, staff approval or bootstrap was performed for these checks.
