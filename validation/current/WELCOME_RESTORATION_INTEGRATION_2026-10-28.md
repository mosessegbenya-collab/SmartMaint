# Public welcome restoration evidence

28 October 2026. A reference inspection found a startup-state defect before visual acceptance could proceed: identity-service restoration hid the entire public welcome. This iteration makes the public route visible during restoration while preserving protected-route gates.

## Checks

- `npm test`: **277 tests**, 44 domain/UI and 233 backend across 25 backend files. [Log](welcome-restoration-tests-2026-10-28.log).
- `npm run typecheck`: [passed](welcome-restoration-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](welcome-restoration-lint-2026-10-28.log).

Two new tests evaluate the actual layout function bodies with controlled hook values. They prove that only exact `/` and explicit development tools render navigation during restoration; normal access/flow/workspace and unknown destinations wait; normal navigation resumes after identity loads; and the actual workspace Stack.Protected guard stays false with an unfinished identity and even a retained approved synthetic account. These are controlled component-boundary tests, not a native authenticated journey.

## Android observations

Android 15/API35, emulator-5554, 1080 by 2400, current bundle 2,181 modules. The original welcome reference was opened and inspected. It is an iPhone presentation containing fictional equipment, a hero, an introductory panel and account actions. A runtime capture instead showed only restoration/timeout UI. [Before change](welcome-reference-2026-10-28-before.png).

The following screenshots were visually inspected. JSON/XML sidecars carry fresh hierarchy, system font scale and source fingerprints.

| Check | Evidence |
| --- | --- |
| Actual public welcome renders its fictional hero/content while restoration is pending | [Welcome](welcome-restoration-2026-10-28-top.png) |
| Settled timeout appears inline with retry and disabled account actions; tapping disabled Staff Sign In does not navigate | [Timeout](welcome-restoration-2026-10-28-timeout.png) |
| A protected `/flow/live-task` deep link remains behind restoration with no task content | [Protected route](welcome-restoration-2026-10-28-protected.png) |
| Retry restarts checking while the public welcome remains rendered | [Retry](welcome-restoration-2026-10-28-retry.png) |
| At system font scale 2.0, scrolling reaches retry, equipment rows, both disabled account buttons and the fictional-data footer without overlap | [Settled large-text footer](welcome-restoration-2026-10-28-large-final-footer.png) |

The first recovery and large-text captures were taken before the timeout or at intermediate scroll positions; their filenames are not proof of the intended state. The settled timeout and final large-text footer above are the accepted evidence for those specific checks. The font scale was restored to its original 1.0 and read back. The development Tools overlay is not product UI and is not assessed as a reference element.

The welcome remains scrollable; no attempt was made to shrink text to force the static reference into one screen. This pass does not prove exact reference dimensions or state, screen-reader traversal, dark appearance, iOS behavior or successful identity-provider reconnection. No real credentials, staff records or backend decisions were used.

## Scope

Only public presentation and its restoration-state controls changed. No protected route was added to the restoration allowlist, and the existing workspace authorization checks were retained. No backend, deployment, dependency, account approval or institutional policy changed. Live sign-in, all 73 matching-state reference acceptances, full accessibility/platform checks, protected offline work and signed distribution remain open. The full goal stays active. [Implementation contract](../../docs/WELCOME_RESTORATION_INTEGRATION.md).
