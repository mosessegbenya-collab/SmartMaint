const fs = require("node:fs");
const inventory = JSON.parse(
  fs.readFileSync("artifacts/design-inventory.json", "utf8"),
);
const evidence = fs.existsSync("artifacts/runtime-evidence.json")
  ? JSON.parse(fs.readFileSync("artifacts/runtime-evidence.json", "utf8"))
  : {};
const families = {
  "src/features/access/screens.tsx": [
    "welcome",
    "sign-in",
    "register",
    "pending",
    "activation",
    "pin",
    "recovery",
    "biometric",
    "expired",
    "session-recovery",
  ],
  "src/features/workspace/dashboard.tsx": ["home"],
  "src/features/workspace/lists.tsx": ["equipment", "reports", "tasks"],
  "src/features/workspace/support.tsx": [
    "profile",
    "accounts",
    "notifications",
  ],
  "src/features/workflows/reporting.tsx": [
    "scan",
    "manual",
    "unmatched",
    "provisional",
    "fault-details",
    "camera",
    "attachments",
    "review",
    "submitted",
    "emergency-form",
    "emergency-review",
    "emergency-result",
  ],
  "src/features/workflows/emergency.tsx": ["emergency", "emergency-verify"],
  "src/features/workflows/equipment.tsx": [
    "equipment-detail",
    "equipment-history",
    "availability",
    "release",
    "holds",
    "hold-detail",
    "status-timeline",
  ],
  "src/features/workflows/maintenance.tsx": [
    "task-detail",
    "assignment",
    "due-date",
    "cancellation",
    "progress",
    "diagnosis",
    "parts",
    "completion",
    "rework",
    "maintenance-history",
  ],
  "src/features/workflows/verification.tsx": [
    "technical-queue",
    "technical-checklist",
    "technical-result",
    "technical-history",
    "clinical-queue",
    "clinical-checklist",
    "clinical-result",
    "clinical-history",
  ],
  "src/features/workflows/settings.tsx": [
    "settings",
    "notification-settings",
    "help",
  ],
  "src/features/workflows/sync.tsx": [
    "sync",
    "queue",
    "upload-failed",
    "conflict",
  ],
  "src/features/workflows/admin.tsx": [
    "role",
    "suspend",
    "reconcile",
    "audit",
    "analytics",
    "export",
  ],
  "src/features/workflows/reports.tsx": ["report-detail", "triage", "filters"],
  "src/features/workflows/more.tsx": ["more"],
};
const implementation = (screen) =>
  Object.entries(families).find(([, screens]) =>
    screens.includes(screen),
  )?.[0] ?? "UNMAPPED";
const clean = (s) => String(s).replaceAll("|", " / ").replaceAll("\n", "; ");
const rows = inventory.map((item) => {
  const e = evidence[item.reference] ?? {};
  return [
    item.screen,
    item.reference,
    `${item.route}; ${implementation(item.screen)}`,
    e.accepted ? "Implemented" : "In progress",
    e.screenshot ?? "Not captured",
    e.visualResult ?? "Not tested",
    e.functionalResult ?? "Not tested",
    e.accessibility ?? "Not tested",
    e.discrepancies ??
      "Runtime comparison and workflow evidence required; production integration unconfigured",
    "Isolated preview or guarded staff source; deployment/policy unconfigured",
    e.accepted ? "Accepted" : "Requires correction / verification",
  ].map(clean);
});
const experiences = [
  ["welcome"],
  ["sign-in"],
  ["register"],
  ["pending"],
  ["activation"],
  ["pin"],
  ["recovery"],
  ["biometric"],
  ["expired", "session-recovery"],
  ["home"],
  ["home"],
  ["home"],
  ["home"],
  ["home"],
  ["scan"],
  ["manual", "equipment"],
  ["equipment-detail"],
  ["availability", "equipment-history"],
  ["unmatched"],
  ["provisional", "hold-detail"],
  ["manual"],
  ["equipment-detail"],
  ["fault-details"],
  ["camera", "attachments", "review"],
  ["submitted", "emergency-result"],
  ["report-detail"],
  ["triage"],
  ["reports", "filters"],
  ["tasks"],
  ["task-detail"],
  ["assignment"],
  ["due-date"],
  ["cancellation"],
  ["progress"],
  ["diagnosis"],
  ["completion"],
  ["parts"],
  ["rework"],
  ["maintenance-history"],
  ["technical-queue"],
  ["technical-checklist"],
  ["technical-result"],
  ["technical-history"],
  ["clinical-queue"],
  ["clinical-checklist"],
  ["clinical-checklist"],
  ["clinical-result"],
  ["clinical-history"],
  ["availability", "release"],
  ["holds"],
  ["hold-detail"],
  ["status-timeline"],
  ["notifications"],
  ["notification-settings"],
  ["sync"],
  ["queue"],
  ["upload-failed"],
  ["conflict"],
  ["session-recovery"],
  ["accounts"],
  ["role"],
  ["suspend"],
  ["reconcile"],
  ["audit"],
  ["analytics"],
  ["export"],
  ["profile", "settings", "more", "help"],
];
const plan = fs.readFileSync("PLAN.md", "utf8");
const checklist = [...plan.matchAll(/- \[[ x]\] (\d{2})\. (.+)/g)];
if (checklist.length !== 67 || experiences.length !== 67)
  throw Error("Expected exactly 67 plan experiences");
