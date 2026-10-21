# SmartMaint design QA

final result: blocked

Updated 2026-10-21. This is partial evidence, not visual acceptance.

All 73 approved images in Design/ are mapped in artifacts/design-inventory.json. Contact sheets and individual welcome, splash, clinician-home and sign-in references were inspected. Source references were not modified.

Native screenshots exist in artifacts/runtime/. Android captures use Pixel API 35, light appearance, default text scale, 720 x 1600 at density 280 (about 411 x 914 logical points). Source iPhone frames and OS chrome need normalization. Expo Go tools and warnings are runtime overlays.

artifacts/comparisons/welcome-iteration-1.jpg revealed invisible primary-button surfaces and incorrect hero/card proportions. Static button styles, explicit hero height, header, typography, card spacing and safe-area handling were corrected. The later valid welcome capture is artifacts/runtime/welcome-final-runtime.png. Further comparison remains required; no similarity percentage is claimed.

The previous sign-in capture showed the title preceding the hero. Source now puts a dedicated sign-in hero before the rounded form sheet. The user subsequently confirmed email-code authentication, so OTP fields replace PIN entry. This approved functional change still requires a current native screenshot comparison.

Earlier native preview testing exercised clinician entry, native tabs/icons, manual equipment lookup, fault details, camera denial, gallery cancellation, review, local submission and report-list insertion. review-verified-native.png, submitted-verified-native.png, reports-verified-native.png and saved UI dumps record that flow. These predate the Clerk integration and do not establish current auth acceptance. Some exploratory filenames describe intended destinations before navigation settled; only inspected content and saved UI assertions count as evidence.

Lint, TypeScript and 29 domain/auth-boundary tests pass. Android, iOS and web exports pass with Clerk. These are JavaScript/static exports, not signed native builds. Dependency compatibility and Expo Doctor passed on 2026-10-20; auth work added no dependencies.

Real email delivery, successful code verification and session persistence need a user-owned account and received code. No existing-application test user was created. Staff approval, backend authorization and production safety policies remain unavailable.

The current Android retest hit a Metro watcher timeout and Android/Expo Go ANRs. A retry uses CI mode to disable watching without changing app source. Runtime acceptance remains pending. A prior browser remote-debugging launch was rejected by automatic approval review; a capture without that endpoint produced no usable screenshot. No browser pass is claimed.

Every reference still needs matching-state comparison. Maintenance, independent verification, camera capture/QR, offline recovery and accessibility need device validation. Typography, spacing, frosted surfaces, colors, logo treatment and navigation require screen-by-screen review. No screen is accepted and the full SmartMaint brief is not declared finished.

See docs/AUTHENTICATION.md, docs/VALIDATION.md, docs/IMPLEMENTATION.md and DESIGN_IMPLEMENTATION_AUDIT.md.
# Staff-access native comparison — 2026-10-21

Current evidence supersedes earlier statements below that auth screens could not be captured. Actual Android Sign In and Registration rendered in Expo Go 57.0.9 on Pixel API35, 720×1600/density280, and were visually inspected. UI automation confirmed the empty-email error and navigation to registration; no real OTP or staff approval was exercised.

Side-by-side artifacts preserve each full image's aspect ratio and scale height only, so they are qualitative comparisons rather than pixel-difference measurements:

- `artifacts/comparisons/staff-sign-in.jpg` compares `Design/SmartMaint Staff Sign-In Screen-1.png` with `artifacts/runtime/staff-sign-in-native-current.png`.
- `artifacts/comparisons/staff-registration-before-fix.jpg` compares `Design/SmartMaint Staff Registration Mockup-1.png` with `artifacts/runtime/staff-registration-native-current.png`.
- `artifacts/comparisons/staff-registration-final.jpg` compares that reference with the inspected post-fix capture.

Sign In retains the approved medical hero, blue palette and rounded sheet. Remaining differences include smaller header branding, different hero crop/height, field labels and spacing, stronger text/flat surfaces, and a development-build SSO notice that pushes Apple below the initial viewport. Email-code authentication intentionally replaces the reference password/PIN interaction, per the confirmed Clerk setup. Registration adds the requested department and honest email-verification/approval language; controls use larger accessible targets and require scrolling. Header date badge, inset field icons, density and glass treatment differ from the reference. No 95% similarity or screen acceptance is claimed.

The registration comparison exposed text crossing into the equipment image. Source was corrected from 64% text width against a 45% image to disjoint 55%/45% columns, with a growing card to avoid clipping. Fresh `artifacts/runtime/staff-registration-native-final.png` was captured and inspected after reload: the overlap is resolved and text remains inside its column. The Clerk development toast and Expo Go tools overlay are runtime chrome. Intermediate splash frames are not evidence. Initial stale Metro assets and an old framebuffer required clearing/relaunch; `staff-sign-in-framebuffer-stale.png` is explicitly invalid evidence.

Live pending/rejected/approved/admin/revoked screens cannot be accepted visually or functionally without a deployment, approved verification policy and authorized identities. All 73 references still lack final acceptance. Staff security evidence and exact external gates are in VALIDATION.md and docs/STAFF_ACCESS.md.

