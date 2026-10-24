# Corrective native build report

Checkpoint: **2026-10-24**. Android debug **build, installation and launch passed** on Pixel API35 (x86_64). iOS native build not run. This is an emulator development APK, not an ARM/store/distribution build.

## Actual attempts

| Log in artifacts/ | Result |
| --- | --- |
| corrective-android-build.log | Expo run:android --no-install failed after 23m31s at Worklets CMake configuration under Android Studio JBR25. |
| corrective-android-jdk17.log | JDK17 retry advanced to C++ linking, failed after 13m50s with missing std::__ndk1/mutex/exception symbols. |
| corrective-prebuild-in-place.log | SDK57 prebuild --platform android --no-clean --no-install passed. |
| corrective-android-runtime-link.log | Post-plugin build failed during Node/autolinking configuration, before validating the C++ change. |
| corrective-android-limited.log | Resource-limited retry could not discover a disconnected emulator. |
| corrective-android-controlled.log | Controlled API35/JDK17/limited-worker retry failed during Node/autolinking configuration. |
| corrective-gradle-config-trace.log | Stack trace identified mirror-kotlin-inline-modules and the watched-directories property. |
| corrective-android-repaired.log | After property repair, build failed because Expo/config dependencies were missing. |
| corrective-prebuild-latest.log | Latest in-place prebuild passed after core packages reappeared; watchedDirectories is valid []. |
| corrective-android-restored.log | Restored dependencies allowed Worklets/Reanimated/native modules to build; app link failed after 10m52s because its CMake cache still omitted the C++ runtime. |
| corrective-prebuild-final-dsl.log | In-place regeneration with the finalizeDsl correction; result recorded in the log. |
| corrective-android-final-dsl.log | Failed: registering finalizeDsl after the root plugin still missed the app's evaluation lifecycle. |
| corrective-prebuild-registration.log | In-place regeneration passed with hook registration before root plugins. |
| corrective-android-registration.log | **Passed, exit 0**: BUILD SUCCESSFUL in 7m4s; APK installed and opened on Pixel_API35. |

## Source corrections

Generated CMake selected c++_shared but omitted it from standard link libraries. plugins/with-windows-cpp-runtime.cjs adds the selected shared runtime explicitly, Windows-only, through Expo config mods. Its behavior is tested; a successful native link is still required to validate the remedy. Third-party sources and generated native files were not hand-patched.

The restored-dependency attempt validated that correction for Worklets and Reanimated. React Native's root plugin evaluates the app while establishing library evaluation order, so a hook appended after root plugins missed the app's lifecycle. The final plugin registers before root plugins and applies the runtime argument through AGP's finalizeDsl callback. The generated app CMake cache now contains -lc++_shared -latomic -lm, and libappmodules.so linked successfully. See [the official AGP lifecycle](https://developer.android.com/build/extend-agp). Two plugin tests cover idempotence, preservation, registration ordering and the observed property corruption.

The generated watched-directories property contained a concatenated JVM option, causing JSON parsing failure. The config plugin repairs that exact observed corruption, preserves valid watched paths and active JVM settings, and rejects unknown malformed values. Both plugin tests pass.

SDK57 prebuild clears native folders by default (confirmed in the installed CLI help/source). A first default attempt hit EBUSY; subsequent prebuilds explicitly use --no-clean. Do not repeat destructive regeneration. JDK17, limited Gradle heap/workers and two CMake jobs are used for retry on this 16 GB host. Only this run's identified Metro/idle build processes were stopped; unrelated applications were preserved.

## Dependency interruption

The dependency tree became incomplete during validation. A locked CSS binary initially prevented restoration; that directory was safely preserved under ignored artifacts/dependency-lock-backup. A separate npm install was confirmed in the same workspace during the controlled restore; the user confirmed they did not start it. The controlled installer was stopped to avoid concurrent writes. After the other process exited, missing Hermes parser files still prevented lint. A subsequent single-installer npm ci restored 1,020 packages successfully (exit 0). TypeScript, lint and all 96 tests now pass. Logs: corrective-dependency-restore.log, corrective-dependency-restore-retry.log and corrective-single-installer-restore.log. This does not establish the cause of the original missing tree.

## Runtime and platform evidence

Earlier reference comparisons use Pixel API35 / Expo Go57 captures. The installed development build also rendered welcome, sign-in, registration, empty-email validation and the requested-role picker; screenshots/XML are under artifacts/runtime/corrective-native-*. The developer menu was dismissed. Welcome-to-sign-in navigation, empty-email rejection, registration navigation and opening the role picker were observed. No real account/email submission, completed Google/Apple authentication or protected workflow was tested. Camera hardware acceptance remains open.

A navigation-race capture was rejected and recaptured. The current clean sign-in/registration images and comparisons show the expected screens. The capture helper waits for a fresh UI dump, records a paired XML and rejects unavailable snapshots rather than reusing a prior dump. Its binary buffer handles screenshots larger than 1 MiB.

After an execution-environment interruption, stock Messages/System UI ANR dialogs and a pending snapshot operation interrupted further checks. A controlled cold boot with 2560 MiB RAM and snapshot loading/saving disabled restored stable public testing. The existing APK was reinstalled successfully. Seven sampled public controls passed: welcome sign-in navigation, empty sign-in validation, registration navigation, picker opening, requested-role selection, cancel preservation and empty registration validation. See validation/native-checkpoint.json. No email/account submission or access grant occurred.

Doctor passed **21/21 again after dependency restoration** (corrective-doctor-restored.log). Earlier Android/iOS/web static exports passed to artifacts/corrective-bundles and compatibility was up to date. Those results are distinct from native compilation. Native build warnings include SDK XML/tooling and Gradle deprecations; no Gradle/NDK upgrade was performed outside the SDK57 setup.

Windows has no local iOS simulator/Xcode. No EAS build/signing/submission was performed, and no distribution readiness is claimed.

Primary references: [React Native environment/JDK guidance](https://reactnative.dev/docs/set-up-your-environment), [Android shared C++ runtime](https://developer.android.com/ndk/guides/cpp-support), [Expo config mods](https://docs.expo.dev/config-plugins/mods/).
