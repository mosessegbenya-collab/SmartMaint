# Corrective 73-reference visual validation

All 73 actual supplied images were verified present and copied to validation/screens/01 through validation/screens/73. Each directory contains its reference and an evidence.json record. Numbering follows artifacts/design-inventory.json, not invented screen titles.

Current corrective-run visually accepted count: **0/73**. The matrix does not infer a pass from source, earlier screenshots or static exports. Current native build/runtime evidence is tracked separately; no loading screen, fixture screenshot or backend-blocked page is certified as a matching live workflow.

The current comparisons use the actual Android debug development build on Pixel API35: registration (15) and sign-in (16). Each has implementation.png, comparison.png and an explicit crop/normalization protocol. Earlier Expo Go images/comparisons are preserved with -expo-go filenames. Both current comparisons need correction. Remaining comparisons: 71. Welcome is captured but not compared. Seven sampled public controls passed, as listed in validation/native-checkpoint.json; this is not complete form or authentication acceptance.

Observed differences include branding scale/header/date treatment, field icons and outlines, spacing and glass/surface treatment. The email-code form follows the user's configured Clerk method instead of the password form in the reference. The native build displays Google/Apple controls without Expo Go's restriction notice; completed provider authentication is untested. Floating developer tools remain runtime chrome. Protected workflows have no live screenshot acceptance.

Inter Regular/SemiBold/Bold/ExtraBold assets are bundled from the Expo Google Fonts source with the SIL Open Font License and wired into shared typography. Existing approved brand/medical assets remain in use. All 73 references still need final matching-state acceptance, small/large viewport checks, full text scaling, screen-reader and contrast testing.

Native platform chrome and accessible targets must be documented when comparing app-owned content. No similarity percentage or pixel-perfect claim is made.

Native accessibility metadata exposed decorative glyphs in action names. Shared buttons/rows now provide explicit labels and decorative icons use accessibility-exclusion props from the [React Native 0.86 documentation](https://reactnative.dev/docs/0.86/accessibility). Native button/role-option names were rechecked. A 1.3x font-scale sample returned to Welcome after activity recreation; the captured Welcome body wraps its text, and the device scale was restored to 1.0. This is a limited sample, not registration or full screen-reader/contrast acceptance. See validation/native-font-scale.json.
