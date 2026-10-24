# Runnable native acceptance procedure

Run from the repository root in PowerShell. Use the exact reviewed workspace fingerprint and retain screenshots plus fresh UI hierarchy. Do not treat a redirect, missing-record state, blank capture, permission dialog or developer overlay as the requested reference state. `validation/current/screens.json` lists all 73 references and routes.

## Android preparation

```powershell
$sdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
& "$sdk\emulator\emulator.exe" -list-avds
adb devices
# If no compatible emulator is running, start the existing AVD (do not wipe its data):
Start-Process -FilePath "$sdk\emulator\emulator.exe" -ArgumentList '-avd','Pixel_API35','-port','5556','-no-window','-no-snapshot-load','-no-snapshot-save','-gpu','swiftshader_indirect' -WindowStyle Hidden
adb -s emulator-5556 shell getprop sys.boot_completed
adb -s emulator-5556 install -r android/app/build/outputs/apk/debug/app-debug.apk
$env:SMARTMAINT_DEVICE = 'emulator-5556'
$env:EXPO_NO_TELEMETRY = '1'
npx.cmd --no-install expo start --dev-client --port 8081
```

In another PowerShell terminal, reverse Metro and open the development build. The APK must include the installed native modules; an exported bundle alone is insufficient.

```powershell
adb -s emulator-5556 reverse tcp:8081 tcp:8081
adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d 'smartmaint://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' -p com.anonymous.SmartMaint
node scripts/validation-state.cjs
node scripts/native-validation.cjs open /diagnostics
node scripts/native-validation.cjs tap 'Save native storage probe'
node scripts/native-validation.cjs capture probe-before-restart 'Synthetic native probe; no live receipt'
adb -s emulator-5556 shell am force-stop com.anonymous.SmartMaint
adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d 'smartmaint://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' -p com.anonymous.SmartMaint
node scripts/native-validation.cjs open /diagnostics
node scripts/native-validation.cjs tap 'Verify native storage probe'
node scripts/native-validation.cjs capture probe-after-restart 'Actual force-stop/relaunch; synthetic storage only'
```

Wait for navigation/bundling to finish and assert `PROBE VERIFIED` in the fresh hierarchy. If Android System UI hangs, capture the ANR separately and retry boot/navigation without deleting app data. Verify screenshot content before recording a pass.

Read original airplane/Wi-Fi/mobile-data settings. Disable connectivity, force-stop/relaunch, verify the probe again and capture. Restore the exact previous settings afterward. Metro over `adb reverse` remains available; this check tests native local storage, not a disconnected production startup. Remove the probe using its explicit button, restart, verify that it reports missing, and record this expected failure.

## Reference and accessibility checks

An existing signed-out development preview can exercise fictional screen layouts. If identity services are unreachable, an **isolated terminal only** may set `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=''` and `EXPO_PUBLIC_CONVEX_URL=''`, then start Metro on a separate port such as 8083. Do not edit environment files, disable live gates or count these captures as authenticated acceptance. Stop that Metro process when done.

Enter the needed fictional role through the existing sign-in preview picker. Navigate to each route in `screens.json` with matching equipment/task/report state. `node scripts/native-reference-capture.cjs clinician 1,2,3` records requested routes and screenshots, but a reviewer must verify the actual heading, data/state, comparison and role. Keep the preview stable: Fast Refresh/restarts reset memory-only fixtures. Capture auth redirects as denial evidence and exclude them from matching-state coverage.

For every reference:

1. Capture top and scrolled states; compare layout, imagery, typography, hierarchy and exact safety/submission meaning. Record deviations and policy-related intentional differences.
2. Record current `font_scale`; set `adb -s emulator-5556 shell settings put system font_scale 2.0`, revisit the screen, inspect clipping/overlap and reach every control by scrolling. Restore original scale.
3. Inspect UI hierarchy labels, order, roles and actionable bounds. On the tested Pixel density 420, 48 dp is 126 pixels. A hierarchy is not proof of spoken output or complete focus behavior.
4. Enable the installed TalkBack service through Android accessibility settings; test forward/back focus, headings, modal containment, readout, disabled/busy/error states and return focus. Capture focused hierarchy. Record which checks were actually observed and restore prior settings. Audio/speech correctness requires a listener or supported audio capture.
5. Test input labels, keyboard opening, focused-field visibility, validation messages and keyboard dismissal; use test-only data and do not submit live requests without authorization.
6. Check light/dark contrast, system and app text scaling, safe areas/navigation bars, reduced motion and touch targets. Camera denial, retry and gallery permissions require explicit cases; emulator images do not establish physical camera quality.

Authenticated account switching, expiry/revocation, background/reconnect replay, actual uploads and matching server receipts require the deployment and approved test accounts in `LIVE_INTEGRATION_ACCEPTANCE.md`.

## iOS

Use a supported iPhone/development build or a Mac with an iOS simulator. Repeat the 73-state, VoiceOver, Dynamic Type, safe-area, keyboard, permission and restart/network journeys with iOS-specific evidence. Windows iOS exports cannot establish these results.