const coverage = checklist.map(
  (m, i) =>
    `| ${m[1]} | ${m[2]} | ${experiences[i].map((s) => `${s} (${implementation(s)})`).join("; ")} | Source implemented; runtime acceptance pending |`,
);
const text = `# SmartMaint design implementation audit\n\nUpdated 2026-10-21. All 73 approved references were mapped before implementation. The user supplied the extracted Design folder, so archive extraction was not required. Reference contact sheets are in artifacts/reference/.\n\nThis is an implementation and evidence matrix, not a claim of visual acceptance. Interactive source exists for the mapped screen families. Live identity methods, approval, account authorization, Convex operations and production safety policies require configuration and verification. All operational sample data is synthetic and in memory. Domain-test passes do not establish UI, camera, navigation, accessibility or visual passes.\n\nThe Option 2 gear-and-heartbeat mark is extracted from the supplied splash reference as assets/brand/approved-logo.png; it is reused without redrawing. App icons use the same raster mark. Native operating-system chrome and accessible touch targets intentionally differ from framed mockups.\n\n## Reference evidence\n\n| Screen | Reference | Implementation | Status | Screenshot | Visual comparison | Functional test | Accessibility | Discrepancies | Backend mode | Final disposition |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.map((r) => "| " + r.join(" | ") + " |").join("\n")}\n\n## Full 67-experience coverage\n\nMultiple experiences can be states of one screen. Missing backend authorization/policies block live operations; no UI-only permission check is represented as server enforcement.\n\n| ID | PLAN.md experience | Source / screen family | Disposition |\n| --- | --- | --- | --- |\n${coverage.join("\n")}\n\n## Outstanding gates\n\n- Complete runtime screenshot capture and matching-state comparisons for every reference. No similarity percentage is claimed without a validated comparison method.\n- Complete end-to-end native navigation/workflow, camera permission/cancellation, biometric, and accessibility tests.\n- Lint, TypeScript, 29 domain/auth-boundary tests and Android/iOS/web exports pass after Clerk integration. See docs/VALIDATION.md; real email-code authentication and current native UI remain unverified.\n- Configure and verify live identity and authorized backend contracts; provide approved staff, checklist, release and hold policies.\n- Durable encrypted offline data, real acknowledgment, background retry and push/email delivery remain unavailable.\n\nSee docs/IMPLEMENTATION.md and artifacts/ for exact limitations and verification artifacts.\n`;
const staffUpdate = "Staff-access update: Convex schema, authenticated functions, scoped administration/audit and cache isolation are implemented in source. See docs/STAFF_ACCESS.md and VALIDATION.md. Verification remains disabled: the user confirmed no deployment or approved policy. Actual Android sign-in/registration captures and comparisons are recorded in design-qa.md; no final screen acceptance is claimed.\n\n";
fs.writeFileSync("DESIGN_IMPLEMENTATION_AUDIT.md", text
  .replace("Updated 2026-10-21.", staffUpdate + "Updated 2026-10-21.")
  .replace("Lint, TypeScript, 29 domain/auth-boundary tests and Android/iOS/web exports pass after Clerk integration. See docs/VALIDATION.md; real email-code authentication and current native UI remain unverified.", "Lint, TypeScript and 71 automated tests pass. Current exports and native evidence are in VALIDATION.md. Real email-code completion and live staff authorization remain unverified."));
console.log(
  `Updated ${inventory.length} references and ${experiences.length} experience rows.`,
);
