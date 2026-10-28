# Equipment notifications and current status

28 October 2026. New safety-hold, hold-resolution and return-to-service notifications now carry an equipment destination. Previously the equipment helper emitted report/task destinations, so these events were missing from the inbox Equipment filter and opened a related record instead of current equipment status.

The internal report/task helpers retain their existing recipient checks and accept a matching equipment destination only from the equipment-event helper. The destination must match the source record's equipment. Recipients remain the latest submitted report's eligible reporter and latest assigned task's eligible technician; this does not notify every ward member or imply external delivery. Duplicate reporter/technician recipients receive one notice. If the reporter permission check rejects that account, the technician path still checks whether it can receive the event under its current repair permission. Suspended and out-of-scope accounts remain excluded.

New notices use the existing `targetKind: equipment` schema member and the equipment ID. No schema migration or historical notification rewrite occurs. Existing notices retain their recorded report/task links. All destinations continue through authenticated record queries; a notice does not grant access.

The live inbox and development preview share `NotificationCard`. It identifies Read/Unread as inbox state, labels the item a Recorded event, uses the shared palette, and names its destination: equipment status, maintenance task or fault report. Equipment-event cards explicitly state that later events may supersede the notice. A historical release notice is never presented as current clearance. Mark-read confirmation explains that it changes inbox state without acknowledging work, verification or release.

`/design-system?example=notification` uses the actual card with a fictional historical decision, local read-state changes and a local open counter. It does not open protected records, read a real inbox or record a release. [Validation evidence](../validation/current/EQUIPMENT_NOTICES_INTEGRATION_2026-10-28.md).

Full authenticated notification journeys, institutional recipient fan-out, external push/email delivery, cross-platform accessibility and all reference acceptances remain separate work. Existing indexed source selection still filters out drafts/unassigned records; this pass does not redesign that query path for large histories.
