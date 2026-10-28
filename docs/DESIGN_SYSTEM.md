# SmartMaint design system

Updated 27 October 2026. This is the implemented foundation and integration contract. It does not assert acceptance of all 73 references or institutional clinical readiness.

The [management integration continuation](MANAGEMENT_INTEGRATION.md) connects the overview to complete paginated totals, guards CSV delivery across access changes and corrects metric-grid sizing found in native review.

The [report recovery continuation](REPORT_RECOVERY_INTEGRATION.md) connects complete field comparison, device-draft cleanup and revision-bound submission receipts.

The [work editor continuation](WORK_EDITOR_INTEGRATION.md) retains unsaved findings across incoming task changes and connects explicit comparison to backend work/workflow revision checks.

The [work exit continuation](WORK_EXIT_INTEGRATION.md) protects unsaved maintenance fields from accidental route removal and blocks leaving during a pending save.

The [shared dialog continuation](DIALOGS_INTEGRATION.md) fixes large-text error recovery, opaque modal surfaces and narrow-screen date selection across workflows.

The [queue-loading continuation](QUEUE_LOADING_INTEGRATION.md) prevents partial receipt confirmation and connects loading failures to explicit recovery in sync and report review screens.

The [event chronology continuation](EVENT_CHRONOLOGY_INTEGRATION.md) distinguishes record creation, actual submission, immutable repair completion and administrative closure, while disclosing unknown historical times.

The [preventive activity continuation](PREVENTIVE_ACTIVITY_INTEGRATION.md) separates pause/resume from date editing, preserves overdue obligations and aligns paused status with backend activity.

The [schedule review continuation](SCHEDULE_REVIEW_INTEGRATION.md) retains prepared date/justification across reactive changes and requires current revision review before task, date or activity actions.

The [equipment notification continuation](EQUIPMENT_NOTICES_INTEGRATION.md) routes new equipment events to current equipment status and distinguishes recorded events and inbox read state from equipment clearance.

The [welcome restoration continuation](WELCOME_RESTORATION_INTEGRATION.md) keeps the public fictional welcome visible during identity restoration, with inline recovery and unchanged protected-workspace gates.

The [protected restoration continuation](SESSION_SURFACE_INTEGRATION.md) uses a themed, branded and scrollable session gate with readable system bars and reachable recovery on compact large-text screens.

## Product objective

Help CCTH staff identify equipment, report faults, coordinate evidence-based maintenance, and distinguish completed repairs from independently verified equipment that has an authorized return-to-service decision. The approved `Design/` references remain the visual target. The existing development demo remains fictional and cannot enable clinical verification or release.

## Foundations

`src/design/tokens.ts` owns the light/dark palette, explicit semantic foreground/surface/border pairs, spacing, radii, type scale and layout dimensions. `src/constants/theme.ts` derives its existing theme interface from that palette so template components and operational screens share the same colours.

| Foundation | Implementation |
| --- | --- |
| Brand | Existing approved gear/heartbeat logo, equipment artwork and Inter assets |
| Typography | `caption`, `label`, `body`, `section`, `title`, `metric`; `Txt` retains explicit size/weight overrides |
| Spacing | 2, 4, 8, 12, 16, 24, 32, 48 logical points |
| Shape | 12-point controls, 16-point cards, 24-point sheets, pill badges |
| Mobile layout | 48-point minimum control targets, safe areas, scrolling, keyboard avoidance, 600-point content maximum |
| Accessibility | System font scaling plus user larger/bold text, higher contrast, reduced motion, field error hints and visible focus borders |
| Semantics | Info: context/activity; warning: incomplete prerequisite; danger: failure/hold; success: confirmed operation; neutral: inactive/administrative state |

Every explicit semantic foreground/surface pair is checked at a minimum 4.5:1 contrast in both appearances. This numerical check does not establish screen-reader or whole-screen accessibility acceptance. Status labels and explanatory text convey meaning alongside colour.

## Component contract

Use `src/components/smart/ui.tsx` for `Screen`, `Card`, `Row`, `Txt`, `Icon`, `IconButton`, `Button`, `Field`, `Select`, `Choices`, `Notice`, `Badge`, `LinkRow`, `Section` and `Detail`. Cards now define their essential padding, border and radius with native styles. Forms preserve consumer focus/blur handlers and announce validation through error text/hints. Loading buttons expose disabled/busy accessibility state.

