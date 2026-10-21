# Clerk authentication

Updated 2026-10-21. Existing SDK: `@clerk/expo` 4.13.0. Existing selected application: `app_3KxjxB34kKXb86JgMU7DRYliPuk`. No replacement application was created and no existing keys were changed.

## Implemented

- Custom email verification-code sign-in and registration using the current Clerk APIs, preserving the supplied SmartMaint layout.
- Registration stores requested name, Staff ID, department and role as untrusted hints. After Clerk verification, the separate backend staff application requires explicit submission; metadata never grants capabilities.
- Code verification, 30-second resend cooldown, change-email escape path, loading locks and visible API/connection errors. Expired/incorrect codes remain errors; navigation occurs only after successful finalization.
- Supported additional verification challenges (email, authenticator and backup codes) are offered only when Clerk reports them for the attempt. Unsupported factors and pending session tasks keep access locked and show an explanation.
- Session tokens use Clerk's secure token cache. The initial UI waits for session restoration. Sign-out invokes Clerk, and preview records are discarded when the real session changes.
- Existing Google/Apple browser SSO is preserved. Its callback opens the same account-status screen; these providers still need their own Clerk configuration and a development build for native callbacks.
- Passwordless sign-in help sends a fresh email code. Staff PIN/password reset is not part of the confirmed email-code strategy.

## Identity and staff approval

Clerk authentication proves identity. Convex schema/functions, a trusted staff resolver and review screens now exist in source; see [staff access](STAFF_ACCESS.md). The user confirmed no deployment and no approved verification policy. Live staff access therefore remains locked. Neither public/unsafe metadata nor client-selected roles can unlock records.

Synthetic preview remains available while signed out in development or with explicit preview opt-in. It contains fictional in-memory records. A real Clerk session disables that entry and is isolated from preview data.

## Configuration

The user confirmed Native API and email verification codes are enabled. Keep `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` set for the existing application. Only the publishable key belongs in the mobile client; **do not add a Clerk secret key to client code or any `EXPO_PUBLIC_*` variable**.

Email sign-up/sign-in and verification codes must remain enabled in Clerk. If additional required profile fields, invitation restrictions, legal consent, MFA enrollment or organization session tasks are configured, they may require further UI before that account can finish. The app reports these requirements and never treats them as successful authorization.

Clerk CLI Doctor was run. It reported no CLI login and no linked application, so account-level checks could not run. This is separate from the client SDK's publishable-key setup. If CLI administration is needed, run these yourself in your terminal:

```powershell
npx -y clerk@latest auth login
npx -y clerk@latest link --app app_3KxjxB34kKXb86JgMU7DRYliPuk
```

No CLI login, application switching, key pull, account creation or provider-setting changes were performed automatically.

## Manual acceptance

1. Open Staff Sign In, enter your own registered email, request a code and verify the code you receive.
2. Confirm the account-status screen shows the Clerk identity and keeps staff access locked.
3. Restart the app and verify the identity restores. Sign out, restart, and verify the signed-out state remains.
4. Register with an email you own; verify it, then confirm the requested role grants no workspace access.
5. Try an incorrect/expired code, resend after the cooldown, change email, and test offline errors.

No existing-application test user was created. Real code delivery, successful authentication, MFA, sign-out and restart persistence must be verified with an owned account; static checks and rendered forms do not establish these passes.

Native retest encountered a Metro watcher timeout and Android/Expo Go ANRs. A retry with watching disabled also lost the emulator before rendering. This environment therefore has no accepted screenshot of the latest auth UI. Platform exports, lint, typecheck and automated checks are recorded separately in `VALIDATION.md`.

Reference: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart) and [email-code custom flows](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp?sdk=expo).
