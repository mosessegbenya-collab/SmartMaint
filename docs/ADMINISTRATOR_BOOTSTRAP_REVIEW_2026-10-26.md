# Administrator bootstrap proposal — REVIEW ONLY

**Historical proposal:** the user subsequently authorized the working development demo with the existing Administrator model. See [the implemented demo and executed acceptance report](DEVELOPMENT_DEMO_2026-10-26.md). Its demo-only records are not institutional approval; the isolated-component alternative below was not implemented.

Prepared 26 October 2026 for **development `greedy-bat-971`**. **Execution authorized: false.** This document is not an executable seed, approval record or permission grant. No deployment, mutation, environment update, staff verification or safety/release configuration was performed.

## Supplied facts and their evidence status

| Item | Proposed value | Meaning at this checkpoint |
| --- | --- | --- |
| Name | Moses Segbenya | User supplied; institutional verification not performed. |
| Staff identifier | CCTH/DEMO/0002 | User-supplied demo identifier; not a verified institutional staff identifier. |
| Intended email | moses.segbenya@ucc.edu.gh | Target only. The actual Clerk subject must be independently matched. |
| Clerk Dashboard access | Confirmed by the user | Agent has not accessed the Clerk Users page; no connected Clerk administrative tool or local administrative credential is available. |
| Department | IT-DEMO / IT department | Synthetic development configuration; not a verified institutional department. |
| Requested scope | IT-DEMO only | No cross-department scope. |
| Reported approval | “the authorities”, 26 October 2026 | User report; specific approver, authority and supporting evidence remain unspecified. |
| Tracking reference | DEMO-ADMIN-20261026-001 | Proposed development tracking label only; not institutional approval evidence. |
| Policy reference | DEMO-ACCESS-v1 | Draft development policy for review; not an approved institutional policy. |

## Read-only live inspection

PASS: Snapshot at **18:06:52 UTC** from the selected existing deployment. See [redacted snapshot](../validation/administrator-review-2026-10-26.json).

The following tables contained **zero records**, with no truncated samples: `departments`, `registrationRequests`, `staffAccounts`, `staffVerifications`, `authorizationAudit`, `equipment`, `faultReports`, `maintenanceTasks`, `safetyPolicies`, `releaseRecords`. `accessPolicy` was empty. There is no IT-DEMO record, intended application, account or prior bootstrap receipt to reuse.

Before any later approved operation, repeat this inspection. Reuse an exactly compatible record; stop on duplicate codes, a code/name conflict, a different identity link, broader scope, policy conflict or prior completed bootstrap. Never overwrite an existing policy or alter a granted account as part of a retry. No operational data is proposed.

## Existing bootstrap: exact behavior and blockers

The inspected implementation is `convex/operator.ts`, `operator:bootstrapAdministrator`, an **internal mutation**. It reads a policy for `staff-access` with version `smartmaint-role-policy-v1`, requires `manualVerificationEnabled: true`, two operator deployment settings and a pending authenticated application with verified-email claims. Its temporary subject setting, input Clerk ID and application's recorded Clerk ID must all match, and its email target is fixed to the intended email above. It requires an active explicit department scope including the application's department and matching institutional staff ID. A first grant is refused if a staff account already exists. A completed bootstrap permits only an exact original retry, without lifting a suspension.

The code checks strings, stored flags and identity matches; it does **not** independently validate the truth of an approval document. Supplying a demo string to satisfy a nonempty-reference check would misrepresent evidence. Therefore neither DEMO reference is supplied to the existing institutional-policy/evidence fields.

BLOCKED: no actual approver/evidence, approved institutional policy, approved institutional departments, verified institutional staff identity, independently checked Clerk subject or authenticated application ID. Enabling manual verification solely to pass the bootstrap is not permitted by this proposal.

### Existing record effects, if separately authorized with real prerequisites

