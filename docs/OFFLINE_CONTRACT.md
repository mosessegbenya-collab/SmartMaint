# Current triage and intended offline contract

2026-10-24. Read AGENTS.md, README.md, VALIDATION.md, docs/, current tests and the complete 73-reference inventory/contact sheets before code changes. Preserve starting changes (validation/current/baseline.patch).

## Original source defects (historical triage)

The items below describe the starting state, not the current acceptance result. The continuation implemented Boolean JSX guards and regression coverage, serialized queue access and per-report sends, write validation, bounded foreground retry/backoff, lifecycle cancellation, encrypted draft/photo recovery and uncertain-write preservation. See `validation/current/FINAL_ACCEPTANCE_PASS.md` for fresh tests and native evidence. Full offline staff access remains disabled.

- Empty string JSX guards (`value && <Component />`) leaked `""` into View children. Prior user changes already replace affected guards with boolean checks in ui.tsx and callers. A persistent regression check is still needed; warnings must not be suppressed.
- Native publication queue has no per-report send lock or bounded backoff; reconnect can replay uncertain attempts indefinitely. Multiple sends can race local status updates.
- Publication persistence validates loads more strictly than writes; duplicate or invalid entries can be committed and fail only on next load.
- Native queue ownership is isolated in storage, but lifecycle cancellation must prevent starting sends after authorization/session invalidation.
- Unsaved report fields and selected photos have no durable recovery. Queue persistence covers only already-saved server drafts.

## Unfinished implementation

- Restart-safe local draft/photo recovery, explicit reconciliation of local and server revisions, bounded foreground retries and accurate receipt indicators.
- Complete offline protected-inventory access requires an approved authorization/cache-expiry contract. Do not reuse stale grants, silently unlock protected routes or store plaintext records to simulate completion.
- Some references differ intentionally from current email-code sign-in and unapproved institutional safety/PIN workflows. Do not invent approved checklists, credentials or policy to match a mockup.
- External deployment/codegen/JWT verification and live lifecycle acceptance require configuration and explicit deployment authorization.

Current storage limits: five drafts per account; five photos per draft; 2 MB per photo; 30 MB decoded photo content per account; 16 MB per ciphertext file; and a global recovery-directory budget of 128 MB / 512 files including replacement generations and retained uncertain orphans. A full or unverifiable directory rejects new writes visibly and preserves existing work. These technical limits do not approve a new institutional retention/deletion policy. Automated orphan cleanup remains deliberately unimplemented until references and retention requirements can be safely reconciled.

Autosave is debounced by 750 ms and flushes on background events. The device-save indicator refers only to the exact currently committed field snapshot; later edits show pending. An abrupt OS/process termination before a commit can still lose those pending edits. Fresh staff access is required to reopen protected records; no offline equipment/authorization cache or background worker is enabled.

## Checks never run or not established by evidence

- This session's Android native comparisons, TalkBack reading/focus, 2x font scaling, permission denial, keyboard and role journeys; 73-screen current checklist records each separately.
- iOS simulator/device acceptance (Windows host, no attached supported iOS device).
- Real approved-account restart/revocation/network-loss workflows, live Convex/Clerk end-to-end integration.
- Native platform exports and mocked render checks are compilation/local tests only.

## Offline contract before extension

1. Preview remains synthetic and cannot create live receipts. Live stored items are keyed by approved account; another account cannot read or replay them.
2. Local persistence is not a server receipt. PENDING/SYNCING/FAILED/CONFLICT must never display as acknowledged. SYNCED requires the matching server report ID from a successful authenticated mutation.
3. Freeze the reviewed report and attachment revisions for each submission. Reuse the same operation/report identity across transport retries; never silently replace a conflicting snapshot.
4. Recover uncertain in-flight attempts after restart through idempotent server calls only after fresh authentication, approval and scope checks. Expiry, suspension, revocation, account switch and disconnect stop new sends.
5. Foreground replay is sequential and bounded, with exponential backoff. Validation/authorization failures and revision conflicts require user action; no background safety decisions or silent infinite replay.
6. Retain encrypted owned draft/photo content for recovery after approved reauthentication. No cached protected equipment lookup or offline staff grant is authorized by this implementation. Missing institutional policy remains an explicit limit.
7. Bound local record count, photo sizes and storage volume; fail visibly on storage corruption/fullness and preserve the last complete committed generation. Never discard unsent work to make space automatically.
8. Native persistence/restart/network tests, pure storage/worker tests and live backend tests must be reported separately.
