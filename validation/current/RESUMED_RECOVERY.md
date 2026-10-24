# Recovery continuation - 2026-10-24

**Continued and superseded by [the fresh acceptance pass](FINAL_ACCEPTANCE_PASS.md):** further recovery fixes, 139 passing tests, 52 mock render checks, final platform exports, actual Android restart/offline storage evidence and 73-route capture attempts. The results below are the earlier checkpoint and remain historical.

Continued the unfinished encrypted draft/photo recovery and publication retry pass. Existing workspace edits were preserved.

## Corrections

- A photo-index write can commit and still reject if its completion is lost. Recovery now checks the committed index before removing the photo, and retains uncertain evidence if that index cannot be read.
- Recovered equipment and department identifiers cannot be reassigned while retaining the same draft/photo operations.
- Device recovery links for saved server drafts open the server draft so current revisions can be compared. Keeping the current form explicitly saves it under the recovered operation, preserving pending photos.
- A successful server save updates the form's report/revision state before attempting device persistence. Device storage failure therefore does not leave the form using the previous revision.
- Both save actions enforce revision-conflict review. Photo review and submission require pending photos to be uploaded or removed; review also checks encrypted recovery for remaining attachments.

## Verification

Final command results are recorded in `resumed-lint.log`, `resumed-typecheck.log` and `resumed-tests.log` in this directory. Four new recovery tests cover committed-but-rejected writes, genuinely failed writes, unreadable uncertain indexes and department identity preservation. These use a Node AES-GCM adapter and do not establish native encryption behavior.

- `npm.cmd test`: 123 passed (33 domain/UI regression checks and 90 backend/client/storage tests).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint` with `EXPO_OFFLINE=1` and `EXPO_NO_TELEMETRY=1`: passed; see `resumed-lint-offline.log`. The ordinary final invocation stalled without a result, so the offline invocation was used for the final check.
- `node artifacts/check-screen-renders.cjs`: 50 light/dark mock render cases passed; controls and backend hooks were stubbed. This suite does not exercise the new recovery interactions.

## Acceptance limits

ADB started successfully outside the sandbox, but `adb devices` returned no connected devices. No fresh native restart, camera, accessibility or screenshot acceptance is claimed.

Local configuration preflight found the Clerk publishable key, but no Convex public URL, deployment selection or Clerk JWT issuer. No deployment, staff approval, bootstrap or institutional policy was enabled. Full offline protected access and live authenticated recovery remain unaccepted.
