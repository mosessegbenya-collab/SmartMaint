# SmartMaint implementation notes

## Corrective source update — 2026-10-22

The current corrective work also adds operational pagination, report filters, verifier queues, equipment history, QR/manual lookup, private report/photo/review persistence, policy-bound verification/rework/release, preventive schedules, targeted in-app notices and an encrypted native publication queue. All reference routes now have live branches, frequently sharing these components. This is not acceptance of 73 distinct screens. The queue only publishes already-saved server drafts; full offline reporting remains unfinished. See [the current acceptance checkpoint](../SMARTMAINT_FINAL_ACCEPTANCE_REPORT.md), [screen matrix](../SMARTMAINT_73_SCREEN_MATRIX.md) and [remaining issues](../SMARTMAINT_REMAINING_ISSUES.md). Historical preview-only descriptions below are not descriptions of the new live source. No deployment or real staff/safety approval was created.

## Staff-access scope update — 2026-10-21

The new brief expands the original frontend boundary. Convex schema, authenticated functions, staff review, audit and client authorization/cache isolation now exist. See [staff-access implementation and operator handover](STAFF_ACCESS.md) and [current validation](../VALIDATION.md). Earlier descriptions of unavailable backend contracts below describe the original preview architecture; they are superseded for the new staff routes. No deployment or approved verification policy exists. Live routes use backend functions; fictional operational records remain isolated preview data. Production safety/release policies are still unavailable.

## Scope and provenance

The existing Expo SDK 57 / React Native 0.86 / React 19.2 application is preserved. `Design/` contains 73 approved images. `artifacts/design-inventory.json` maps all of them to 67 screen families; `DESIGN_IMPLEMENTATION_AUDIT.md` tracks evidence separately from source implementation.

All operational records are synthetic. The application never presents an in-memory acknowledgment as a real server receipt. The approved gear-and-heartbeat mark and equipment illustrations were extracted as individual raster assets from the supplied references. Screens are built with interactive native components, not screenshot backgrounds. No hospital name appears in the application.

## Application structure

- `src/app/`: thin Expo Router route files and protected workspace layout.
- `src/features/access/`: welcome, identity sign-in entry, registration, approval and session states.
- `src/features/workspace/`: role dashboards, equipment, reports, tasks, accounts, notifications and profile.
- `src/features/workflows/`: equipment identification, reports, camera, maintenance, verification, availability, synchronization, administration and settings.
- `src/components/smart/`: reusable accessible fields, selectors, buttons, cards and screen framing.
- `src/design/`: shared semantic tokens and appearance palettes.
- `src/domain/`: strict models, permissions, validation and derived availability.
- `src/services/`: pure development operations, synthetic records, unavailable live adapter and future service contracts.
- `src/state/`: memory-only session, drafts, preferences and synthetic records.
- `tests/`: platform-independent behavioral tests. These do not replace component, navigation or device testing.

Native Android/iOS tabs remain `expo-router/unstable-native-tabs`, the SDK 57 entry point. Browser preview retains Expo Router UI tabs. There are eight role scenarios, with a separate independent technician identity for verification demonstrations.

## Identity and backend setup

Copy `.env.example` to `.env.local` and supply only public identifiers. Never expose Clerk secret keys or Convex admin credentials in `EXPO_PUBLIC_*` variables.

`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` conditionally enables Clerk identity, its secure token cache, email-code sign-in/registration and existing Google/Apple SSO entry points. See [Clerk authentication](AUTHENTICATION.md) for configuration, implemented behavior and acceptance steps. Configure the providers and the `smartmaint://access/pending` redirect in Clerk. Configured SSO is not verified without a working application key and provider settings. Identity authentication alone never creates an approved application account or opens protected tabs.

Email-code authentication replaces staff PIN sign-in/recovery. Staff ID + PIN, activation delivery and staff approval remain unavailable for live use. No improvised local PIN authentication system is implemented. Device biometric checks report hardware, enrollment, cancellation and result states; they do not independently authenticate or approve staff.

No Convex queries, mutations, upload handlers or schema exist in this repository. `EXPO_PUBLIC_CONVEX_URL` is reserved for future integration and does not enable live operations by itself. `src/services/contracts.ts` describes requirements, not invented existing function names. The live adapter rejects unconfigured operations. Server-side scope, authorization, approval, audit, idempotency and release enforcement remain required.

## Preview and offline behavior

Development builds expose an explicit synthetic account selector on Sign In. An exported build requires the explicit `EXPO_PUBLIC_ENABLE_DEMO=true` opt-in to expose this selector. This grants access only to synthetic in-memory data, never live records.

Drafts, photos, queue entries, application scenarios and preferences are lost when the process restarts. No patient information should be entered. Secure Clerk token storage does not imply encrypted offline equipment/report persistence.

Queue demonstrations distinguish local, pending, uploading, simulated acknowledgment, failed and rejected records. Manual retries are scoped to their synthetic account; transient failures demonstrate capped backoff while the sync screen is mounted. Authentication failure pauses synchronization and requires session recovery. Validation/permission rejections do not silently retry. There is no durable/background retry service.

## Safety rules

Exact QR values are preserved. Unknown identifiers do not create verified equipment. Reporter priority suggestions remain separate from triage decisions. Work order history survives completion/cancellation. Only assigned authorized technicians can record work. Independent technical and clinical verification are required. Failed/unable attempts require reasons and create linked rework without overwriting completed work. Every current release prerequisite is evaluated, including all active tasks and holds. Missing production release policy always blocks a positive production availability declaration.

CSV exports contain scoped, nonprovisional, simulated-acknowledged examples only, with conspicuous synthetic labeling, CSV escaping and spreadsheet formula neutralization.

## Native capabilities

Camera capture, QR scanning, photo-library selection and device biometrics use SDK-compatible Expo modules. Native permission descriptions are configured through plugins in `app.json`; no generated native project files are manually maintained. Adding/configuring native modules requires a compatible Expo Go runtime or a new development build. Face ID and custom splash/icon behavior need an appropriate native build for reliable verification. OAuth callbacks require a development build and are explicitly unavailable in Expo Go. Web capability states and browser screenshots are supplementary evidence only. Captured photos use Expo's local cache; no encrypted attachment store is implemented.

## Known deviations and required validation

The references are framed iPhone mockups with small controls. The implementation preserves native platform status/navigation chrome and uses at least 48-point primary touch targets with scrolling and text scaling. These accessibility/platform deviations must be considered in normalized screenshot comparisons. A standalone vector or high-resolution transparent logo is not supplied; the exact supplied raster mark is reused without redrawing its geometry.

The local Clerk publishable key is present, but OAuth providers and live identity flows have not been verified. Application approval, backend operations, push/email delivery, durable encrypted offline storage, approved safety checklists and production release policy remain unconfigured. Reconciliation works through a synthetic adapter, preserves the original scanned identifier and does not verify the reporter. Live reconciliation and hold clearance require authorized backend functions and policies. Clinical checklist content is illustrative and labeled accordingly. No app store deployment or production readiness is claimed.

Final visual acceptance remains blocked until runtime screenshots, matching-state comparisons, navigation/workflow tests and accessibility checks substantiate every reference. See the audit and validation results for actual outcomes; compilation and domain tests alone are insufficient.
