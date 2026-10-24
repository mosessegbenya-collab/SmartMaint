# Prepared live integration - not executed

The current workspace has source-derived typed Convex references. It has no selected deployment, generated deployment bindings, verified deployed issuer or approved institutional access/safety policy. Existing public Clerk configuration is preserved. No external resource was created or deployed.

## Inputs from the authorized owner

1. Select an **existing development deployment**, supplying its `CONVEX_DEPLOYMENT` selection and corresponding `EXPO_PUBLIC_CONVEX_URL`. Provide permission to push the reviewed schema/functions to that named development deployment. Production deployment requires separate, explicit authorization: `convex deploy` can target production even when `CONVEX_DEPLOYMENT` names a development deployment.
2. Confirm the existing Clerk application's issuer and Convex JWT template/audience `convex`, with actual verified email claims. `CLERK_JWT_ISSUER_DOMAIN` must be configured on the selected Convex deployment. A local variable's presence does not prove deployment configuration or token verification. Do not provide session tokens, secret keys or credentials in chat/artifacts.
3. Separately approve institutional departments, role/verification policy, authorized test identities and the operator/bootstrap procedure in `STAFF_ACCESS.md`. Until then, staff verification stays disabled and no administrator is bootstrapped. Authenticated pending/denied states can be tested before staff access is approved.
4. Safety verification/release needs separate approved equipment-specific checklists, independent-verifier/evidence rules and hold-clearance/release authority. No mock test policy is suitable for a live deployment.

## Concrete commands after deployment authorization

The owner places the selected development deployment and public URL in the approved local environment; keep deployment-only settings out of `EXPO_PUBLIC_*` variables. Use the installed CLI, not a new package version.

```powershell
node scripts/integration-preflight.cjs --strict
# Only after explicit authorization for this selected development deployment:
npx.cmd --no-install convex dev --once --typecheck enable
npx.cmd --no-install convex codegen --typecheck enable
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
```

The `dev --once` command pushes schema/functions and may change remote data validation; it is not a read-only setup check. An authorized operator must set the actual approved issuer using the selected deployment's environment settings and verify the audience/email claims with the app. Commands above do not configure institutional policy or bootstrap staff. Do not run `operator:*` functions as a shortcut to acceptance.

Before authorization, `node scripts/integration-preflight.cjs` is read-only and prints names/presence/shape only. `convex codegen --dry-run --typecheck enable` was attempted locally and stopped because `CONVEX_DEPLOYMENT` is missing; no deployment success is claimed. Deployed JWT verification requires an actual authenticated request, not a syntactically valid URL.

## Live acceptance record

Use two separately authorized staff accounts plus another department and an operator-controlled revocation scenario. Never record raw tokens or identifying patient data. Record source fingerprint (`node scripts/validation-state.cjs`), deployment identifier, platform, scenario, redacted report/operation references, screenshots, server audit counts and outcome.

| Journey | Required assertion |
| --- | --- |
| Signed out / pending / unverified email | Protected queries and mutations denied; no synthetic account enters live mode |
| Approved account / reconnect | Fresh resolver result and current department/capabilities required |
| Draft create and lost create response | Same account/operation returns one report; no notification or maintenance before publish |
| Draft edit and lost edit response | Identical immediate retry returns same revision; differing concurrent fields require explicit review |
| Upload and lost finalization response | Exactly one attachment; committed storage blob remains readable; no public URL |
| Upload denied / revoked mid-upload | No accepted attachment; uncertain stored blob retained until safely reconciled |
| Photo removal / restart | Latest attachment revision reflected; no stale review publishes; pending local evidence stays visible |
| Publish and lost receipt | Retry same report/revisions; one submission notification and audit event; matching report ID required |
| Conflict | Field or attachment revision change blocks publish and automatic replay |
| Offline / reconnect / retry limit | No fresh offline staff grant; local copies retained; replay requires fresh approval and bounded foreground attempts |
| Account switch / sign-out / expiry | Other owner cannot list/read/replay recovery; old in-flight response cannot populate the new session |
| Suspension / revocation / scope reduction | New requests denied; protected state/cache closes; no stale-grant replay |

Assignment, verification, holds and release journeys then follow the approved role/policy matrix. They remain blocked until their real institutional prerequisites exist.

Primary references reviewed: [Convex Clerk integration](https://docs.convex.dev/auth/clerk), [Convex CLI](https://docs.convex.dev/cli/overview). Installed CLI help was also checked for `dev`, `deploy` and `codegen` behavior.
