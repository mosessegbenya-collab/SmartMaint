# Six-finding corrective review — fresh validation

Checkout inspected before edits: `c1cb65cbf2246c48110fe252a66b859d357736ad` (2026-10-24).
`89a20d6` is an ancestor; staged and unstaged diffs were empty. Findings were verified against local source, not provisional review line numbers. Changes are uncommitted and unpushed.

## Finding disposition

| Finding | Confirmed evidence on original implementation | Fix and current evidence |
| --- | --- | --- |
| 1. Unresolved repair chains | Both multi-repair and cancelled-rework tests incorrectly returned eligible. `before-safety.log`. | **Fixed.** Check every recorded repair chain, current required verification on each completed terminal repair, immutable linked failure references, open/cancelled rework, incomplete ancestry and cycles. An unrelated verified task cannot discharge another chain. Successful linked rework is tested as a positive case. |
| 2. Verification after reassignment | A recorded work, B was assigned and completed, and A's verification was accepted. `before-safety.log`. | **Fixed.** Current assignee plus every recorded work-entry actor are excluded by verification mutation, context, recipient selection, request mutation, verifier queue and legacy verification guard. A is denied and C is permitted; existing verification passes are also checked against contributor history at release. |
| 3. Stale release confirmation | Old confirmations succeeded after policy/check replacement, another verification, another completed task of the same revision, and a hold raised then resolved. Four failures in `before-safety.log`. | **Fixed.** Canonically sorted, SHA-256 evidence snapshot covers equipment, complete active policy including identity/version/checks, all tasks/revisions, work history, all verification attempts, submitted reports, and all hold history. The release transaction recomputes and compares the opaque snapshot. Release validity uses the same snapshot. The confirmation component remounts when it changes, closing an obsolete modal. |
| 4. Interrupted final publication | `SYNCING` at attempt five could not proceed; reviewing a failed unchanged snapshot silently restarted its count. `before-fixes.log`. | **Fixed.** Five sends remain the automatic limit. An explicit, read-only receipt check reconciles the same report (maximum three persisted checks). A still-unsubmitted matching draft can receive one separately confirmed, persisted recovery send. Original attempt count and identity remain. Backend-backed before-send and post-commit tests prove one report and one receipt notice. UI distinguishes receipt uncertainty from sending and reports both budgets. |
| 5. Discard at capacity | Discard rejected on ciphertext allocation failure. Cleanup interruption was silently absorbed, losing cleanup intent. `before-fixes.log`. | **Fixed.** Authenticated reduced index and explicit deletion intent commit through small vault chunks without a new recovery-directory file. Only then are selected photo files and the superseded index removed. Interrupted/lost completions resume on next read/restart. Quota, vault allocation failure, interrupted cleanup, uncertain commit, other drafts/owners, orphan preservation, and space recovery are tested. |
| 6. Unavailable pending photo | UI offered no removal confirmation without restoration/decryption. `before-photo-ui.log`. Missing/corrupt photo removal also failed at quota. | **Fixed.** Each pending metadata row has its own confirmation; removal never reads/decrypts that photo. Tests preserve the intact photo and draft, show the remaining photo still blocks publication, and show zero pending photos only after explicitly removing the last one. |

No finding remains blocked in source. Native/live acceptance remains outstanding as described below.

## Policy boundaries

The existing rule in `docs/IMPLEMENTATION.md` requires all current release prerequisites, independent verification, and linked rework after failed/unable decisions. The implementation conservatively includes all recorded repair chains for the equipment. No cancellation waiver, historical-chain exemption, retirement rule, or administrative override has been inferred. Any such exception requires a separately approved institutional policy; until then unresolved chains block release.

No staff policy, safety policy, approval, department, administrator or external service was configured. Tests insert explicitly labelled synthetic policies and identities only in isolated in-memory Convex databases. Existing production approval gates remain in force. There are no new dependencies.

## Tests and fresh results

Executed against the current workspace source after restoring its dependencies:

| Command | Result |
| --- | --- |
| Focused Vitest run: `review-safety`, `publication-coordinator`, `report-recovery`, `corrective` | **68 passed** against the final workspace source; `focused-fixes.log`. |
| `npm.cmd test` | **38 domain/UI tests + 123 backend/client tests passed**; `full-tests.log`. |
| `npm.cmd run lint` | **Passed, no warnings/errors**; `lint.log`. |
| `npm.cmd run typecheck` | **Passed**; `typecheck.log`. |
| Git whitespace check with `cr-at-eol` | **Passed**; existing Windows line endings are respected. |
| `adb devices -l` | No connected devices. No current native screen, build, interaction or live-backend acceptance claimed. |

Regression additions: `tests/backend/review-safety.test.ts` (8 cases), `publication-coordinator.test.ts` (5), `report-recovery.test.ts` (6), `corrective.test.ts` (2 backend publication cases), and `tests/pending-photo-removal.test.cjs` (1 UI interaction case): **22 new cases**. The existing release test now additionally asserts stale confirmation rejection and obtains a fresh snapshot before another release; assertions were not relaxed.

