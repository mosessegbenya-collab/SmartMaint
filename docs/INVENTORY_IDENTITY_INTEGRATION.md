# Inventory identity and availability

28 October 2026. Inventory lists, lookup results, equipment details, reporting and verification now share one identity badge. Verified identity uses informational styling; unverified identity uses warning styling. Reporting no longer uses a green Identified badge, and unverified equipment details no longer use informational styling.

The actual lookup result now shows identity state, asset ID, model and recorded location. It asks staff to compare the record with the physical asset and explicitly separates identity verification from current availability. An unverified match retains its warning. The normal action is Review equipment record; the urgent branch is Continue urgent reporting. Neither action verifies inventory or releases equipment.

Compact native inspection also exposed awkward word breaks in the shared label/value rows. `Detail` now stacks label above value below 360 logical points or when effective text scaling reaches 1.5 (system scaling combined with the app larger-text option). Wider default-text views retain columns. This responds to window/font changes without measuring and storing every row's layout. Full values remain available without truncation.

Backend rules are unchanged. Exact lookup may return an unverified record within authorized scope. It does not grant access to another department or change the stored identity. Reporting an observed fault remains possible under reporting permission, while verified identity remains required for task creation and is a release blocker. The added regression checks these boundaries through existing backend functions.

The development `/design-system?example=identity` preview renders the actual match card and shared badge with fictional verified/unverified states and both next-step labels. Its callback only increments a local counter; it does not scan, open a protected record, submit a report or change identity. [Validation evidence](../validation/current/INVENTORY_IDENTITY_INTEGRATION_2026-10-28.md).

No backend, deployment, schema, dependency, account approval or institutional policy changed. Authenticated scan/report/verification journeys, physical camera checks, screen readers, iOS and full reference acceptance remain separate work.
