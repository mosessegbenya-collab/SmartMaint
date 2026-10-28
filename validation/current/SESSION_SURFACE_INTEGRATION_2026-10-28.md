# Session restoration surface evidence

28 October 2026. This continues public welcome restoration by bringing the protected-route waiting state into the shared design system.

## Checks

- `npm test`: **277 tests**, 44 domain/UI and 233 backend across 25 backend files. [Log](session-surface-tests-2026-10-28.log).
- `npm run typecheck`: [passed](session-surface-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](session-surface-lint-2026-10-28.log).

Existing layout-boundary tests now assert that protected destinations render `SessionRestoration` with the actual timeout value and unchanged retry callback. They continue checking exact public/development exceptions, loaded navigation and the closed workspace guard during restoration, including retained synthetic account state. No new backend behavior was introduced.

## Actual Android route

Android 15/API35, Pixel_API35, emulator-5554, current bundle 2,182 modules. The original plain surface and poor status-bar contrast are visible in the [prior protected-route capture](welcome-restoration-2026-10-28-protected.png).

The following captures were visually inspected and have JSON/XML sidecars with fresh hierarchy and source fingerprints. They show the actual `/flow/live-task` restoration gate while the configured identity provider is unresolved, not an invented maintenance task.

| Check | Evidence |
| --- | --- |
| At 1080 by 2400 and font scale 1.0, the gate uses shared branding/card/notice and dark status-bar text on the light background | [Light timeout](session-surface-2026-10-28-light.png) |
| Retry returns to initial checking, removes timeout controls and reveals no protected content | [Checking](session-surface-2026-10-28-checking.png) |
| At 840 by 1800, density 420 (320 dp width), system dark mode and font scale 2.0, the actual gate wraps its title/body/notice | [Compact dark top](session-surface-2026-10-28-final-compact-top.png) |
| Scrolling reaches the full retry button and complete access explanation at the same compact large-text settings | [Compact dark retry](session-surface-2026-10-28-final-compact-retry.png) |

Text and controls are readable without product-content overlap in these states. The developer Tools overlay is not product UI. Its overlap with the brand is excluded from the product layout assessment.

An initial theme-control attempt did not find the control. The unprefixed dark/system-dark/compact captures therefore do not establish the intended gate state; one shows the development catalogue after delayed deep-link handling. The final compact captures above were taken only after a fresh hierarchy confirmed the actual restoration title and content. No stale hierarchy was reused.

Before viewport testing, the device reported physical size 1080 by 2400, physical density 420, font scale 1.0 and night mode no. The viewport override was reset, font scale restored to 1.0 and night mode restored to no after capture. Native DNS failures to the development backend remain an environmental limitation; the surface change does not claim to fix provider connectivity.

## Remaining acceptance

No authentication or authorization was bypassed. There was no backend/deployment/schema/dependency/account-policy change. Live successful sign-in and staff workflows, screen-reader traversal, iOS, protected offline operation, all 73 exact-reference acceptances and signed distribution remain open. The full goal remains active. [Implementation contract](../../docs/SESSION_SURFACE_INTEGRATION.md).