| Record | Exact existing behavior | Status now |
| --- | --- | --- |
| `departments` | `operator:configureDepartments` inserts `{code, name, active:true}`, or reuses an exact code/name match. It rejects a name conflict, and does not reactivate an existing inactive record. It returns actual department IDs. | No writes proposed through this institutional function with synthetic data. |
| `accessPolicy` | `operator:configurePolicy` inserts/patches `key:"staff-access"`, `version:"smartmaint-role-policy-v1"`, actual `institutionalPolicyReference`, `manualVerificationEnabled`, server timestamp. | Do not set the draft DEMO reference or enable verification. |
| `registrationRequests` | Real user's `staff:submit` stores `identity`, `clerkUserId`, email and verified-email flag from server authentication; requested name/staff ID/department/role from the application; pending/unverified status and server revision/timestamp. | Must come from the actual signed-in user. No manually inserted or dashboard-mocked identity. |
| `staffAccounts` | Bootstrap inserts one approved account with `identity`, `clerkUserId`, email copied from that request; verified staff ID/name supplied by trusted operator; primary department from request; role `Administrator`; tag `SYSTEM_ADMINISTRATOR`; scope from explicit IDs; all Administrator capabilities and all grantable roles; revision 1 and server timestamps. | This full grant is broader than the requested development permissions. |
| `staffVerifications` | Inserts `outcome:"verified"`, verified name/staff ID, department, actual evidence and policy references, `operator:true`, server timestamp. | Demo claims must not create this institutional verification record. |
| Application update | Sets approved/verified, account ID, review time and increments revision. | No update authorized. |
| Policy receipt | Sets `bootstrapCompletedAt`, `bootstrapApplicationId`, `bootstrapAccountId`. | Must not be fabricated, reset or removed. |
| `authorizationAudit` | Appends `operator.bootstrap`, new account ID, approval reference, department ID and `to:"SYSTEM_ADMINISTRATOR"`; setup and application submission have their own audit events. | Audit records remain append-only through application functions. |

### Exact existing grant compared with the request

Current bootstrap capabilities are **`["accounts","roles","suspend","reconcile","audit","analytics","export"]`**. Current grantable roles are **`["Clinician","Biomedical Technician","Unit Head","Maintenance Supervisor","Equipment Department Head","Technical Services Director","Administrator","Registration Approver"]`**. Scope could be limited to the actual IT-DEMO department ID, but the full Administrator capability/delegation set would remain.

`validGrant` in `convex/lib/access.ts` also requires the full approved capability/delegation set when granting the existing Administrator role. Changing an account's fields after bootstrap would not be a supported way to implement a restricted administrator.

Direct technical verification, clinical verification and release/hold capabilities are absent from the Administrator set. Safety policy setup is internal/operator-only, and equipment release separately requires hold authority and approved safety policy. However, the broad `roles` capability and all-role delegation permit granting operational roles within scope, including roles with hold or verification capabilities. That is broader than the proposed staff-management-only grant. **The existing full bootstrap must not be presented as satisfying the narrower development policy.**

### Existing action template — BLOCKED, do not run

Action: internal **`operator:bootstrapAdministrator`** on **`greedy-bat-971`** only. The following is a description of unresolved inputs, not runnable arguments:

| Argument/setting | Resolution required before any future institutional bootstrap |
| --- | --- |
| `applicationId` | Actual pending authenticated application ID; currently absent. |
| `clerkUserId` / `SMARTMAINT_BOOTSTRAP_CLERK_SUBJECT` | Actual independently checked Clerk subject; currently unresolved. |
| `institutionalAuthorizationReference` / `SMARTMAINT_BOOTSTRAP_AUTHORIZATION_REFERENCE` | Actual approval evidence reference; DEMO-ADMIN-20261026-001 is not eligible. |
| `verifiedStaffId` | Independently verified institutional identifier; CCTH/DEMO/0002 is only a supplied demo label at present. |
| `verifiedFullName` | Name independently checked against institutional evidence; supplied name is Moses Segbenya. |
| `scope` | Actual approved department document IDs, never a code string or invented ID. IT-DEMO is synthetic and is not institutional approval evidence. |

## Isolated development alternative — proposed, NOT IMPLEMENTED

For a live demo on the **same existing development deployment**, propose a separate Convex component with isolated database and function namespace, provisionally named **`developmentStaffSandbox`**. Component isolation is preferred over adding demo rows to institutional tables. It would require reviewed code and a later explicitly authorized development sync; none is performed now. Exact component authentication wiring and API availability must be checked against installed Convex 1.47 before implementation.

