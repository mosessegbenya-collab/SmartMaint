# Clerk authentication

Updated 2026-10-25. Existing SDK: `@clerk/expo` 4.13.0, Expo 57.0.31. The existing Clerk application and keys were preserved. See [current audit, verification and operator procedure](AUTH_SECURITY_AUDIT_2026-10-25.md) for authoritative status and next actions.

## Implemented

- Custom email/password sign-in and registration using the installed Clerk APIs, preserving the SmartMaint layout. Registration verifies email by code when Clerk requires it.
- Registration stores requested name, Staff ID, department and role as untrusted hints. After Clerk verification, the separate backend staff application requires explicit submission; metadata never grants capabilities.
- Code verification, 30-second resend cooldown, change-email escape path, loading locks and visible API/connection errors. Expired/incorrect codes remain errors; navigation occurs only after successful finalization.
- Supported additional verification challenges (email, authenticator and backup codes) are offered only when Clerk reports them for the attempt. Unsupported factors and pending session tasks keep access locked and show an explanation.
- Session tokens use Clerk's secure token cache. The initial UI waits for session restoration. Sign-out invokes Clerk, and preview records are discarded when the real session changes.
- Google/Apple launch components were removed. Historical callback routes remain for existing links and session tasks; their sign-in/sign-up links use the custom email/password screens.
- Password recovery verifies an email reset code before accepting a new password, requests revocation of other sessions, and handles any remaining Clerk challenge before session finalization. The access-screen biometric probe is disabled; no biometric sign-in was added.

## Identity and staff approval

Clerk authentication proves identity. The existing Convex development deployment was synced and signed-out denial verified on 2026-10-25. It has no staff accounts, applications, departments or access policy. Live staff access remains locked pending institutional setup and authenticated integration verification. Neither unsafe metadata nor client-selected roles can unlock records.

Synthetic preview remains available while signed out in development or with explicit preview opt-in. It contains fictional in-memory records. A real Clerk session disables that entry and is isolated from preview data.

## Configuration

Confirm Native API, email/password authentication and email verification codes in the existing Clerk Dashboard. Keep `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` unchanged. Only the publishable key belongs in the mobile client; **do not add a Clerk secret key to client code or any `EXPO_PUBLIC_*` variable**.

Enable email/password sign-up and sign-in, with codes for verification, reset and any required device trust. Disable social and primary passwordless sign-in methods if enforcing the requested email/password-only policy across all clients. Additional required profile fields, invitation restrictions, legal consent, MFA enrollment or organization tasks may require further UI; unsupported requirements produce an explanation and never grant authorization.

Clerk account ownership and authentication settings still require Dashboard confirmation. The historical CLI Doctor reported no CLI login/linked application; this is separate from the configured client publishable key and is not ownership evidence.

No CLI login, application switching, key pull, account creation or provider-setting changes were performed automatically.

## Manual acceptance

1. Open Staff Sign In and enter your own registered email and password. Complete any required device-trust/MFA code.
2. Confirm the account-status screen shows the Clerk identity and keeps staff access locked.
3. Restart the app and verify the identity restores. Sign out, restart, and verify the signed-out state remains.
4. Register with an email you own; verify it, then confirm the requested role grants no workspace access.
5. Try an incorrect/expired code, resend after the cooldown, change email, and test offline errors.
6. Open password recovery, request and verify a reset code, set a matching new password, and confirm other sessions are revoked. Confirm the old password fails and staff access still requires approval.

No existing-application test user was created. Real code delivery, successful authentication, MFA, sign-out and restart persistence must be verified with an owned account; static checks and rendered forms do not establish these passes.

Historical native retests encountered Metro watcher timeouts and Android/Expo Go ANRs. The 2026-10-25 Android export passed, but there is no accepted device screenshot or real authentication test of the latest password UI. See the current audit for exact results; older `VALIDATION.md` entries are historical.

References: [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [email/password custom flows](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password), [password recovery](https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password).
