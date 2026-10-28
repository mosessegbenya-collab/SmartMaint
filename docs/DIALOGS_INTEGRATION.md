# Shared mobile dialogs

28 October 2026. Shared confirmations, option selectors and date/time selection now use `DialogSurface` in `src/components/smart/ui.tsx`.

The surface provides a bounded scroll view, modal safe-area context, opaque themed card, common padding and a 600-point maximum width. Date selection retains its 430-point maximum. Long review/error content and the actions scroll together. On short or narrow screens the confirmation actions wrap into full-width controls. Dialogs dismiss the active keyboard when opened. Header roles and Android polite error announcements supplement existing control labels; animation is disabled.

Native testing at Android system font scale 2.0 reproduced a previous failure: error feedback made the confirmation taller than the screen, hiding its title and both actions with no scrolling. The light translucent card also allowed background text to show through. Opaque dialog-specific tokens avoid changing the ordinary card design.

The date picker wraps its month heading so both navigation controls remain visible. When seven 48-point targets cannot fit inside its card, or system text scale is at least 1.5, it uses a full-width day selector. The selected date remains explicit when browsing other months. The normal grid retains seven columns and now uses a minimum 48-point height.

The confirmation action uses a synchronous pending guard to prevent rapid taps from invoking overlapping callbacks. Back/cancel are unavailable while the callback is pending. Confirmation still checks current `disabled` eligibility, and errors keep the modal open for review/retry. This local guard supplements the backend's authorization, revision and idempotency rules; it does not replace them.

The shared `Screen` also explicitly uses Android keyboard height avoidance (iOS keeps padding avoidance). This bounds its scrolling form above the keyboard rather than allowing controls to remain underneath it.

Open `/design-system?example=confirmation` in development for fictional long-review, failure and delayed-action cases, plus the real priority/date controls. Example callbacks update only screen state and never read or write maintenance data.

See [validation evidence](../validation/current/DIALOGS_INTEGRATION_2026-10-28.md). Full screen-reader focus traversal, VoiceOver, iOS, external-keyboard navigation and all exact-reference acceptance states remain open. The Android layout checks do not establish full accessibility compliance.
