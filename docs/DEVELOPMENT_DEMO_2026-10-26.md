# SmartMaint development demo — 26 October 2026

Target: existing **development `greedy-bat-971`**, team `moses-segbenya`, project `smartmaint`. The user explicitly authorized development configuration, the first demo administrator and development backend sync. This replaces the earlier preparation-only restriction for this demo. It does not authorize production, institutional approvals or clinical safety/release.

## Created and verified records

| Item | Result |
| --- | --- |
| Department | **IT-DEMO / IT department**, ID `jd7crgvpz11w36jvec33h4mgn98h0ddz`, active, classification `development-demo`. |
| Access policy | `DEMO-ACCESS-v1`, setup reference `DEMO-ADMIN-20261026-001`, existing role-policy version, classification `development-demo`. Institutional reference is empty and `manualVerificationEnabled:false`; the separate development review flag is true. |
| Administrator | **Moses Segbenya**, demo staff ID **CCT-DEMO-0002** (existing normalization uppercases supplied `CCT-demo-0002`), email target `moses.segbenya@ucc.edu.gh`, account ID `m177k2n32a49jqeb1p0vk60am58h1pmt`, role `Administrator`, tag `SYSTEM_ADMINISTRATOR`, approved, scope only IT-DEMO. |
| Identity linkage | The user submitted an application through a real signed request. `staff:submit` obtained the verified primary email, Clerk subject and token identifier from `ctx.auth`; no Clerk ID was invented or entered as a client identity argument. Internal bootstrap matched those stored values, the configured Clerk issuer and the intended email. No Clerk application/user was created or replaced. |
| Fictional equipment | `IT-DEMO-FICTIONAL-001`, **Fictional training monitor — DEMO ONLY**, model `SIMULATED-IT-001`, fictional training room; ID `jh7e1enrcdka2w97vbrmykwy8s8h1s6q`. Registry identity is marked for training workflow use, not clinical equipment verification. |
| Fictional report | “FICTIONAL DEMO: training monitor will not power on”; ID `jn75bbgcf6xkp5xtmz9xpdpwe58h0ttp`. |
| Fictional maintenance | Assigned to Moses for training; ID `js702nad7afah67v86vqtyk8rs8h062d`. No invented additional staff or Clerk identities. |
| Receipt/audit | Bootstrap closed with original application/account IDs and timestamp. Exactly one each of `demo.department`, `demo.policy`, `demo.equipment`, `demo.bootstrap`, `demo.workflows` in the inspected setup audit. |
| Safety/release | **Zero active safety policies and zero release records.** Demo safety policy configuration is denied. The safety context also withholds a policy for demo accounts, so verification/hold clearance/release cannot become available through a later role grant. |

Evidence: [live stored-record inspection](../validation/development-demo-2026-10-26/inspect.json), [bootstrap result](../validation/development-demo-2026-10-26/bootstrap.json), [live web observations](../validation/development-demo-2026-10-26/live-web-acceptance.json).

## Authorization and lifecycle

The latest user requested the existing Administrator model and normal operational screens, rather than the earlier proposed restricted component. This implementation reuses existing tables, roles, capability names, account lifecycle and authorization functions, with optional explicit demo classifications. Existing institutional role capabilities and evidence rules remain in place.

Demo Administrator capabilities: **accounts, roles, suspend, reconcile, audit, analytics, export**, plus **report, assign, repair, triage** for this single-user development workflow. Clinical/technical verification and hold/release capabilities are not added. The existing full Administrator role-delegation set is retained within IT-DEMO. Any clinical/hold role subsequently granted in this demo still encounters the disabled safety policy.

The demo bootstrap is internal-only; there is no public promotion endpoint, scheduled bootstrap or email-based login grant. The normal authenticated application endpoint creates only a pending application. Both privileged preparation and bootstrap check the built-in server `CONVEX_CLOUD_URL` against the exact existing development URL. Missing/other/production deployments fail closed. Demo accounts/policies/departments must have matching classifications; cross-department, suspended/revoked, self-verification/self-approval, self-role changes, stale revisions and last-administrator protections remain enforced.

