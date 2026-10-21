const fs = require("node:fs");
const ts = require("typescript");
// Domain and adapters are platform-independent. Transpile in memory without bundling React Native.
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { canOpenPreviewWorkspace, authErrorMessage } = require("../src/features/access/auth-policy.ts");
test("Clerk identity and loading sessions cannot enter synthetic workspaces", () => {
  const approved = { status: "approved" };
  assert.equal(canOpenPreviewWorkspace(approved, { loaded: false, signedIn: false }), false);
  assert.equal(canOpenPreviewWorkspace(approved, { loaded: true, signedIn: true }), false);
  assert.equal(canOpenPreviewWorkspace(null, { loaded: true, signedIn: false }), false);
  assert.equal(canOpenPreviewWorkspace({ status: "pending" }, { loaded: true, signedIn: false }), false);
  assert.equal(canOpenPreviewWorkspace(approved, { loaded: true, signedIn: false }), true);
});
test("Clerk structured errors and offline failures produce usable messages", () => {
  assert.equal(authErrorMessage({ errors: [{ message: "Invalid code", longMessage: "The code has expired." }] }), "The code has expired.");
  assert.equal(authErrorMessage(new Error("Network unavailable")), "Network unavailable");
  assert.match(authErrorMessage(null), /connection/);
});
const {
  allowed,
  releaseBlockers,
  validateFault,
  csvCell,
} = require("../src/domain/policy.ts");
const {
  initialState,
  demoAccount,
  equipment,
  technicalChecks,
  clinicalChecks,
} = require("../src/services/fixtures.ts");
const {
  submitReport,
  updateTask,
  verify,
  retryQueue,
  triage,
  reviewApplication,
  demoExport,
  visibleReports,
  unavailable,
} = require("../src/services/development.ts");
const clinician = demoAccount("Clinician"),
  tech = demoAccount("Biomedical Technician"),
  verifier = demoAccount("Biomedical Technician", true),
  supervisor = demoAccount("Unit Head"),
  admin = demoAccount("Administrator");
const draft = () => ({
  operationId: "test-op",
  equipmentId: "DEMO-VENT-014",
  category: "Electrical/Power",
  symptoms: "Will not start",
  description: "No indicator light.",
  priority: "High",
  condition: "Not functioning (reported)",
  inUse: false,
  noticedAt: "2026-10-16T10:24:00.000Z",
  photos: [],
  unverified: false,
});
const checks = (keys, outcome = "Pass") =>
  Object.fromEntries(keys.map((k) => [k, outcome]));
