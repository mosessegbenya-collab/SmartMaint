# Android CMake diagnosis — 26 October 2026

## Finding and correction

PASS: Reproduced both `:react-native-worklets:configureCMakeDebug[x86_64]` and `:react-native-screens:configureCMakeDebug[x86_64]` failures with `--stacktrace`. The baseline `:app:assembleDebug` failed in 51 seconds. Evidence: `artifacts/android-cmake-baseline-2026-10-26.log`.

The shell's `java -version` resolved Temurin 17.0.20.1, but the user-level `JAVA_HOME` pointed to Android Studio's JBR 25.0.3. The Gradle wrapper uses `JAVA_HOME`, so both its launcher/daemon and the Prefab Java subprocess used JBR 25. The machine-level JAVA_HOME already selected Temurin 17; the user setting overrode it.

The underlying exception was `java.lang.IllegalStateException` in AGP's `GeneratePrefabPackagesKt.reportErrors`, reached while creating Prefab build-system glue. Both modules' `prefab_stderr.txt` files contained JBR 25's restricted `System::load` warning from `com.sun.jna.Native` in Prefab CLI 2.1.0. The failure occurred during Prefab preparation, before C++ compilation. The warning alone would not establish a cause; the matching stack trace and the controlled JDK comparison do.

PASS: With only the build JVM changed to the installed JDK 17, both exact configure tasks executed successfully in 2m56s; both Prefab stderr files became empty. The SDK XML warning still appeared in this successful run. Evidence: `artifacts/android-cmake-jdk17-2026-10-26.log` and `artifacts/android-jdk17-version-2026-10-26.log`. Original stderr is preserved in `artifacts/android-{screens,worklets}-prefab-jbr25-2026-10-26.txt`.

Corrected user-level `JAVA_HOME` to `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`. No PATH, machine-level environment, Android Studio runtime, native configuration or application source was changed. No native-access warning suppression or security-check bypass was added. The isolated failed baseline's idle JBR25 Gradle daemon was stopped; the JDK17 daemon and unrelated processes were preserved.

## Toolchain audit

| Component | Observed configuration | Assessment |
| --- | --- | --- |
| Expo / React Native | 57.0.31 / 0.86.3 | Installed package versions; Expo dependency check passes. |
| Java / Gradle JVM before repair | PATH JDK17; JAVA_HOME and Gradle JBR25 | Inconsistent; reproduced Prefab failure. |
| Java / Gradle JVM after repair | Temurin 17.0.20.1 | Both configure tasks pass. |
| Gradle wrapper | 9.3.1 | Preserved; supports the selected JDK17. |
| Android Gradle plugin declaration | 8.12.0 in installed React Native version catalogs | Preserved; official compatibility documents JDK17. |
| Android platform / build tools | compile/target 36, min 24 / 36.0.0 | Selected by installed Expo/RN catalog; required installed packages present. |
| NDK | Selected 27.1.12297006 (r27b); 27.0 also installed | Matches installed RN catalog and successful task command; no NDK switch. |
| CMake | Selected 3.22.1, installed and executable | Meets Screens 3.9 and Worklets 3.16 minimums. RN's separate source-build script defaults to 3.30.5; this app consumes prebuilt RN artifacts and did not select that source-build path. |
| SDK command-line tools | 23.0, `latest` directory; Android CLI 1.0.16625370 | Installed CLI executes. `sdkmanager --version` delegates to the new CLI and requests its update; it is not a reliable tools-version check here. No SDK update required for the reproduced repair. |
| SDK XML warning | Reader supports v3, installed metadata includes v4 | Remains in successful JDK17 configure run; not the demonstrated fatal cause. No metadata edits or package downgrades. |

No explicit project IDE Gradle JVM setting was found. Android Studio's own JBR runtime can remain unchanged; if building with Studio buttons, select the same installed Temurin17 in **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK**. That setting is independent of terminal JAVA_HOME and has not been interactively verified.

## Verification

- PASS: `node node_modules/expo/bin/cli install --check` — dependencies up to date; no package changes.
- PASS: `npm run typecheck` — exit 0.
- PASS: `npm run lint` — exit 0.
- PASS: `node --test tests/native-config.test.cjs` — 2/2, preserving the existing Windows C++ runtime plugin and property repair.
- PASS: `:app:assembleDebug --stacktrace --console=plain --max-workers=2 -PreactNativeArchitectures=x86_64` — exit 0, **BUILD SUCCESSFUL in 15m50s**, 455 actionable tasks (59 executed, 396 up-to-date). Screens and Worklets both passed configuration, native compilation/linking and library merging; the app completed packaging. Evidence: `artifacts/android-rebuild-jdk17-2026-10-26.log`.
- PASS: Hash comparison preserved `android/build.gradle`, `android/app/build.gradle`, `android/settings.gradle`, `android/gradle.properties` and the wrapper properties. Evidence: `artifacts/android-native-config-integrity-2026-10-26.json`.
- PASS: Inspected the resulting APK archive: x86_64 only, with `libappmodules.so`, `librnscreens.so`, `libworklets.so`, `libreanimated.so` and `libc++_shared.so`. APK size is 97,570,348 bytes; timestamp and SHA256 are recorded in `artifacts/android-apk-verification-2026-10-26.json`. All five configuration hashes still matched after the completed build.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. This is an x86_64 development/debug build. Installation, runtime launch, ARM/release builds and native authentication were NOT TESTED in this task. Existing SDK XML, C++ deprecation and Gradle deprecation warnings were not suppressed.

No prebuild, clean, native-directory deletion, backend deployment, staff provisioning or authentication grant was performed. Existing dirty authentication acceptance notes and browser evidence were preserved. Native authentication acceptance remains NOT TESTED by this build task.

## Repeating the build

Existing VS Code/terminal processes can retain the old environment. For an immediate retry in PowerShell, use:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
Push-Location android
.\gradlew.bat --version
.\gradlew.bat :app:assembleDebug --stacktrace --console=plain --max-workers=2 -PreactNativeArchitectures=x86_64
Pop-Location
```

The architecture flag matches the previously tested emulator build. ARM/device/release builds and native authentication are separate acceptance requirements. Restart VS Code from an updated Windows environment for subsequent terminals, or set JAVA_HOME explicitly in the current terminal as above.

References checked: [Expo SDK57](https://docs.expo.dev/versions/v57.0.0/), [Expo Windows JDK setup](https://docs.expo.dev/workflow/android-studio-emulator/), [Android Gradle JVM selection](https://developer.android.com/build/jdks), [AGP8.12 compatibility](https://developer.android.com/build/releases/agp-8-12-0-release-notes), and installed SDK/plugin build scripts.
