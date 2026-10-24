# Corrective acceptance checkpoint

This is a checkpoint, not final acceptance. Overall status: **Partial / Blocked**.

Checkpoint date: 2026-10-23. Earlier artifacts retain their actual capture/build timestamps.

| Metric | Actual evidence |
| --- | --- |
| Approved references | 73/73 verified present |
| Verified complete live screens | 0/73 accepted under the full definition of done |
| Visually compared screens | 2/73; both need correction; 0/73 visually accepted |
| Runtime functional controls | 2/2 sampled public controls passed; remaining live controls not tested |
| Completed live E2E journeys | 0/12 verified |
| Backend integrations | Blocked: no deployment/verified Clerk bridge |
| Local tests | 96 pass in the latest full restored-dependency run; no live integration acceptance |
| Authorization tests | Passed in local mocks; live JWT/role/security testing blocked |
| Offline tests | 4 pure queue tests pass; native recovery unaccepted; full offline reporting incomplete |
| Android native build | **Passed**: JDK17 debug x86_64 APK built, installed and opened on Pixel API35; production/hardware regression incomplete |
| iOS native build | Not run |
| Critical acceptance gates | 8, enumerated below |

1. Configured backend and verified live Clerk identity mapping.
2. Approved staff verification/role policy, departments and first-administrator authorization.
3. Approved institutional safety checklists/release/hold-clearance policy.
4. Complete supported offline reporting and approved protected-cache behavior.
5. Complete protected native/device regression and camera/permission/hardware validation beyond the passing Android emulator build.
6. Individual visual/accessibility acceptance across 73 references.
7. Passing live role/security/workflow E2E journeys.
8. iOS native/device and release/distribution validation.

Other unfinished source features are listed in SMARTMAINT_REMAINING_ISSUES.md and must not be hidden by this gate count. No real hospital deployment readiness or compliance is claimed.

All mapped reference routes now have live dispatcher branches. Shared components and blocked institutional review states remain partial implementations; branch coverage does not establish distinct-screen fidelity or end-to-end acceptance. TypeScript, lint and 96 local tests passed after successful lockfile restoration; resumed checks are recorded separately. Doctor passed 21/21 after restoration. The passing native build does not establish live workflow or visual acceptance.
