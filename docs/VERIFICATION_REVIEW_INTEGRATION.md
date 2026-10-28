# Verification review integration

28 October 2026. Independent verification now retains prepared findings when reactive repair or policy context changes, and binds new decisions to the reviewed policy on the server.

Previously `VerificationLoader` keyed the entire form by repair revision and policy ID. An incoming change silently remounted the form and discarded checks, findings, evidence and rework date. The mutation checked current checklist labels but could accept a replacement policy with identical labels without proof that the caller reviewed that policy.

The form now mounts by repair ID and verification kind. `VerificationEditorControls` keeps an isolated reviewed snapshot and prepared fields. An incoming repair revision/state or policy identity/reference/checklist change blocks recording and shows previous/current diagnosis, revision and policy. The user explicitly reviews the current completed repair and approved policy. This review retains outcome, findings, evidence and rework date, and resets **every check** to Not checked. No decision is recorded by reviewing. A withdrawn policy keeps recording disabled; narrative remains in memory for recovery during that mounted session.

`safety.verify` accepts `expectedPolicyId` as an optional transport argument so an older caller receives a readable review-required rejection rather than an unknown-argument failure. It is required to match the active approved policy for every new decision. A matching-label replacement is insufficient. Existing authorization, independent-contributor checks, completed repair revision, linked-rework restrictions, checklist ordering and clinical prerequisites remain authoritative. Receipt retries must match the original repair revision and policy as well as task/kind/outcome. A returned receipt describes a historical verification decision and does not establish equipment release.

The development-only `/design-system?example=verification-review` renders the actual editor with fictional local context and callback receipts. It neither queries nor mutates the backend, approves policy, performs physical checks nor releases equipment. The clinical checklist design reference was inspected for its equipment/checklist/approved-procedure intent; this continuation does not assert exact visual acceptance of that screen or adopt its illustrative checks as policy.

The guard was pushed only to the previously authorized **dev:greedy-bat-971** deployment. No schema, safety policy, staff approval, dependency or production deployment changed. Older clients must load the updated frontend before recording verification.

Prepared verification is not a durable device draft, and leaving/restarting the form can still discard unsaved fields. Live authenticated verification, institutional approval, iOS, screen-reader acceptance and exact-reference comparisons remain open. [Checks and Android evidence](../validation/current/VERIFICATION_REVIEW_INTEGRATION_2026-10-28.md).

Version references consulted: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SDK 57 Crypto](https://docs.expo.dev/versions/v57.0.0/sdk/crypto/), [React Native 0.86 View](https://reactnative.dev/docs/0.86/view). Convex guidance and the installed 1.47.0 SDK were used for the existing query/mutation patterns.
