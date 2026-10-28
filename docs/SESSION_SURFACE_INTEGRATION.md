# Protected-route session restoration

28 October 2026. Protected routes now use a branded, scrollable restoration surface instead of the plain full-screen spinner. The previous surface inherited an unsuitable system-bar appearance when the normal navigation tree was absent.

`SessionRestoration` uses the shared palette, typography, card, warning notice, button and authentication header. It sets status-bar text for the current appearance and applies safe-area insets. Brand, explanation, timeout and retry all sit inside one scrollable area, so larger text and short viewports do not hide the recovery action.

This component is presentation only. It has no navigation controls, identity/token persistence or protected-data hooks. The session boundary passes the existing timeout and retry callback. Initial checking has no retry control; timeout introduces the warning and retry. The existing public-welcome/development-tool exceptions, identity restoration checks, workspace guards and staff/backend authorization remain unchanged. The explanation distinguishes restoring identity from approval of staff access.

[Validation evidence](../validation/current/SESSION_SURFACE_INTEGRATION_2026-10-28.md) covers the actual gated Android route, retry, light appearance and a compact dark viewport with 200% system text. No backend, deployment, dependency, account approval or institutional policy changed. Successful live sign-in, screen-reader behavior and iOS remain unverified.

Version references consulted: [SDK57 StatusBar](https://docs.expo.dev/versions/v57.0.0/sdk/status-bar/), [SDK57 safe-area-context](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/) and [React Native 0.86 ScrollView](https://reactnative.dev/docs/0.86/scrollview).
