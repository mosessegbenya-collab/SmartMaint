# Verified-identity mismatch trace

Current source was re-read, including AGENTS.md, the working Git diff, the installed Expo 57.0.31 / Clerk Expo 4.13.0 / Convex 1.47.0 packages, Convex's backend guidance, and official authentication documentation.

## Established facts

- Clerk's user resource and the signed JWT are separate evidence. A verified primary email in Clerk's UI does not prove that the JWT includes `email` and boolean `email_verified`.
- The installed Convex Clerk provider requests a session token when session audience is `convex`; otherwise it requests the legacy named template. The corrected refresh uses the newly reloaded session's audience and `skipCache: true`.
- Convex documents and types map signed `email_verified` to `UserIdentity.emailVerified`. Both `staff.resolve` and the backend access helper demand `emailVerified === true` and a string `email`. They do not coerce strings or accept a client verification flag. No change to those requirements was made.
- Account refresh reloads the user and session, clears the token cache, obtains uncached claims, then replaces the reactive Convex client. The resolver receives a new query key. This is distinct from confirming the content of the resulting authenticated identity.
- Fresh external configuration audit (`node scripts/identity-config-check.cjs`, network-enabled): `development_target_expected`, `clerk_key_present`, `issuer_expected`, `issuer_keys_available`. Raw issuer/key/environment values were not printed. These facts establish configuration consistency, not an authenticated token test.
- A caller-only `auth_diagnostics:inspect` query is available on the existing development backend. A fresh signed-out request returned `unauthenticated`, with all email claim types `missing`. The query reads only `ctx.auth.getUserIdentity()` and has no database reads/writes. Two existing Convex development watchers were detected; generated API bindings and the endpoint were synced by that running development workflow, rather than manually editing generated files. No manual deployment command was issued for this diagnostic addition.

## Authenticated diagnostic

The development Account access screen offers **Check identity connection**. It reloads Clerk user/session data, clears the token cache, acquires a fresh token, compares issuer/audience/expiry/primary email in memory and makes fresh HTTP requests to both the diagnostic endpoint and `staff.resolve` using that same token. It bypasses reactive query caching. Output is limited to fixed status codes and the names/types of selected claims. No token, cookie, callback data, identity identifier or claim value is logged, persisted or returned in the diagnostic UI.

The expected claim representations are:

| Location | Email | Verification |
| --- | --- | --- |
| Signed Clerk JWT | `email: string` | `email_verified: boolean` |
| Convex identity | `email: string` | `emailVerified: boolean` |

The user supplied the authenticated block, recorded verbatim as status codes and claim types only in `identity-authenticated.json`. It confirms expected issuer/audience, current token, matching primary email, boolean verified claim, backend `verified_identity`, and fresh resolver `no_application`, while the reactive account screen still showed `identity_unverified`. No Clerk claim-definition change is indicated by this evidence. The missing camelCase field in the JWT and missing snake_case field in Convex are the expected standard mapping, not defects.

## Demonstrated cause and fix

The account screen was retaining a stale reactive connection/result. The service fetched fresh identity/token data but did not itself invalidate the reactive backend. That handoff belonged to account-screen code; in the verified-email flow it was guarded by `active.current`. Authorization/status changes can remount that screen through `SessionBoundary`'s authorization-based key, causing the awaited refresh to skip the guarded handoff. A newly correct signed HTTP request therefore could disagree with the old reactive result.

The handoff now belongs to the stable ClerkIdentity owner. After successful uncached token acquisition, `refreshIdentityClaims` calls its required `reconnect` port. ClerkIdentity advances an in-memory refresh revision; StaffAccessProvider includes that revision in its client key. This replaces the authenticated Convex client and its resolver, with the existing new query key and fail-closed loading state. Account-screen lifetime no longer controls invalidation. Both refresh buttons use this single path; child-owned duplicate retries were removed. Token/authorization requirements and institutional gates are unchanged.

`stale-identity-before.log` records the regression failing before the fix: the fresh-identity service never called the owner reconnect port after the simulated account screen unmounted. The fixed test requires that callback and the resulting resolution update. Existing token-selection, request ordering, missing-template failure and authorization-negative assertions remain in force.

## Validation and limits

- Five new tests cover caller-only diagnostics, omission of claim values, missing/incorrect claim types, signed-out and forged arguments, configured issuer comparison, fresh request ordering and continued refusal of workspace operations for a verified unapproved identity.
- The first test run (`identity-before.log`) failed because the new diagnostic module did not exist yet. This is evidence of diagnostic capability being added, not proof of the original live mismatch.
- Initial typecheck found the shared Txt wrapper does not accept `selectable`. Corrected to the native Text API, with the current palette and font scaling retained. Subsequent lint/typecheck passed.
- Validation before the lifecycle fix: 39 domain tests and 156 backend/client tests passed. Focused identity/account/staff tests: 47 passed. Fresh validation after the lifecycle fix: lint/typecheck pass; full test command passes with 39 domain tests and 157 backend/client tests (196 total), including the new previously failing reconnect regression. Logs: `identity-tests.log`, `identity-lint.log`, and `identity-typecheck.log`.
- Backend auth configuration and schema are unchanged by this addition. No migration, staff account, role grant, administrator bootstrap, policy or safety-control activation was performed.
- The authenticated diagnostic confirms a live verified identity with `no_application`, hence no approved staff grant. Fresh sign-in, corrected reactive screen behavior and a direct workspace-denial check remain pending user execution. Mocked identities in convex-test alone do not prove JWT signature/issuer validation or live approval state.

Official sources: [Convex identities](https://docs.convex.dev/auth/functions-auth), [Clerk Convex integration and claims](https://clerk.com/docs/guides/development/integrations/databases/convex), [Clerk session customization](https://clerk.com/docs/guides/sessions/customize-session-tokens), [Expo 57](https://docs.expo.dev/versions/v57.0.0/).
