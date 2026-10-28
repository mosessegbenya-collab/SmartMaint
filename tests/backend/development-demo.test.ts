import { afterEach, expect, test, vi } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";
import { staffApi as api } from "../../src/services/staff-api";
import { DEMO } from "../../convex/lib/development";
import * as demo from "../../convex/development_demo";
import { decodeStaffResolution } from "../../src/domain/staff-access";
import { tabItems } from "../../src/navigation/tabs";

const modules = {
  "./development_demo.ts": () => import("../../convex/development_demo"),
  "./staff.ts": () => import("../../convex/staff"),
  "./administration.ts": () => import("../../convex/administration"),
  "./operations.ts": () => import("../../convex/operations"),
  "./extensions.ts": () => import("../../convex/extensions"),
  "./safety.ts": () => import("../../convex/safety"),
  "./workflows.ts": () => import("../../convex/workflows"),
  "./reporting.ts": () => import("../../convex/reporting"),
  "./_generated/test-loader-marker.js": async () => ({}),
};
const issuer = "https://mock-demo.clerk.accounts.dev";
const identity = { subject: "user_mock_demo_moses", issuer, tokenIdentifier: `${issuer}|user_mock_demo_moses`, email: DEMO.email, emailVerified: true };
const prepare = makeFunctionReference<"mutation", Record<string, never>, Id<"departments">>("development_demo:prepare");
const bootstrap = makeFunctionReference<"mutation", {applicationId: Id<"registrationRequests">; clerkUserId: string; setupReference: typeof DEMO.setupReference}, Id<"staffAccounts">>("development_demo:bootstrap");
afterEach(() => vi.unstubAllEnvs());
async function fixture() {
  vi.stubEnv("CONVEX_CLOUD_URL", DEMO.url);
  vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", issuer);
  const t = convexTest(schema, modules);
  const departmentId = await t.mutation(prepare, {});
  const signed = t.withIdentity(identity);
  const application = { fullName: DEMO.name, staffId: "CCT-demo-0002", departmentId, requestedRole: "Administrator" as const };
  const applicationId = await signed.mutation(api.staff.submit, application);
  const args = { applicationId, clerkUserId: identity.subject, setupReference: DEMO.setupReference };
  return { t, signed, departmentId, application, applicationId, args };
}

