# First administrator setup readiness

**Current outcome:** the user later explicitly authorized demo setup, supplied a real authenticated application, and the development-only administrator was provisioned. The normal web workspace is user-confirmed working. See [the implemented demo report](DEVELOPMENT_DEMO_2026-10-26.md); the prerequisite findings below are historical and are not current demo blockers.

Follow-up: the user supplied explicitly synthetic department/staff labels and draft references. See the [review-only bootstrap proposal](ADMINISTRATOR_BOOTSTRAP_REVIEW_2026-10-26.md) for the newer live snapshot, exact current grant, remaining institutional evidence gaps and isolated development alternative. No provisioning was executed.

Read-only live check: 26 October 2026, 17:59 UTC. Target: existing development deployment `greedy-bat-971`. No production operations, deployment, policy configuration, department provisioning, application submission or account grants were performed.

## Confirmed state

| Status | Check | Result |
| --- | --- | --- |
| PASS | Existing internal provisioning implementation inspected | `operator:bootstrapAdministrator` already exists; no replacement endpoint is needed. |
| PASS | Live prerequisite query executed | No active departments, access policy, staff accounts or application matching the intended administrator email were found. Bootstrap is not completed. |
| PASS | Existing deployment selection | Local deployment and mobile URL match the retained development deployment. |
| BLOCKED | Clerk administrative identity verification | No connected Clerk administrative tool or local Clerk secret key is available. The earlier live session proved a verified identity, but the setup still needs an independently checked actual Clerk subject matched to an authenticated staff application. |
| BLOCKED | Institutional setup inputs | Approved department codes/names, administrator department scope, approval/policy reference and verified staff identity have not been supplied. |
| BLOCKED | First-administrator grant | Required policy, department and authenticated application prerequisites are absent. No grant attempted. |
| NOT TESTED | Live administrator access | No administrator exists in the checked development database. |

The intended address `moses.segbenya@ucc.edu.gh` is a provisioning target, not identity evidence. This is the first-administrator procedure; it cannot be reused to silently grant another identity. The existing internal function checks the authenticated application's verified-email record, exact Clerk subject allowlist, approved policy, verified staff ID, explicit active department scope, and retry receipt. Credentials are never placed in the mobile app.

## Information needed to prepare the actual operation

- Real approved department code(s) and name(s).
- Which of those departments this administrator is authorized to manage.
- Full name and staff ID checked against institutional records.
- Actual approval reference authorizing the first administrator, and actual policy reference approving `smartmaint-role-policy-v1` and manual staff verification.
- Trusted confirmation of the existing Clerk development user's primary email verification and actual User ID, obtained through the existing application's Dashboard or another trusted server-side process. Do not paste secret keys, passwords, codes or tokens into chat.

After those inputs are reviewed, configure the approved departments and policy through existing internal operator functions, have the intended person submit the authenticated staff application, and match its subject to the independently verified Clerk user. Prepare the exact bootstrap arguments for review using the procedure in [the security audit](AUTH_SECURITY_AUDIT_2026-10-25.md). Never invent a user or registration request to bypass the app submission. Remove both temporary bootstrap settings after a successful audited grant.

## Documentation checked

- [Clerk server-side user lookup](https://clerk.com/docs/reference/backend/user/get-user-list).
- [Clerk user management](https://clerk.com/docs/guides/users/managing).
- [Convex Clerk integration](https://docs.convex.dev/auth/clerk).

Clerk's general metadata-based RBAC example is not substituted for this project's existing Convex staff authorization. A Clerk metadata edit alone would not satisfy SmartMaint's authorization checks.