This is a development authorization model, not a way to label institutional identity “verified.” It must not change `currentAccount`, `validGrant`, the existing bootstrap, production policy or operational endpoints to accept demo accounts. It uses existing role names and capability vocabulary, with a separate explicitly restricted development grant.

### Proposed component records

These are proposed component-local tables, **not existing tables or created records**. Every generated database ID remains unresolved. Names may change only during a separately reviewed implementation.

| Component-local table | Proposed record |
| --- | --- |
| `setup` | Singleton key `development-staff-sandbox`; bound to actual development deployment greedy-bat-971; classification `synthetic-development`; tracking reference DEMO-ADMIN-20261026-001; policy reference DEMO-ACCESS-v1; policy status `draft`; `enabled:false`; `institutionalApprovalVerified:false`; no grant receipt yet. A draft cannot authorize access. |
| `departments` | `{code:"IT-DEMO", name:"IT department", classification:"synthetic-development", active:false}`. Activation requires separate review; unique code/retry check must prevent duplicates. |
| `applications` | Only after real authenticated submission: actual Clerk issuer/subject and Convex token identifier from server auth, verified primary email, supplied name Moses Segbenya, `declaredStaffId:"CCTH/DEMO/0002"`, actual component IT-DEMO ID, `requestedRole:"Administrator"`, `status:"pending"`, `institutionalIdentityStatus:"not_verified"`, revision 1, server timestamps. Email verification is distinct from institutional verification. |
| `accounts` | Candidate only: same actual server-derived identity linkage and application ID; `role:"Administrator"`; `systemRole:"SYSTEM_ADMINISTRATOR"` confined to this component; `capabilities:["accounts","suspend","audit"]`; `scope:[actual component IT-DEMO ID]`; `grantableRoles:["Registration Approver"]`; `declaredStaffId` and supplied name as above; `institutionalIdentityStatus:"not_verified"`; initial `status:"pending"`; revision 1. A later reviewed internal action would atomically create/activate this development grant and its receipt. These values cannot pass as an institutional `staffAccounts` record. |
| `audit` | Append-only component-local audit with actual operator authority, subject/application/account linkage, server timestamp, decision, development tracking reference and explicit `institutionalEvidence:false`. No public update/delete function. |
| `bootstrapReceipt` | Created atomically only with an approved future development grant: original subject, application ID, department scope, exact capability/delegation set, policy version and account ID. Changed retry fails; exact retry returns original result and never restores suspended/revoked access. |

At this review stage **none of these records is inserted**, including disabled records. A separately reviewed development policy must replace draft status before any grant; its approval would authorize only the demo environment, never institutional verification.

### Proposed effective permissions

| Activity | Proposed development administrator permission |
| --- | --- |
| View/review development applications | IT-DEMO only; no self-review. |
| Confirm demo staff details | Independent review of demo declarations only, recorded as development review; never institutional verification. No self-verification. |
| Approve a development staff account | IT-DEMO only, after independent development review; proposed recipient role limited to existing `Registration Approver`, capabilities `["accounts"]`, `grantableRoles:[]`. This narrow recipient-role choice is for review, not user-approved or implemented. |
| Suspend/revoke another development account | IT-DEMO only; preserve revision checks and protection of the last active development administrator. |
| Read development audit | IT-DEMO only. No modification or deletion. |
| Change own grant, approve self, bootstrap self from app | Denied. The first grant remains a trusted operator action outside the app. |
| Grant Administrator, operational roles, new capabilities or broader scope | Denied from the app. No `roles` capability. An expanded grant would require another reviewed operator procedure. |
| Reconciliation, operational analytics, exports | Denied in this restricted proposal. |
| Equipment/report/task operations, technical/clinical verification, hold clearance, safety policy enablement or equipment release | Denied; component has no operational/safety API bridge. |
| Existing institutional staff/admin/operational APIs | Continue to deny demo-only accounts through unchanged existing guards. |

Scope alone is not isolation: the proposed component must expose no callback that can write institutional tables. Server-side deployment binding must use verified deployment identity, not client parameters or a mobile-public flag; a production/unknown target must fail closed. The exact trusted operator identity/audit attribution mechanism is an implementation prerequisite, not assumed available from Clerk merely because the user can log in.