Setup is transactional and refuses incompatible records rather than overwriting them. Exact completed bootstrap retries acknowledge the original receipt, never change grants or restore suspension. On 26 October an executed live retry returned the same department/account IDs, preserved one equipment/report/task and retained the five original setup audit events. No permanent setup secret or bootstrap password exists.

Development reviews use existing review/approval screens with demo labels and a separate development policy reference; they do not assert institutional employment or treat demo references as paperwork. Institutional bootstrap/configuration cannot convert this demo policy through the institutional setup function.

## Implementation files

- `convex/development_demo.ts`, `convex/lib/development.ts`: fixed development setup, deployment restriction, read-only operator readiness and receipt-bound internal bootstrap.
- `convex/schema.ts`: backward-compatible optional classifications/development policy fields and intended-application email index.
- `convex/lib/access.ts`, `staff.ts`, `administration.ts`, `operator.ts`: retain shared guards, match classification, distinguish development review from institutional verification and resolve the normal account status through the same server account checks.
- `convex/operations.ts`, `safety.ts`: allow the authorized demo Administrator to receive its own training repair assignment; preserve normal technician assignment restrictions; disable clinical safety/release for the demo.
- `src/domain/role-policy.ts`, `models.ts`, `staff-access.ts`: explicit mode-specific Administrator capability profile and trusted result decoding.
- `src/features/access/identity-diagnostics.tsx`: existing fresh signed path can submit the fixed pending demo application, test pending denial and test approved reads. The client button never grants access or sends an identity/email argument.
- `src/features/staff/status.tsx`, `administration.tsx`, `workspace.tsx`, `dashboard-screens.tsx`, `src/navigation/tabs.ts`: demo notices, appropriate review labels and operational shortcuts/tabs. Demo native navigation uses five tabs; reports remain accessible through the home shortcuts.
- `src/features/access/account-email-service.ts`, `src/features/staff/provider.tsx`: reactive token freshness repair described below.
- `scripts/development-demo.cjs`: guarded operator preparation/bootstrap/status/inspection and unsigned acceptance helper; credentials/tokens are not printed.
- `tests/backend/development-demo.test.ts`, `account-email.test.ts`: security/workflow/navigation and reactive token regressions.
- Official code generation updated `convex/_generated/api.d.ts` during the authorized sync. No generated native configuration was regenerated or changed.

No dependencies added/removed/upgraded. No production resources or Clerk application changes. No Git add/commit/push command was issued by the agent; existing staging/commits made by another workspace process were preserved.

## Executed acceptance and checks

| Status | Evidence |
| --- | --- |
| PASS — live | Development sync: `node node_modules/convex/bin/main.js dev --once --typecheck enable --tail-logs disable`, functions ready at 18:21:58 UTC. Added application email index; actual existing deployment retained. |
| PASS — live user report | Before bootstrap: fresh real Clerk token accepted, `verified_identity`, staff **pending**, all five protected reads denied with **approved_account_required**, not missing-policy or network failures. |
| PASS — live user report | After bootstrap: fresh real token accepted, staff **approved**, all five reads allowed; one equipment, report, task and administrator record returned, preferences readable. |
| PASS — live executed | Fresh unsigned requests: `staff:resolve` unauthenticated and all five protected reads deliberately denied with `Sign in to continue.` Repeated after bootstrap. |
| PASS — live executed | Internal bootstrap, identity-link/receipt/policy/audit inspection and exact idempotent retry described above. No safety/release records created. |
| PASS — local mocked tests | Full test run before the reactive repair: **43 domain tests and 177 backend tests**. The demo suite exercises signed-out/unapproved denial, wrong identity, wrong deployment, preservation of conflicts, idempotence/suspension, scope/self-escalation, normal demo staff approval, reporting, triage, assignment, repair and disabled clinical verification/release. |
| PASS — local mocked tests | Reactive repair/navigation checks: **41/41** targeted tests across account-email, client access, diagnostic route and development demo. These tests do not establish live UI acceptance. |
| PASS — static | App and backend TypeScript checks; lint with no remaining warning/error after corrections. Final check results are recorded below if later changes require another run. |
| PASS — live user report | Normal reactive account status recognized Moses, CCT-DEMO-0002 and Administrator with the demo-only notice. User clicked Continue to workspace and confirmed the dashboard opened with the IT-DEMO notice and staff accounts/equipment/maintenance controls. |
| NOT TESTED | Native demo authentication/workspace, live report/maintenance mutations, production/distribution. The successful earlier x86_64 APK build does not establish these outcomes. |

