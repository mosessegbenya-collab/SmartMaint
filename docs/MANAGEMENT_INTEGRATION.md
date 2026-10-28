# Management analytics and export

Updated 27 October 2026. This continues the shared design-system implementation. Institutional clinical/safety approval is unchanged.

## Complete recorded totals

The primary analytics screen now calculates all authorized records through bounded server pages rather than displaying a capped 100-record overview alongside a separate raw-field calculation. Equipment completeness, reported priorities, open tasks, holds and completed repairs use the same finished calculation. Zero-record sources have explicit zero values; empty inventory displays “No inventory” rather than a fabricated percentage.

Each page reauthorizes the caller and department. Private report drafts contribute neither counts nor identifiers. The client rejects duplicate records, repeated pagination cursors, invalid/overflowed counters and inconsistent totals. A page failure or account change discards the calculation. Users see progress, can cancel, and can recalculate; late responses from a cancelled/replaced calculation cannot publish its result.

This is a calculation across successive reads, not an atomic point-in-time snapshot. Concurrent edits may require a fresh calculation. The earlier bounded home-dashboard summaries remain distinct from this complete analytics flow.

Repair elapsed time uses immutable authored completion entries. Later administrative changes to a task's `updatedAt` cannot inflate it. Legacy completed tasks without an authored completion time remain unknown and are excluded from the average; the screen states how many completed repairs have usable times. This measures work-order creation to recorded completion, not clinical downtime or hands-on effort. Historical release-decision counts do not imply current equipment availability.

## CSV delivery

CSV generation retains its authorized pagination, private-draft exclusion, duplicate detection and 20 MB memory budget. Changing filters or generating a replacement invalidates pending generation/delivery immediately.

Before downloading or choosing a save destination, the app requests a fresh staff resolution and compares account/revision/scope/capabilities with the current approved session. It rechecks after the destination dialog. Android performs another check after creating the destination file and before writing report content. Losing access during that process can leave an empty destination file, but the operation does not write CSV content or report a successful export. A file already delivered to the operating system cannot be recalled by the app.

On iOS, the temporary cache CSV is removed after the share activity completes or fails. A cleanup failure is reported separately. Platform file dialogs and actual live report delivery still require authorized device acceptance; mocked sequencing tests do not establish that outcome.

## Implementation and review

- `src/domain/management-metrics.ts`: complete page collection, cancellation, duplicate/counter consistency checks.
- `convex/extensions.ts`: scoped metric pages, draft identifier exclusion and evidence-based completion timing.
- `src/features/staff/management-analytics.tsx`: primary calculation UI and shared overview.
- `src/domain/export-delivery.ts`, `management-screens.tsx`: delivery sequencing and fresh authorization checks.
- `src/features/design-system/management-preview.tsx`: fictional native review cases using the same overview component. Open `/design-system?example=management` during development, or choose “Preview management analytics” in the component catalogue. Cases cover 12 equipment records, 250 equipment/125 submitted reports and no records. No live staff data is requested by these examples.
- `tests/backend/management-metrics.test.ts`, `corrective.test.ts`: paging, cancellation, draft privacy, revoked access, duration evidence and export sequencing regressions.

The native reference review exposed a shared metric-grid height defect: percentage card heights expanded inside a scrolling grid. The cards now grow with their content and flex row instead. See the current validation report for before/after captures and exact acceptance limits.

Version-specific references: [Expo SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [legacy FileSystem for Android directory access](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem-legacy/) and [React Native 0.86 Share](https://reactnative.dev/docs/0.86/share).