test("demo setup is internal and rejects missing/production/other deployment before writes", async () => {
  expect(demo.prepare).toHaveProperty("isInternal", true);
  expect(demo.bootstrap).toHaveProperty("isInternal", true);
  for (const url of ["", "https://production.convex.cloud", "https://other-dev.convex.cloud"]) {
    vi.stubEnv("CONVEX_CLOUD_URL", url);
    const t = convexTest(schema, modules);
    await expect(t.mutation(prepare, {})).rejects.toThrow(/restricted/);
    expect(await t.run(ctx => ctx.db.query("departments").take(2))).toHaveLength(0);
  }
});
test("prepare and authenticated application are idempotent and never assert institutional approval", async () => {
  const f = await fixture();
  expect(await f.t.mutation(prepare, {})).toBe(f.departmentId);
  expect(await f.signed.mutation(api.staff.submit, f.application)).toBe(f.applicationId);
  const state = await f.t.run(async ctx => ({p:await ctx.db.query("accessPolicy").first(), departments:await ctx.db.query("departments").take(2), equipment:await ctx.db.query("equipment").take(2), audit:await ctx.db.query("authorizationAudit").take(20), request:await ctx.db.get(f.applicationId)}));
  expect(state.departments).toHaveLength(1);
  expect(state.equipment).toHaveLength(1);
  expect(state.p).toMatchObject({classification:"development-demo",manualVerificationEnabled:false,institutionalPolicyReference:"",developmentPolicyReference:DEMO.policyReference});
  expect(state.request).toMatchObject({clerkUserId:identity.subject,identity:identity.tokenIdentifier,classification:"development-demo",requestedStaffId:DEMO.staffId,status:"pending"});
  expect(state.audit.filter(a=>a.action==="demo.policy")).toHaveLength(1);
});
test("prepare preserves incompatible existing records by rolling back", async () => {
  const f = await fixture();
  await f.t.run(ctx=>ctx.db.patch(f.departmentId,{name:"Existing changed department"}));
  await expect(f.t.mutation(prepare,{})).rejects.toThrow(/conflicts/);
  expect((await f.t.run(ctx=>ctx.db.get(f.departmentId)))?.name).toBe("Existing changed department");
});
test("unauthenticated, unverified and wrong verified email cannot become the intended administrator", async () => {
  const f = await fixture();
  await expect(f.t.mutation(api.staff.submit,f.application)).rejects.toThrow(/Sign in/);
  await expect(f.t.withIdentity({...identity,emailVerified:false}).mutation(api.staff.submit,f.application)).rejects.toThrow(/verified/);
  await expect(f.t.mutation(bootstrap,{...f.args,clerkUserId:"user_wrong"})).rejects.toThrow(/actual intended/);
  await f.t.run(ctx=>ctx.db.patch(f.applicationId,{email:"other@example.invalid"}));
  await expect(f.t.mutation(bootstrap,f.args)).rejects.toThrow(/actual intended/);
  expect(await f.t.run(ctx=>ctx.db.query("staffAccounts").first())).toBeNull();
});
test("pending applicant is denied all five protected areas; bootstrap creates usable scoped demo account", async () => {
  const f = await fixture();
  const reads = [api.operations.equipment,api.operations.reports,api.operations.tasks,api.extensions.preferences,api.administration.accounts] as const;
  for (const read of reads) {
    await expect(f.signed.query(read,{})).rejects.toThrow();
    await expect(f.t.query(read,{})).rejects.toThrow(/Sign in/);
  }
  const id = await f.t.mutation(bootstrap,f.args);
  const resolution = await f.signed.query(api.staff.resolve,{});
  expect(decodeStaffResolution(resolution)).toMatchObject({status:"approved",account:{id,classification:"development-demo",role:"Administrator",scope:[f.departmentId]}});
  const decoded=decodeStaffResolution(resolution);
  if (!decoded.account) throw Error("Expected decoded account");
  expect(tabItems(decoded.account).map(tab=>tab.name)).toEqual(["home","equipment","tasks","accounts","profile"]);
  expect(tabItems({...decoded.account,classification:undefined}).map(tab=>tab.name)).not.toContain("tasks");
  for (const read of reads) await expect(f.signed.query(read,{})).resolves.toBeDefined();
  expect((await f.signed.query(api.staff.departments,{})).map(d=>d.id)).toContain(f.departmentId);
  const account = await f.t.run(ctx=>ctx.db.get(id));
  expect(account?.capabilities).toEqual(expect.arrayContaining(["accounts","roles","report","assign","repair","triage"]));
  expect(account?.capabilities).not.toEqual(expect.arrayContaining(["hold"]));
  const verification = await f.t.run(ctx=>ctx.db.query("staffVerifications").first());
  expect(verification).toMatchObject({classification:"development-demo",policyReference:DEMO.policyReference});
  expect(verification?.evidenceReference).toContain("not institutional evidence");
});
test("demo reporting, triage, assignment and repair work while clinical release stays unavailable", async () => {
  const f=await fixture(); const id=await f.t.mutation(bootstrap,f.args);
  const [equipment]=await f.signed.query(api.operations.equipment,{});
  const reportId=await f.signed.mutation(api.operations.submitReport,{equipmentId:equipment._id,operationId:"MOCK-DEMO-REPORT",category:"Electrical/Power",symptoms:"Fictional fault",description:"Synthetic local test",priority:"Routine",condition:"Unknown",inUse:false,noticedAt:Date.now()-1});
  await f.signed.mutation(api.operations.triage,{id:reportId,priority:"Routine",reason:"Development triage"});
  const taskId=await f.signed.mutation(api.operations.createTask,{reportId,dueAt:Date.now()+86400000});
  expect((await f.signed.query(api.operations.technicians,{departmentId:f.departmentId})).map(a=>a.id)).toContain(id);
  await f.signed.mutation(api.operations.assign,{id:taskId,expectedRevision:1,assigneeId:id,dueAt:Date.now()+86400000,reason:"Development assignment"});
  await f.signed.mutation(api.operations.recordWork,{id:taskId,expectedRevision:2, expectedWorkflowRevision: 1,diagnosis:"Fictional training diagnosis",notes:"Demo only",parts:[],complete:true});
  expect((await f.signed.query(api.operations.tasks,{})).find(t=>t._id===taskId)?.state).toBe("Completed");
  const status=await f.signed.query(api.safety.releaseStatus,{equipmentId:equipment._id});
  expect(status.available).toBe(false); expect(status.canRelease).toBe(false);
  const safetyConfig=makeFunctionReference<"mutation">("safety:configurePolicy");
  await expect(f.t.mutation(safetyConfig,{departmentId:f.departmentId,version:"smartmaint-safety-v1",approvedReference:"DEMO",enabled:true,technicalChecks:["Test"],clinicalChecks:[],clinicalRequired:false,releaseRoles:["Unit Head"]})).rejects.toThrow(/disabled/);
  expect(await f.t.run(ctx=>ctx.db.query("safetyPolicies").first())).toBeNull();
});
test("receipt closes bootstrap, exact retry is harmless and does not lift suspension", async () => {
  const f=await fixture(); const id=await f.t.mutation(bootstrap,f.args);
  expect(await f.t.mutation(bootstrap,f.args)).toBe(id);
  await f.t.run(ctx=>ctx.db.patch(id,{status:"suspended"}));
  expect(await f.t.mutation(bootstrap,f.args)).toBe(id);
  expect((await f.signed.query(api.staff.resolve,{})).status).toBe("suspended");
  await expect(f.signed.query(api.operations.equipment,{})).rejects.toThrow(/approved/);
  expect(await f.t.run(ctx=>ctx.db.query("staffAccounts").take(2))).toHaveLength(1);
  expect((await f.t.run(ctx=>ctx.db.query("authorizationAudit").take(20))).filter(a=>a.action==="demo.bootstrap")).toHaveLength(1);
  expect(await f.t.run(ctx=>ctx.db.query("faultReports").take(2))).toHaveLength(1);
});
test("normal dashboard pagination and draft/publication APIs support the demo administrator", async () => {
  const f=await fixture(); await f.t.mutation(bootstrap,f.args);
  const paginationOpts={cursor:null,numItems:20};
  const equipment=await f.signed.query(api.workflows.equipmentPage,{departmentId:f.departmentId,paginationOpts});
  expect(equipment.page).toHaveLength(1);
  const reports=await f.signed.query(api.workflows.reportPage,{departmentId:f.departmentId,paginationOpts});
  const tasks=await f.signed.query(api.workflows.taskPage,{departmentId:f.departmentId,paginationOpts});
  expect(reports.page).toHaveLength(1); expect(tasks.page).toHaveLength(1);
  await expect(f.signed.query(api.workflows.taskDetail,{id:tasks.page[0]._id})).resolves.toBeDefined();
  await expect(f.signed.query(api.workflows.inbox,{paginationOpts})).resolves.toBeDefined();
  const draft=await f.signed.mutation(api.reporting.saveDraft,{equipmentId:equipment.page[0]._id,operationId:"MOCK-DEMO-DRAFT",category:"Electrical/Power",symptoms:"Fictional demo draft",description:"Synthetic local test",priority:"Routine",condition:"Unknown",inUse:false,noticedAt:Date.now()-1,emergency:false});
  expect(await f.signed.mutation(api.reporting.publish,{id:draft.id,expectedRevision:draft.revision,expectedAttachmentRevision:0})).toBe(draft.id);
  expect(await f.signed.query(api.workflows.hasUnreadNotice,{})).toBe(true);
});
test("normal staff administration approves demo declarations without institutional verification or safety authority", async () => {
  const f=await fixture(); await f.t.mutation(bootstrap,f.args);
  const subject="user_mock_second_demo";
  const applicant=f.t.withIdentity({...identity,subject,tokenIdentifier:`${issuer}|${subject}`,email:"fictional-demo@example.invalid"});
  const requestId=await applicant.mutation(api.staff.submit,{fullName:"Fictional demo applicant",staffId:"DEMO-STAFF-003",departmentId:f.departmentId,requestedRole:"Clinician"});
  await expect(applicant.query(api.operations.equipment,{})).rejects.toThrow(/approved/);
  await f.signed.mutation(api.administration.verify,{id:requestId,expectedRevision:1,outcome:"verified",verifiedStaffId:"DEMO-STAFF-003",verifiedFullName:"Fictional demo applicant",evidenceReference:"DEMO-REVIEW-ONLY"});
  await f.signed.mutation(api.administration.approve,{id:requestId,expectedRevision:2,approvedRole:"Clinician",capabilities:["report","clinical"],scope:[f.departmentId],grantableRoles:[],reason:"Development demo approval only"});
  expect((await applicant.query(api.staff.resolve,{})).status).toBe("approved");
  const [task]=await f.signed.query(api.operations.tasks,{});
  // Even a privileged accidental policy insert must not enable demo clinical actions.
  await f.t.run(ctx=>ctx.db.insert("safetyPolicies",{departmentId:f.departmentId,active:true,version:"smartmaint-safety-v1",approvalReference:"MOCK-ONLY",technicalChecks:["Mock check"],clinicalChecks:["Mock clinical check"],clinicalRequired:true,releaseRoles:["Unit Head"],configuredAt:Date.now()}));
  await expect(applicant.mutation(api.safety.verify,{taskId:task._id,expectedRevision:1,kind:"clinical",outcome:"pass",checks:[],notes:"",evidenceReference:"DEMO",operationId:"test"})).rejects.toThrow(/safety policy/);
  const p=await f.t.run(ctx=>ctx.db.query("accessPolicy").first());
  expect(p?.manualVerificationEnabled).toBe(false);
});
test("demo account cannot escape deployment, classification, department or self-approval checks", async () => {
  const f=await fixture(); const id=await f.t.mutation(bootstrap,f.args);
  await expect(f.signed.mutation(api.administration.verify,{id:f.applicationId,expectedRevision:2,outcome:"verified",verifiedStaffId:DEMO.staffId,verifiedFullName:DEMO.name,evidenceReference:"DEMO"})).rejects.toThrow(/Self/);
  await expect(f.signed.mutation(api.administration.changeRole,{id,expectedRevision:1,role:"Administrator",capabilities:["hold"],scope:[f.departmentId],grantableRoles:[],reason:"Self escalation"})).rejects.toThrow(/own/);
  const other=await f.t.run(async ctx=>{const dept=await ctx.db.insert("departments",{code:"OTHER",name:"Other",active:true});return ctx.db.insert("equipment",{assetId:"OTHER",name:"Other",model:"Test",location:"Test",identityVerified:true,departmentId:dept});});
  await expect(f.signed.mutation(api.operations.submitReport,{equipmentId:other,operationId:"cross",category:"Electrical/Power",symptoms:"Test",description:"",priority:"Routine",condition:"Unknown",inUse:false,noticedAt:Date.now()-1})).rejects.toThrow(/scope/);
  await f.t.run(ctx=>ctx.db.patch(id,{classification:undefined}));
  await expect(f.signed.query(api.operations.equipment,{})).rejects.toThrow(/classification/);
  await f.t.run(ctx=>ctx.db.patch(id,{classification:"development-demo"}));
  vi.stubEnv("CONVEX_CLOUD_URL","https://production.convex.cloud");
  await expect(f.signed.query(api.operations.equipment,{})).rejects.toThrow(/restricted/);
  expect((await f.signed.query(api.staff.resolve,{})).status).toBe("authorization_error");
});