function completed() {
  let s = initialState();
  s = updateTask(s, tech, "WO-DEMO-014", {
    state: "In progress",
    notes: "Power supply inspected.",
  });
  return updateTask(s, tech, "WO-DEMO-014", {
    state: "Completed",
    notes: "Replaced power module; verified startup.",
  });
}
test("unknown, unapproved and out-of-scope accounts are denied", () => {
  assert.equal(allowed(null, "assign"), false);
  assert.equal(allowed({ ...admin, status: "pending" }, "accounts"), false);
  assert.equal(
    allowed({ ...supervisor, scope: [] }, "assign", "Critical Care"),
    false,
  );
  assert.equal(allowed(clinician, "assign"), false);
});
test("registration approver has no role, suspension or audit authority", () => {
  const a = demoAccount("Registration Approver");
  assert(allowed(a, "accounts"));
  for (const c of ["roles", "suspend", "audit", "repair"])
    assert.equal(allowed(a, c), false);
});
test("required report fields and future timestamps are rejected", () => {
  assert.equal(validateFault(draft()).length, 0);
  assert(validateFault({ ...draft(), symptoms: " ", inUse: null }).length >= 2);
  assert(validateFault({ ...draft(), noticedAt: "2099-01-01" }).length);
  assert.throws(() =>
    submitReport(
      initialState(),
      clinician,
      { ...draft(), equipmentId: "" },
      true,
    ),
  );
});
test("repeated report operation is idempotent within an account", () => {
  const first = submitReport(initialState(), clinician, draft(), true);
  const second = submitReport(first.state, clinician, draft(), true);
  assert.equal(first.report.id, second.report.id);
  assert.equal(first.state.reports.length, second.state.reports.length);
  assert.equal(second.report.sync, "Pending synchronization");
});
test("unknown identifiers remain provisional without inventory creation", () => {
  const count = equipment.length;
  const r = submitReport(
    initialState(),
    clinician,
    {
      ...draft(),
      equipmentId: "UNKNOWN-RAW-ID",
      provisional: {
        type: "Ventilator",
        location: "Critical Care",
        notes: "Asset label unclear",
      },
    },
    true,
  ).report;
  assert.equal(r.equipmentId, "UNKNOWN-RAW-ID");
  assert.equal(r.equipmentProvisional, true);
  assert.equal(r.unverified, false);
  assert.equal(equipment.length, count);
});
test("reports outside known equipment scope are denied", () => {
  assert.throws(
    () =>
      submitReport(
        initialState(),
        { ...clinician, scope: ["Emergency"] },
        draft(),
        true,
      ),
    /scope/,
  );
});
test("offline reports are saved locally without real acknowledgment", () => {
  const result = submitReport(initialState(), clinician, draft(), false);
  assert.equal(result.report.sync, "Saved locally");
  assert.equal(result.state.queue.at(-1).state, "Saved locally");
});
test("report records are isolated across unrelated preview accounts", () => {
  const other = { ...clinician, id: "other-clinician" };
  assert.equal(visibleReports(initialState(), other).length, 0);
});
test("only assigned technicians may repair; clinicians cannot assign", () => {
  assert.throws(() =>
    updateTask(initialState(), clinician, "WO-DEMO-014", {
      assigneeId: tech.id,
    }),
  );
  assert.throws(() =>
    updateTask(initialState(), verifier, "WO-DEMO-014", { notes: "tamper" }),
  );
  assert.throws(() =>
    updateTask(initialState(), clinician, "WO-DEMO-014", { state: "Assigned" }),
  );
});
test("supervisor assignment and due-date changes preserve historical audit", () => {
  const s = updateTask(initialState(), supervisor, "WO-DEMO-002", {
    assigneeId: tech.id,
    dueAt: "2026-10-25T17:00:00Z",
  });
  assert.equal(s.tasks[1].state, "Assigned");
  assert.equal(s.audit.length, 1);
  assert.throws(() =>
    updateTask(s, supervisor, "WO-DEMO-002", { dueAt: "invalid" }),
  );
});
test("terminal task history cannot be overwritten or cancelled", () => {
  const s = completed();
  assert.throws(
    () => updateTask(s, supervisor, "WO-DEMO-014", { state: "Cancelled" }),
    /immutable/,
  );
  assert.throws(
    () => updateTask(s, tech, "WO-DEMO-014", { notes: "rewrite" }),
    /immutable/,
  );
});
test("repair completion does not imply release", () => {
  const s = completed();
  const blockers = releaseBlockers(equipment[0], s);
  assert(blockers.includes("Active safety hold"));
  assert(blockers.some((b) => b.includes("technical")));
  assert(blockers.some((b) => b.includes("clinical")));
  assert(blockers.some((b) => b.includes("policy")));
});
test("repairing technician cannot self-verify", () => {
  assert.throws(
    () =>
      verify(
        completed(),
        tech,
        "WO-DEMO-014",
        "technical",
        checks(technicalChecks),
        "",
        true,
      ),
    /independent/,
  );
});
test("required verification checks and online connectivity are enforced", () => {
  assert.throws(
    () =>
      verify(completed(), verifier, "WO-DEMO-014", "technical", {}, "", true),
    /every/,
  );
  assert.throws(
    () =>
      verify(
        completed(),
        verifier,
        "WO-DEMO-014",
        "technical",
        checks(technicalChecks),
        "",
        false,
      ),
    /online/,
  );
  assert.throws(
    () =>
      verify(
        initialState(),
        verifier,
        "WO-DEMO-014",
        "technical",
        checks(technicalChecks),
        "",
        true,
      ),
    /completed/,
  );
});
test("clinical checks require a technical pass and separate verifier", () => {
  assert.throws(
    () =>
      verify(
        completed(),
        clinician,
        "WO-DEMO-014",
        "clinical",
        checks(clinicalChecks),
        "",
        true,
      ),
    /technical pass/,
  );
  let s = verify(
    completed(),
    verifier,
    "WO-DEMO-014",
    "technical",
    checks(technicalChecks),
    "",
    true,
  );
  const same = { ...clinician, id: verifier.id };
  assert.throws(
    () =>
      verify(
        s,
        same,
        "WO-DEMO-014",
        "clinical",
        checks(clinicalChecks),
        "",
        true,
      ),
    /independent/,
  );
  s = verify(
    s,
    clinician,
    "WO-DEMO-014",
    "clinical",
    checks(clinicalChecks),
    "",
    true,
  );
  assert.equal(s.attempts.length, 2);
  assert(releaseBlockers(equipment[0], s).length > 0);
});
test("failed verification requires reason and creates linked rework once", () => {
  const s = completed();
  assert.throws(
    () =>
      verify(
        s,
        verifier,
        "WO-DEMO-014",
        "technical",
        checks(technicalChecks, "Fail"),
        "",
        true,
      ),
    /reason/,
  );
  let next = verify(
    s,
    verifier,
    "WO-DEMO-014",
    "technical",
    checks(technicalChecks, "Fail"),
    "Power test failed",
    true,
  );
  next = verify(
    next,
    verifier,
    "WO-DEMO-014",
    "technical",
    checks(technicalChecks, "Fail"),
    "Still failing",
    true,
  );
  assert.equal(
    next.tasks.filter((t) => t.parentId === "WO-DEMO-014").length,
    1,
  );
  assert.equal(next.tasks[0].state, "Completed");
  assert.equal(next.attempts.length, 2);
});
test("positive synthetic availability requires every prerequisite", () => {
  let s = verify(
    completed(),
    verifier,
    "WO-DEMO-014",
    "technical",
    checks(technicalChecks),
    "",
    true,
  );
  s = verify(
    s,
    clinician,
    "WO-DEMO-014",
    "clinical",
    checks(clinicalChecks),
    "",
    true,
  );
  s = { ...s, holds: [] };
  const e = { ...equipment[0], releasePolicy: true };
  assert.deepEqual(releaseBlockers(e, s), []);
  assert(releaseBlockers({ ...e, verified: false }, s).length);
  s = {
    ...s,
    tasks: [...s.tasks, { ...s.tasks[0], id: "EXTRA", state: "Assigned" }],
  };
  assert(releaseBlockers(e, s).length);
});
test("new repair cycle cannot rely on old verification attempts", () => {
  let s = verify(
    completed(),
    verifier,
    "WO-DEMO-014",
    "technical",
    checks(technicalChecks),
    "",
    true,
  );
  s = {
    ...s,
    tasks: s.tasks.map((t) =>
      t.id === "WO-DEMO-014" ? { ...t, cycle: 2 } : t,
    ),
  };
  assert(
    releaseBlockers(equipment[0], s).some((b) => b.includes("technical pass")),
  );
});
test("queue retries are account isolated, offline blocked and transient backed off", () => {
  let s = initialState();
  assert.throws(() => retryQueue(s, clinician, false), /Reconnect/);
  const foreign = retryQueue(s, tech, true);
  assert.equal(foreign.queue[0].attempts, 0);
  s = retryQueue(s, clinician, true, "transient");
  assert.equal(s.queue[0].state, "Failed");
  assert(s.queue[0].nextRetryAt);
  s = retryQueue(s, clinician, true);
  assert.equal(s.queue[0].state, "Simulated acknowledgment");
});
test("rejections do not silently retry or become accepted", () => {
  const s = retryQueue(initialState(), clinician, true, "permission");
  const again = retryQueue(s, clinician, true, "success");
  assert.equal(again.queue[0].state, "Rejected");
  assert.throws(
    () => retryQueue(s, { ...clinician, status: "suspended" }, true),
    /session/,
  );
});
test("triage preserves reporter suggestion and enforces permissions", () => {
  assert.throws(() =>
    triage(initialState(), clinician, "DEMO-REP-014", "Urgent", "reason"),
  );
  const s = triage(
    initialState(),
    supervisor,
    "DEMO-REP-014",
    "Urgent",
    "Safety concern",
  );
  assert.equal(s.reports[0].priority, "High");
  assert.equal(s.reports[0].triagedPriority, "Urgent");
});
test("approval is separate from identity and limited to pending requests", () => {
  assert.throws(() =>
    reviewApplication(initialState(), clinician, "APP-001", "Approved"),
  );
  const s = reviewApplication(initialState(), admin, "APP-001", "Approved");
  assert.equal(s.applications[0].state, "Approved");
  assert.throws(() => reviewApplication(s, admin, "APP-001", "Approved"));
});
test("exports exclude pending/provisional records and neutralize formulas", () => {
  const output = demoExport(initialState(), admin);
  assert(output.includes("SYNTHETIC"));
  assert(!output.includes("DEMO-REP-014"));
  assert(output.includes("DEMO-REP-013"));
  for (const value of ["=SUM(A1)", "+cmd", "-cmd", "@cmd", "  =bad", "\tcmd"])
    assert(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.throws(() => demoExport(initialState(), clinician));
});
test("unconfigured production adapter never reports success", async () => {
  await assert.rejects(unavailable.execute(), /Clerk/);
});
test("provisional reconciliation preserves raw identity and allows authorized linked maintenance", () => {
  const {
    reconcileReport,
    createMaintenance,
  } = require("../src/services/development.ts");
  const saved = submitReport(
    initialState(),
    clinician,
    {
      ...draft(),
      equipmentId: "RAW-UNKNOWN",
      provisional: { type: "Ventilator", location: "Critical Care", notes: "" },
    },
    true,
  );
  assert.throws(
    () =>
      createMaintenance(
        saved.state,
        supervisor,
        saved.report.id,
        "2026-10-25T17:00:00Z",
      ),
    /unverified|scope|reconciled/,
  );
  assert.throws(() =>
    reconcileReport(
      saved.state,
      clinician,
      saved.report.id,
      "DEMO-VENT-014",
      "Matched asset tag",
    ),
  );
  const linked = reconcileReport(
    saved.state,
    tech,
    saved.report.id,
    "DEMO-VENT-014",
    "Matched asset tag",
  );
  assert.equal(linked.reports[0].equipmentId, "RAW-UNKNOWN");
  assert.equal(linked.reports[0].linkedEquipmentId, "DEMO-VENT-014");
  assert.equal(linked.reports[0].equipmentProvisional, false);
  assert.throws(
    () => createMaintenance(linked, supervisor, saved.report.id, ""),
    /due date/,
  );
  const withTask = createMaintenance(
    linked,
    supervisor,
    saved.report.id,
    "2026-10-25T17:00:00Z",
  );
  assert.equal(withTask.tasks.at(-1).equipmentId, "DEMO-VENT-014");
  assert.equal(withTask.tasks.at(-1).state, "Unassigned");
  assert.equal(
    createMaintenance(
      withTask,
      supervisor,
      saved.report.id,
      "2026-10-25T17:00:00Z",
    ).tasks.length,
    withTask.tasks.length,
  );
});
test("unknown department records are denied and unverified reporter remains independent of equipment identity", () => {
  assert.throws(
    () =>
      submitReport(
        initialState(),
        clinician,
        { ...draft(), equipmentId: "RAW" },
        true,
      ),
    /department/,
  );
  const r = submitReport(
    initialState(),
    clinician,
    { ...draft(), unverified: true },
    true,
  ).report;
  assert.equal(r.unverified, true);
  assert.equal(r.equipmentProvisional, false);
  assert.equal(
    visibleReports(
      { ...initialState(), reports: [{ ...r, department: "UNKNOWN" }] },
      admin,
    ).length,
    0,
  );
});
test("runtime-invalid checklist outcomes, assignments, dates and export ranges are rejected", () => {
  assert.throws(
    () =>
      verify(
        completed(),
        verifier,
        "WO-DEMO-014",
        "technical",
        checks(technicalChecks, "NOT-VALID"),
        "",
        true,
      ),
    /every/,
  );
  assert.throws(() =>
    updateTask(initialState(), supervisor, "WO-DEMO-014", { assigneeId: "" }),
  );
  assert.throws(() =>
    updateTask(initialState(), supervisor, "WO-DEMO-014", { dueAt: "" }),
  );
  assert.throws(() =>
    demoExport(initialState(), admin, { from: "2026-10-22", to: "2026-10-01" }),
  );
  assert(
    !demoExport(initialState(), admin, { priority: "Urgent" }).includes(
      "DEMO-REP-013",
    ),
  );
});