### Proposed development bootstrap action — NOT IMPLEMENTED, do not run

Provisional internal app/operator entry point: `development_operator:bootstrapDepartmentAdministrator`. This name is a design proposal, not a deployed function. It would call the isolated component only after all of the following:

1. Server confirms the actual deployment is greedy-bat-971 and the separately approved development policy is enabled.
2. A trusted operator independently checks the actual existing Clerk development account: exact primary email, email verified, correct instance, actual User ID. User-reported dashboard access alone does not resolve that ID or prove these checks.
3. The actual signed-in user submits the sandbox application; server records issuer/subject/token identifier from `ctx.auth`, never form input. Dashboard “Act as a user” is not accepted as identity verification.
4. Operator matches that stored subject to the independently checked Clerk subject and approves the exact restricted scope/capabilities. The bootstrap must not query by email and automatically select a candidate.
5. Transaction checks no prior incompatible grant, validates the active synthetic department and pending application, records development-only approval/audit/receipt, and creates one scoped restricted account. No institutional verification, `accessPolicy`, `staffAccounts`, safety or release records are written.

Exact proposed action inputs would be actual sandbox application ID, actual Clerk subject, actual sandbox IT-DEMO ID, tracking reference DEMO-ADMIN-20261026-001, separately approved development policy revision and expected application revision. Name, email, capabilities, role and scope bounds come from checked server data and fixed reviewed policy, not a client-selected privileged grant. Resolved IDs are currently unavailable because neither the component nor its records exist. Temporary operator configuration would be removed after a successful future grant; the permanent receipt remains.

## Validation plan before execution

1. Reconfirm target and read-only record snapshot; stop on changed/conflicting data. Preserve unrelated Git/native/authentication work.
2. Resolve and independently verify Clerk identity through authorized Dashboard access; no passwords, codes, session tokens or secret keys in chat/logs. Test real authenticated subject matching separately from mocks.
3. Review institutional-vs-development classification, exact permissions and operator authority. Draft/generated references are rejected as institutional evidence. Choose a path explicitly; neither is executable at present.
4. If the development alternative is approved for implementation: use local component/convex-test isolation tests first. Check anonymous denial, wrong subject/issuer/email verification, self-review/self-approval/self-change denial, wrong department, pending/suspended/revoked denial, revision races and grant escalation. Confirm component accounts cannot access institutional APIs and production/unknown deployment cannot enable the component.
5. Check immutable audit surface, subject-bound unique account, duplicate/changed-scope bootstrap rejection, concurrent/exact retry behavior, suspension preserved on retry, and last-admin protection. Verify no component function writes institutional or safety/release records.
6. Typecheck/lint and existing staff/safety regressions must pass before any later approved development deployment. No production deployment is included.
7. Immediately before a future authorized grant, show actual resolved IDs, reviewed policy, all exact record changes and rollback/access-revocation procedure. Revocation must preserve audit/receipt and must not reset bootstrap history. Never use a same-deployment data restore as a rollback for unrelated work.
8. After a future grant, execute live native/web checks separately: permitted IT-DEMO administration; out-of-scope and operational/safety denial; same-session revocation; sign-out denial. Report live results separately from mocked tests.

## Current statuses

- PASS: Read-only live record inspection and local implementation/permission review completed; no duplicate compatible records exist in the inspected tables.
- PASS: Executed `npm run typecheck` and `npm run lint`, both exit 0; `node node_modules/vitest/vitest.mjs run tests/backend/staff.test.ts` passed **30/30** tests. These use mocked identities/local Convex test data; no live bootstrap was invoked. `git diff --check` passed for tracked changes. No new app/backend source or package changes required additional regression tests in this preparation-only task.
- BLOCKED: Institutional bootstrap needs genuine approval/identity evidence and a broader grant review; current draft inputs do not satisfy it.
- BLOCKED: Actual Clerk identity linkage requires an independently observed trusted check and real authenticated application.
- NOT IMPLEMENTED: Isolated development component, its internal bootstrap and development-only policy model. This is a review proposal, not an installed feature.
- NOT TESTED: Any live administrator grant, permissions after provisioning, development-component behavior or safety/release acceptance.

No execution command is supplied because execution is explicitly out of scope. The original institutional bootstrap remains unchanged.
