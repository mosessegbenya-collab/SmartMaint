# SmartMaint

Current corrective checkpoint: [acceptance status](SMARTMAINT_FINAL_ACCEPTANCE_REPORT.md), [73-reference matrix](SMARTMAINT_73_SCREEN_MATRIX.md), [remaining issues](SMARTMAINT_REMAINING_ISSUES.md). Backend/source implementation and live/native acceptance are tracked separately. For SDK57 in-place native regeneration, use `npx expo prebuild --platform android --no-clean --no-install`; this SDK recreates native folders by default. Do not clear generated projects while builds or IDE imports hold them open.

Expo SDK 57 / React Native application for equipment identification, fault reporting, maintenance and independent safety verification. The approved references are in `Design/`.

This implementation includes Clerk identity, trusted Convex staff-access source and an isolated synthetic preview. No Convex deployment or approved institutional verification policy exists yet; verification remains disabled. See [staff access](docs/STAFF_ACCESS.md), [validation](VALIDATION.md) and [the design audit](DESIGN_IMPLEMENTATION_AUDIT.md).

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