Use `status-ui.tsx` for `StatusPanel`, `StatGrid`, `TimelineItem`, `LoadingState`, `EmptyState` and `MaintenanceBadge`. All status components resolve semantic colours for the current appearance. `EmptyState` can offer a contextual recovery action. Operational task filters use it to reset an empty selection.

Use `settings-ui.tsx` for profile and preference controls, `report-steps.tsx` for report progression and `features/staff/ui.tsx` for confirmation and capability-selection controls. Destructive and consequential operations retain their existing confirmation, busy and error states.

The development-only `/design-system` route is an interactive catalogue of actual shared components. Open it directly during `expo start`, or through Profile → Design system in a development workspace. It contains fictional examples only and does not query or mutate maintenance records. Theme/text/contrast controls use the app's existing session preferences. Release builds redirect the route to `/` and omit its profile link.

## Frontend and backend agreement

`src/domain/maintenance-workflow.ts` defines structural workflow rules and presentation independent of React. The Convex transition mutation and frontend action menu both use `canTransitionTask`. Server authorization, ownership, department scope, revision checks, independent verification and release eligibility remain authoritative and are checked separately.

| Stored work state / workflow phase | User-facing status | Available structural actions |
| --- | --- | --- |
| Unassigned | Awaiting assignment | Supervisor assignment |
| Assigned or In progress, no phase | Awaiting acceptance | Assigned technician accepts or records work |
| Assigned / accepted | Assignment accepted | Record work, await parts |
| In progress / accepted | In progress | Record work, await parts |
| Active / awaiting_parts | Awaiting parts | Assigned technician resumes |
| Completed | Awaiting verification | Independent checks; supervisor closure only after server eligibility passes |
| Completed / closed | Work order closed | Read recorded history and current equipment status |
| Cancelled | Cancelled | Read history; no active workflow actions |

Recording work accepts an unaccepted assignment in the same transaction. Completion records `awaiting_verification`. Reassignment removes the former workflow phase and justification while retaining diagnosis, notes, parts and work evidence. Legacy in-progress assignments without a phase can be accepted. Cancellation takes precedence over stale phase metadata in both labels and action availability. Completed tasks never receive a green equipment-clearance badge.

Work completion and administrative closure do not create release records. Equipment availability continues to derive from `convex/safety.ts`, current approved policy, independent decisions, repair chains and active holds. Demo safety restrictions remain enforced on the server.

## End-to-end architecture

| User journey | Frontend | Authoritative backend / persistence |
| --- | --- | --- |
| Sign in and resolve staff access | `features/access`, `features/staff/provider.tsx` | Clerk identity, `staff.ts`, `administration.ts`, `lib/access.ts` |
| Identify equipment | Operational equipment screens | Scoped `workflows` lookup/pages, equipment registry |
| Report a fault | Reporting journey, device recovery, publication coordinator | Private versioned drafts in `reporting.ts`, authenticated evidence in `attachments.ts` |
| Assign and perform maintenance | Task screens, shared workflow actions/status | `operations.ts`, `extensions.ts`, immutable `workEntries`, revisions and audit |
| Preventive maintenance | Preventive screens | `preventive.ts`, schedules, occurrences and required checklist results |
| Independently verify and release | Safety screens and equipment status | `safety.ts`, independent contributors, policies, holds and release records |
| Operational communication | Inbox and preferences | Recipient/scope-checked in-app notices, per-owner saved preferences |
| Management and administration | Management/staff/inventory screens | Scoped paginated metrics/export, imports, authorization audit |

Protected records always come from authenticated scoped queries. Example labels never grant permissions. Recovery and publication keep existing account isolation and encrypted native storage. Full protected offline operation, external push/email delivery and institution-approved policy configuration remain separate unfinished work.

## Iteration and acceptance

For each remaining flow: inspect its approved reference and current state, implement shared components, verify the corresponding server rules, run meaningful negative and positive tests, then capture the actual mobile state with source/date evidence. Keep visual, mocked integration, live integration and native-device acceptance distinct.

Local checks: `npm run typecheck`, `npm run lint`, `npm test`. Changing shared components warrants representative native checks across small screens, large text, light/dark appearance, keyboard input and modal selections. Source coverage and successful tests cannot substitute for the pending 73 exact-state comparisons, iOS/device checks, signed distribution and authorized institutional acceptance.

Version references used for this implementation: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [SDK 57 Expo Router](https://docs.expo.dev/versions/v57.0.0/sdk/router/), [React Native accessibility](https://reactnative.dev/docs/0.86/accessibility) and [TextInput](https://reactnative.dev/docs/0.86/textinput).