Baseline evidence is distinct from fix validation. `before-safety.log` has seven assertion failures demonstrating findings 1–3. `before-photo-ui.log` demonstrates the missing control using the final UI harness. `before-fixes.log` has six behavior failures demonstrating offline defects and an additional dependency-related safety suite startup failure; that startup failure is **not** counted as defect confirmation. The later isolated safety baseline resolved that infrastructure failure. Final review found and corrected a reconciliation conflict-state edge case; `reconciliation-conflict-before.log` records its failing regression before that correction. Positive/boundary tests added afterward validate the fix; they are not represented as additional pre-fix reproductions.

The UI harness initially omitted department metadata and reran effects without modelling dependencies. Those fixture errors were corrected, preserving the original removal and publication-eligibility assertions; the final harness was rerun against both original and fixed UI source.

The initial dependency tree was incomplete. Shared-workspace `npm ci` encountered `ENOTEMPTY` and conflicting concurrent npm activity. An isolated lockfile install completed successfully, then its dependencies were moved back into the workspace. Original/incomplete trees are retained under ignored `artifacts/dependency-lock-backup/*/node_modules`. Per the user's instruction to override concurrent operations, the unrelated temporary change from pinned Convex `1.47.0` to `^1.47.0` was removed. Installed/tested version is `1.47.0`. Package manifests have no task diff. Existing ignored Expo declarations were already present; manual declarations were not fabricated.

`source-manifest.json` records fresh source hashes and HEAD for review. Historical native screenshots and exports were not reused.

## Files changed

- Backend: `convex/safety.ts`, `convex/lib/repair-evidence.ts`, `convex/operations.ts`, `convex/workflows.ts`, `convex/reporting.ts`, `convex/schema.ts`.
- Recovery/queue: `src/domain/authenticated-file-store.ts`, `src/domain/recovery-vault-journal.ts`, `src/domain/report-recovery.ts`, `src/domain/report-queue.ts`, `src/domain/publication-coordinator.ts`.
- Mobile controls: `src/features/staff/safety-screens.tsx`, `src/features/staff/report-photos.tsx`, `src/features/staff/report-queue.tsx`.
- Tests: the five files listed above. Fresh logs, this report and source hashes are in this directory.

## Compatibility and rollout

- `releaseRecords.evidenceSnapshot` is additive and optional for reading old records. An old release lacking this snapshot cannot establish current availability; an approved authorized user must review and record a fresh release. Existing records are preserved. Old clients omitting `expectedEvidence` are rejected rather than granted release.
- Queue counters/flags are optional; legacy queues load without resetting `retryCount`. Persisted exhausted rows gain bounded receipt/recovery behavior. Changed report/photo revisions require fresh content review; unchanged exhausted snapshots cannot get a fresh attempt budget through ordinary enqueue.
- Legacy encrypted file pointers remain readable. Explicit deletion may replace an owner's index with the new encrypted vault-journal pointer format. Old app versions cannot read that format: coordinate rollout and avoid downgrading after using it. No blanket data rewrite or automatic orphan sweep occurs.
- The deletion journal needs small secure-vault writes. It bypasses recovery-directory byte/file allocation quota, but cannot promise successful durable writes if the OS/key vault itself has no allocatable storage or is locked. In that case the error is visible and uncommitted selected evidence is preserved. Native OS-level ENOSPC, keychain limits, and power-loss behavior still need device testing.
- Missing/corrupt photo **content** is removable with an intact authenticated draft index and file pointer. A corrupt owner index, inaccessible vault, or unidentifiable pointer is not silently repaired or deleted. Preserve that evidence for authorized recovery. Missing historical contributor records cannot be reconstructed from identities guessed by the client.
- Large histories are evaluated completely; Convex transaction/read limits fail closed. Archival or policy-approved historical exclusions need a separately designed and approved rule, not silent truncation.

## Exact remaining native/live prerequisites

1. Provide an available Android emulator/device and an iOS simulator/device, a development build of this checkout, and the current Metro bundle. Test actual confirmation modals, A→B reassignment and C verification, evidence changes while the release modal is open, pending-photo recovery/removal, and accessibility/large-text layouts.
2. On actual native secure storage/filesystem adapters, fill the recovery byte/file budget, inject OS allocation/key-vault errors and process termination at journal/cleanup boundaries, restart, and verify remaining drafts/photos/owners and freed space. Independently exercise true device-disk exhaustion. Repeat fifth-send interruption before transport and after server commit with real lifecycle/network transitions. Obtain fresh artifacts for these checks.
3. Supply an explicitly authorized selected Convex test deployment, matching Clerk issuer/audience/JWT mapping, and deploy this schema/functions through an approved operator action. Generate deployment bindings through the supported tooling. No deployment or remote changes were performed here.
4. For protected live workflows, supply institutionally approved staff verification/role/scope policy, real test departments/equipment, nominated independently verified accounts and an authorized first-administrator procedure. Keep staff verification/bootstrap disabled until those approvals and authorization exist.
5. Separately approve the technical/clinical checklists, independent-contributor rules, evidence/hold-clearance and release authority. Configure those policies only after explicit approval, then run the contributor, multi-chain, stale-confirmation and receipt tests against authorized test records. No synthetic test policy constitutes approval.
6. Approve device evidence retention/deletion and rollout/downgrade handling for the new journal format. Full protected offline inventory/access and background reporting are outside these six fixes and remain unaccepted.

Documentation consulted for runtime/API verification: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [Expo Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/), and [Convex runtime Web Crypto support](https://docs.convex.dev/functions/runtimes).