### Reactive account-status defect and repair

The user reported the normal workspace still displayed **identity unverified**, while the fresh signed HTTP diagnostic returned **approved**. The reactive adapter allowed a cached first token and used a hook-level `sessionClaims.aud` fallback absent from the working diagnostic path.

The local repair selects the audience from the same current session resource as the working HTTP path and forces the first token request for each reactive fetcher to bypass cache. Pending/unloaded sessions still return null; errors never fall back to unsigned access. The auth fetcher reads the current session resource and does not depend on token-cache changes to replace itself. No server verification or route guard is bypassed. A local regression demonstrates rejecting pre-verification cache reuse on first connection, plus explicit refresh and new-session behavior.

An intermediate ref-based implementation failed lint/typecheck and was replaced with memoized session-resource access; these failures are not counted as passes. Freshness alone **did not fix** the live workspace: the user still observed identity unverified.

The added caller-only, development-only reactive diagnostic then captured the actual cause: session-token mode, fresh token, correct issuer/audience/current expiry, but **email and both verification claim names missing**. The same WebSocket was connected, Convex authenticated the JWT and the server returned `email_missing`. See [live reactive failure](../validation/development-demo-2026-10-26/reactive-claim-failure.json). This establishes a claim-shape/token-selection defect, not a staff permission or transport failure.

The final token-selection repair requests the existing supported `convex` JWT template when the session token lacks the required email claim shape. It never invents claims, changes Clerk settings or bypasses Convex validation. A token explicitly declaring verification false remains unverified, including when its email is missing; it is not replaced by searching for a more permissive token. Missing/unavailable template returns null and remains locked. HTTP diagnostics and the reactive provider now share this helper. Regression tests cover the exact missing-claims audience case, explicit false and missing-template denial.

**PASS — live normal app retest:** the user reported the approved demo account details and Continue to workspace control after this repair, then clicked it and explicitly confirmed the normal dashboard and staff/equipment/maintenance controls opened. This is separate live evidence from the earlier HTTP diagnostic. No new credentials or sign-in were needed.

### Final check checkpoint

`npm test` passed **43/43 domain tests** and **180/180 backend tests across 18 files** after the claim-selection repair. The strengthened 10-test demo suite was also rerun after adding assertions that even a mocked privileged safety-policy insertion cannot enable demo clinical verification and a mismatched account classification cannot access records. The demo suite covers the normal paginated dashboard APIs, draft save/publication APIs and native-safe five-tab navigation as well as the core workflow APIs. These are local/mocked checks, not live report/repair mutations. Final app/backend typecheck and lint passed; `git diff --check` passed. No native files or dependencies changed in this task.

## Using and inspecting the demo

Normal web entry: `http://localhost:8081/workspace/home`, signed in with the existing account. Diagnostics: `http://localhost:8081/identity-connection`. The user's application was submitted and the account is already provisioned; no further registration/bootstrap is needed.

Read-only operator checks from the project root:

```powershell
node scripts/development-demo.cjs --status
node scripts/development-demo.cjs --inspect
node scripts/development-demo.cjs --verify-signed-out
```

For local verification:

```powershell
npm run typecheck
npm run lint
npm test
```

The setup script also contains privileged `--prepare`/`--bootstrap` modes for the trusted development operator. They are not required to use the already provisioned account. Never use this development policy as institutional approval or move these records to production. Safety/release acceptance requires a separate authorized milestone and is outside this demo.
