# Private submission queue loading

28 October 2026. This continues report recovery and revision-bound receipts. It does not enable protected offline access or change backend publication rules.

## Verified receipt batches

The publication coordinator previously emitted an updated queue after verifying each older stored receipt. With several older receipts, the first update could therefore expose later, unverified rows as confirmed. If a later lookup failed, loading stopped after that partial display.

Loading now verifies the stored batch before emitting it. Successfully verified rows can be durably upgraded during the process, but no partial batch is exposed. On retry, those durable upgrades are retained and only remaining receipts need verification. A final read rejects any newly introduced unbound receipt. Other queue updates also withhold a batch containing unverified confirmed rows. Concurrent loads share one verification operation.

## Recoverable loading failures

`PublicationQueueLoader` distinguishes loading, ready, failed and paused states. A foreground storage/receipt failure stops automatic loading and offers **Reload private queue**. The loader coalesces repeated reloads, checks that its authorized session is current, suppresses results after backgrounding/unmount and resumes a paused load in the foreground. A transport error that arrives after backgrounding becomes paused rather than a hidden failed state.

Reloading does not clear queue data or reset submission, receipt-check or explicit recovery budgets. It only runs the load/verification operation. Once ready, the existing foreground replay loop may resume previously authorized, due attempts under the same limits. A successful send clears the obsolete global transport error; each remaining failed entry retains its own error.

The queue screen hides counters, empty-state claims and report rows until loading succeeds. Queue readiness uses informational styling and is separate from a report's confirmed receipt. The report review screen exposes the same loader/error/reload component and keeps native submission disabled until its queue is ready. Web retains its existing direct, authenticated server publication path.

## Review

Open `/design-system?example=queue-loading` during development. It uses the actual loader and shared availability component with fictional delayed reads: first-load failure followed by recovery, persistent incomplete data, and a ready queue. It never accesses SecureStore or server report data and never submits a report.

Implementation: `src/domain/publication-coordinator.ts`, `publication-queue-loader.ts`, `src/features/staff/report-queue.tsx`, `queue-availability.tsx`, and `reporting-journey.tsx`. [Validation evidence](../validation/current/QUEUE_LOADING_INTEGRATION_2026-10-28.md).

Authenticated native queue initialization, actual SecureStore failure injection, lost-response/photo/restart journeys and iOS remain open. Existing conflicts still require reviewing the current server report; this pass does not add an archive/delete action or discard their retained attempt history.
