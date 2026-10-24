# Corrective 73-reference visual validation

All 73 actual supplied images were verified present and copied to validation/screens/01 through validation/screens/73. Each directory contains its reference and an evidence.json record. Numbering follows artifacts/design-inventory.json, not invented screen titles.

Current corrective-run visually accepted count: **0/73**. The matrix does not infer a pass from source, earlier screenshots or static exports. Current native build/runtime evidence is tracked separately; no loading screen, fixture screenshot or backend-blocked page is certified as a matching live workflow.

Two references were captured and compared in this run on Pixel API35 / Expo Go57: registration (15) and sign-in (16). Each has implementation.png, comparison.png and an explicit crop/normalization protocol in its numbered folder. Both comparisons need correction. Remaining comparisons: 71. Empty-email validation and navigation to registration passed as two sampled public controls; this is not complete form or authentication acceptance.

Observed differences include branding scale/header/date treatment, field icons and outlines, spacing and glass/surface treatment. The email-code form follows the user's configured Clerk method instead of the password form in the reference. Expo Go displays runtime chrome and disables development-build-only SSO callbacks. These differences are documented rather than scored as matches. Protected workflows have no live screenshot acceptance.

Inter Regular/SemiBold/Bold/ExtraBold assets are bundled from the Expo Google Fonts source with the SIL Open Font License and wired into shared typography. Existing approved brand/medical assets remain in use. All 73 references still need final matching-state acceptance, small/large viewport checks, full text scaling, screen-reader and contrast testing.

Native platform chrome and accessible targets must be documented when comparing app-owned content. No similarity percentage or pixel-perfect claim is made.
