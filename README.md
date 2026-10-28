# SmartMaint

Design-system continuation (27 October 2026): [implemented foundations, component catalogue and workflow contract](docs/DESIGN_SYSTEM.md). Use `/design-system` during development to inspect shared components in light/dark appearance and with larger text. The [existing development demo](docs/DEVELOPMENT_DEMO_2026-10-26.md) is configured; older preparation-only reports below are historical.

Management continuation: [complete analytics and guarded CSV delivery](docs/MANAGEMENT_INTEGRATION.md), with [235-test and native evidence](validation/current/MANAGEMENT_INTEGRATION_2026-10-27.md). The analytics preview is `/design-system?example=management` in development.

Report recovery continuation (28 October 2026): [draft lifecycle, complete conflict comparison and revision-bound receipts](docs/REPORT_RECOVERY_INTEGRATION.md), with [automated and Android validation evidence](validation/current/REPORT_RECOVERY_INTEGRATION_2026-10-28.md). Preview the shared components at `/design-system?example=recovery` during development.

Work editor continuation: [preserved local findings and work/workflow revision review](docs/WORK_EDITOR_INTEGRATION.md), with [validation evidence](validation/current/WORK_EDITOR_INTEGRATION_2026-10-28.md). Preview the comparison at `/design-system?example=work` in development.

Shared dialog continuation: [scrollable confirmations, selectors and adaptive date selection](docs/DIALOGS_INTEGRATION.md), with [200% system-text and short-screen evidence](validation/current/DIALOGS_INTEGRATION_2026-10-28.md). Preview at `/design-system?example=confirmation` in development.

Latest continuation: [fresh implementation and acceptance evidence](validation/current/FINAL_ACCEPTANCE_PASS.md), [73-reference checklist](validation/current/CHECKLIST.md), [prepared native procedure](docs/NATIVE_ACCEPTANCE_PROCEDURE.md) and [live integration prerequisites/commands](docs/LIVE_INTEGRATION_ACCEPTANCE.md). Native synthetic coverage is separate from exact-state and live acceptance.

Current corrective checkpoint: [acceptance status](SMARTMAINT_FINAL_ACCEPTANCE_REPORT.md), [73-reference matrix](SMARTMAINT_73_SCREEN_MATRIX.md), [remaining issues](SMARTMAINT_REMAINING_ISSUES.md). Backend/source implementation and live/native acceptance are tracked separately. For SDK57 in-place native regeneration, use `npx expo prebuild --platform android --no-clean --no-install`; this SDK recreates native folders by default. Do not clear generated projects while builds or IDE imports hold them open.

Expo SDK 57 / React Native application for equipment identification, fault reporting, maintenance and independent safety verification. The approved references are in `Design/`.

This implementation includes Clerk identity, trusted Convex staff access, an existing scoped development demo and an isolated synthetic preview. Institutional verification and clinical release remain disabled for the demo. See [development demo](docs/DEVELOPMENT_DEMO_2026-10-26.md), [staff access](docs/STAFF_ACCESS.md), [validation](VALIDATION.md) and [the design audit](DESIGN_IMPLEMENTATION_AUDIT.md).

## Run

Use Node 22.13 or newer and npm. Avoid running simultaneous installers in this directory.

```powershell
npm ci
npx expo start
```

Open **Staff Sign In**, scroll to **Development preview**, choose a role, and tap **Open development preview**. The independent technician scenario is separate from the repairing technician. Preview changes are held in memory and are lost on restart.

For Android, start a compatible emulator and run `npx expo start --android`. For iOS, use Expo Go on a compatible physical device or an EAS development build; Windows cannot run an iOS simulator. Browser preview is available with `npx expo start --web` and does not establish native compatibility.

## Configuration

Copy `.env.example` to `.env.local` and set public identifiers only. Clerk's publishable key enables email-code sign-in/registration, secure sessions and configured Google/Apple SSO. See [authentication setup and acceptance](docs/AUTHENTICATION.md). Staff approval remains separate from identity authentication. There is no local PIN credential store and no automatic grant of live application access.

Convex source enforces staff approval, scope, capabilities, revisions and audit. Corrective source implements server drafts, authenticated photos, policy-bound safety decisions, linked rework, preventive schedules and a native publication queue. Full offline reporting is incomplete. Deployment, verified Clerk claims, approved institutional policies and operator bootstrap remain required; safety/identity approval remains disabled. Setting a deployment URL alone does not enable live staff access. See [operator handover](docs/STAFF_ACCESS.md).

Native modules and permissions are declared in `app.json`. After changing native capabilities, use a compatible Expo Go runtime or create a development build:

```powershell
npx eas-cli@latest build --profile development
```

EAS project/profile configuration and credentials are required; no cloud build or deployment is implied by this command.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npx expo install --check
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
npx expo export --platform web
```

The domain tests cover permission boundaries, scope, duplicate submissions, provisional identity, independent verification, linked rework, release blockers, synchronization and CSV safety. They do not replace native interaction, camera, accessibility or screenshot comparison tests.

## Evidence

- [Reference mapping](artifacts/design-inventory.json): 73 images and their routes.
- [Design implementation audit](DESIGN_IMPLEMENTATION_AUDIT.md): screen-by-screen status and evidence.
- [Implementation notes](docs/IMPLEMENTATION.md): architecture, integration contracts, limitations and deliberate platform/accessibility deviations.
- `artifacts/`: reference contact sheets, runtime evidence and validation artifacts when available.

No production readiness or pixel-perfect identity is claimed without the required runtime comparisons and workflow validation.
