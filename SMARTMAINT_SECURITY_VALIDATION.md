# Corrective security validation

Server authorization derives Clerk identity and current approved staff grants. Metadata requests remain untrusted. Existing staff policy and bootstrap protections are preserved; no real policy or bootstrap was enabled.

New endpoints validate capability/department/ownership before returning records. Direct detail queries enforce the same record visibility as lists. Inventory registration requires scoped Administrator reconciliation authority and transactional identifier uniqueness. Provisional reports remain unverified and cannot silently create verified inventory.

Private drafts and photos are owner-only before submission. Photo actions authenticate, check current report authority, validate size/type/signatures, store files server-side, and recheck authority at commit. No public storage IDs/URLs are returned. Reads reauthorize through actions. Submitted evidence is immutable; reviewed photo revisions participate in publication conflicts. Evidence retention and operational file scanning still require institutional decisions.

Safety policy configuration is internal-only and versioned. Attempts are immutable and tied to policy/task revision. Repairers cannot self-verify; clinical checks require an independent technical pass. Failures create linked rework without overwriting original work. Release atomically checks inventory, unresolved faults/tasks/rework, current checks, policy, authority and holds. New holds, resolved holds, policy replacements and new checks require a matching fresh release snapshot. Clearing a hold does not release equipment.

The encrypted native publication queue stores submission metadata, not credentials/photos. It replays only after fresh approved staff authorization; conflicts require review. It does not grant offline protected-record access or finalize safety actions offline. Complete encrypted offline draft/photo storage and approved offline authorization remain unfinished.

Status: local unit/mock checks only. No deployment penetration test, live Clerk JWT integration, external security assessment or regulatory/clinical certification is claimed.

Verifier-request recipients are checked against current approved scope/capabilities and the repairing technician is excluded. Missing policy, stale repair revision, superseded repair cycles and clinical requests without a distinct technical pass are denied. Notification helpers skip suspended/out-of-scope recipients; no external delivery is inferred from an in-app record. Equipment timelines omit work notes and only offer detail links when task-view authority applies. Live record-query failures have a retry/workspace recovery boundary without showing raw server stacks or bypassing authorization.
