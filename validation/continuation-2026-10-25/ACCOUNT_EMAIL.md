# Signed-in email verification

The user confirmed the SSO flow reaches Account access. Actual email delivery and verification in that session remain pending; no browser session, email address, callback URL, cookie, code or token was captured or logged for this check.

Installed versions inspected: Expo 57.0.31, Expo Router 57.0.29, @clerk/expo 4.13.0. The installed Clerk EmailAddressResource types support `prepareVerification({ strategy: 'email_code' })` and `attemptVerification({ code })`. Session types support `clearCache()` and `getToken({ template: 'convex', skipCache: true })`.

Confirmed defect: signed-in users with `identity_unverified` had only status refresh/sign-out, with no verification request or code-entry controls. `email-before.log` records the failing route-wiring regression before the implementation. It is distinct from passing verification of the fix.

Implementation:

- Use the existing primary email resource; do not create/change an email, session, staff application, role or approval.
- Provide code request, entry, verification, resend with a 30-second deadline, cancellation, busy-state locking and fixed messages for incorrect/expired codes, throttling, session expiry and connection failures. Code state is cleared after attempts/cancellation and scoped to the session/user/email component lifetime.
- Accept only a `verified` resource result. Reload user/session, invalidate the token cache and request fresh Convex claims before retrying staff resolution. Refresh failures propagate. Token results are discarded without logging or persistence.
- If Clerk already reports the primary email verified, offer refresh and explain the possible JWT-template claim mismatch instead of sending another verification code. The backend still requires both `email` and `email_verified`; nothing relaxes that check.
- Existing independent staff approval, session-task and protected-workspace gates remain in force.

Fresh validation:

- `email-focused.log`: 29 tests pass (10 new account-email tests, 13 client-access tests, 6 SSO tests).
- `email-full-tests.log`: full command passes: 39 domain tests and 148 backend/client tests in 13 files, including the existing safety/recovery regressions.
- `email-lint.log` and `email-typecheck.log`: both pass.
- Query-free HTTP request to `http://localhost:8083/access/pending`: 200. Response body/headers were not printed or saved.
- `email-platform-exports.log`: Android, iOS and web bundles and 17 static routes generated to `artifacts/email-verification-export`; command exit 0. Static rendering opened a Convex WebSocket that repeatedly closed with code 1006, and Expo force-exited after writing artifacts. This is an export lifecycle/network limitation, not clean native or live acceptance. The prior in-progress export (`platform-exports.log`) failed when its module snapshot overlapped the new email component edits; the fresh run resolved the module and completed artifact generation.

Live follow-up: refresh Account access. If Clerk reports an unverified primary email, request a code, enter the newest delivered code and verify. Try resend after the countdown if necessary. If Clerk already reports verified but the staff service remains unverified after refresh, check the development Clerk `convex` JWT template mapping for primary email and its verified claim; do not paste tokens or account details into chat. Successful identity verification must still leave an unapproved account outside the workspace. Native provider round trip, physical devices and assistive technology acceptance remain pending.

No backend deployment, schema change, dependency upgrade, data migration, staff grant or safety-control change is required by this fix.

Official references consulted:

- [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/)
- [Clerk EmailAddress resource](https://clerk.com/docs/react/reference/types/email-address)
- [Clerk custom email verification flow](https://clerk.com/docs/guides/development/custom-flows/account-updates/add-email)
- [Clerk Session token cache and refresh](https://clerk.com/docs/js-frontend/reference/objects/session)
