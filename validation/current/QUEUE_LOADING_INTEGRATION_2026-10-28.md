# Private queue loading evidence

28 October 2026. This iteration corrects receipt-display and loader-recovery defects within the active full-product objective.

## Reproduce and verify

Two new regression tests failed against the original coordinator: one load exposed a later unverified receipt before a network failure, and concurrent loads verified the same receipt twice. [Before-change failures](queue-loading-before-2026-10-28.log).

Final checks passed:

- `npm test`: **260 tests** (44 domain/UI and 216 backend across 22 backend files). [Log](queue-loading-tests-2026-10-28.log).
- `npm run typecheck`: [passed](queue-loading-typecheck-2026-10-28.log).
- `npm run lint -- --no-cache`: [passed](queue-loading-lint-2026-10-28.log).
- Source/documentation whitespace check passed; runtime process logs are excluded from that source check.

The coordinator suite now has 24 tests. New cases prove no partial receipt emission on later network failure or authorization loss, one shared concurrent load, retained durable verification on retry, no sends during loading, and preserved exhausted submission/reconciliation/recovery budgets after storage reload. Four loader tests cover explicit retry after failure, concurrent reload taps, authorization/background guards and foreground resume after a background transport failure.

These tests use the real domain coordinator, chunked queue and loader against an in-memory private-store adapter and mocked receipt callbacks. They do not establish native SecureStore error behavior or live authenticated publication.

## Android component checks

Android 15/API35, emulator-5554, 1080 by 2400, system font scale 1.0. The following screenshots were captured from the final implementation and visually inspected. JSON/XML sidecars carry source fingerprints and current UI hierarchy. The development preview uses the actual loader and availability component with fictional read results.

| Check | Evidence |
| --- | --- |
| First-load error explains preserved attempts and offers explicit reload | [Failed](queue-loading-final-2026-10-28-failed.png) |
| Reload clears the error, shows two loads and zero submissions; readiness is informational | [Recovered](queue-loading-final-2026-10-28-reloaded.png) |
| Incomplete data remains unavailable after explicit reload, with two loads and zero submissions | [Incomplete retry](queue-loading-final-2026-10-28-incomplete-retry.png) |
| Error/reload controls remain readable in dark appearance with the app's larger-text option | [Dark failure](queue-loading-final-2026-10-28-dark-large.png) |
| The same recovery succeeds in dark appearance without reporting a confirmed report receipt | [Dark recovery](queue-loading-final-2026-10-28-dark-reloaded.png) |

Earlier unprefixed captures used an intermediate preview lifecycle and are not the final evidence above. The first incomplete-data capture was taken during a layout transition; the settled retry capture is used instead. One later catalogue hierarchy request failed its idle check; a fresh hierarchy was obtained before further interaction. No stale dump was reused.

No real private queue or server receipt was read, no real report was submitted, and no deployment, schema, dependency or institutional policy changed during this pass. Existing native storage/restart evidence from earlier passes remains separate.

## Remaining acceptance

Live authenticated queue startup and concurrent-session receipt checks, actual native SecureStore failures, report/photo/restart journeys, iOS and screen-reader traversal remain unverified. Full protected offline operation, institution-approved policies, all 73 exact-reference acceptances and signed distribution remain open. The full goal is not complete. [Implementation contract](../../docs/QUEUE_LOADING_INTEGRATION.md).
