const fs = require("node:fs");
const path = require("node:path");
// Exact reference filenames; multiple references may document one experience.
const groups = {
  welcome: ["medical equipment splash", "welcome with ventilator"],
  "sign-in": ["Staff Sign-In"],
  register: ["Staff Registration"],
  pending: ["application awaiting"],
  activation: ["demo account activation"],
  pin: ["PIN setup"],
  recovery: ["PIN Recovery"],
  biometric: ["biometric unlock"],
  expired: ["session expired"],
  "session-recovery": ["session recovery"],
  home: [
    "clinician home",
    "technician task dashboard",
    "supervisor home",
    "management overview",
    "admin hub",
  ],
  scan: ["QR scanner"],
  manual: ["manual equipment"],
  equipment: ["ventilator search"],
  "equipment-detail": ["ventilator details"],
  "equipment-history": ["ventilator maintenance"],
  unmatched: ["Unmatched QR"],
  provisional: ["Provisional ventilator"],
  "fault-details": ["fault details"],
  camera: ["fault photo capture"],
  attachments: ["photo attachments"],
  review: ["stage 3 fault"],
  submitted: ["Saved locally"],
  emergency: ["Emergency equipment reporting"],
  "emergency-verify": ["Emergency identity"],
  "emergency-form": ["Unverified emergency report screen"],
  "emergency-result": ["Unverified Emergency Report.png"],
  reports: ["equipment reports dashboard"],
  triage: ["priority triage"],
  filters: ["report filters"],
  "report-detail": ["report timeline"],
  tasks: ["Assigned Maintenance"],
  "task-detail": ["repair task details"],
  assignment: ["technician assignment"],
  "due-date": ["October 17"],
  progress: ["work progress"],
  diagnosis: ["diagnosis_"],
  parts: ["repair notes"],
  completion: ["Repair Complete"],
  rework: ["follow-up rework"],
  "maintenance-history": ["repair timeline"],
  "technical-queue": ["technical verification queue"],
  "technical-checklist": ["equipment safety checklist"],
  "technical-result": ["Technical Results_"],
  "clinical-queue": ["clinical verification queue"],
  "clinical-checklist": ["Clinical Safety Checklist"],
  "clinical-result": ["verification_ accessory"],
  availability: ["Safety hold blocks"],
  release: ["release checklist", "release blocked"],
  holds: ["active safety hold screen"],
  "hold-detail": ["Active Safety Hold_"],
  "status-timeline": ["safety hold timeline"],
  notifications: ["system notification"],
  "notification-settings": ["notification preferences"],
  sync: ["offline sync"],
  queue: ["pending sync queue"],
  "upload-failed": ["failed upload"],
  conflict: ["local versus"],
  accounts: ["pending signup"],
  role: ["role assignment"],
  suspend: ["account suspension"],
  reconcile: ["Restricted equipment identity"],
  audit: ["administrator audit"],
  analytics: ["administrator data quality"],
  export: ["Restricted SmartMaint export"],
  settings: ["accessibility and settings"],
  profile: ["clinician profile"],
};
const files = fs
  .readdirSync("Design")
  .filter((f) => f.endsWith(".png"))
  .sort();
const inventory = files.map((reference) => {
  const entry = Object.entries(groups).find(([, patterns]) =>
    patterns.some((p) => reference.toLowerCase().includes(p.toLowerCase())),
  );
  if (!entry) throw new Error(`Unmapped reference: ${reference}`);
  const screen = entry[0];
  const route = [
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
  ].includes(screen)
    ? screen === "welcome"
      ? "/"
      : `/access/${screen}`
    : [
          "home",
          "equipment",
          "reports",
          "tasks",
          "notifications",
          "profile",
          "accounts",
        ].includes(screen)
      ? `/workspace/${screen}`
      : `/flow/${screen}`;
  return { screen, reference: path.posix.join("Design", reference), route };
});
fs.mkdirSync("artifacts", { recursive: true });
fs.writeFileSync(
  "artifacts/design-inventory.json",
  JSON.stringify(inventory, null, 2) + "\n",
);
const rows = inventory.map(
  (i) =>
    `| ${i.screen} | ${i.reference} | ${i.route} | Not started | — | Not tested | Not tested | Not tested | Awaiting implementation/runtime evidence | Development fixture / Unconfigured | Requires correction |`,
);
fs.writeFileSync(
  "DESIGN_IMPLEMENTATION_AUDIT.md",
  `# SmartMaint design implementation audit\n\n73 supplied reference images mapped before application implementation. The extracted Design folder is authoritative; no archive extraction is needed.\n\nNo screen is accepted without runtime comparison evidence. Native Android and iOS validation are separate from web. All development records are synthetic and in memory. Clerk, Convex, production authorization, approval and release policies are unconfigured.\n\n| Screen | Reference | Route | Status | Screenshot | Visual comparison | Functional test | Accessibility | Discrepancies | Backend mode | Final disposition |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n`,
);
console.log(
  `Mapped ${inventory.length} references to ${new Set(inventory.map((i) => i.screen)).size} screen families.`,
);
