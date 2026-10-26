// Trusted operator CLI. Never accept client identity/email or emit tokens/credentials.
const fs = require('node:fs');
const { bindings, cli, inspect, target, expectedUrl } = require('./development-integration.cjs');
async function main() {
  const local = await inspect(false);
  if (!local.target.selected || !local.target.appUrlMatches) throw Error('Unexpected development target.');
  const env = bindings();
  const run = (name, args = {}) => JSON.parse(cli(['run', name, JSON.stringify(args), '--deployment', target], env));
  const flag = process.argv[2] ?? '--status';
  const report = { at: new Date().toISOString(), target: { kind: 'dev', name: target }, action: flag };
  if (flag === '--prepare') {
    report.departmentId = run('development_demo:prepare');
    report.status = 'development_configuration_prepared';
  } else if (flag === '--status' || flag === '--bootstrap') {
    const ready = run('development_demo:readiness');
    report.status = ready.status;
    report.authenticatedApplicationPresent = !!ready.applicationId;
    report.clerkSubjectRecorded = !!ready.clerkUserId;
    report.accountId = ready.accountId;
    if (flag === '--bootstrap') {
      if (!ready.applicationId || !ready.clerkUserId) {
        report.nextAction = 'Sign in as the intended account and click Submit development staff application at /identity-connection. No password, code or token should be shared.';
      } else {
        report.accountId = run('development_demo:bootstrap', { applicationId: ready.applicationId, clerkUserId: ready.clerkUserId, setupReference: 'DEMO-ADMIN-20261026-001' });
        report.status = 'development_administrator_provisioned_bootstrap_closed';
      }
    }
  } else if (flag === '--inspect') {
    report.snapshot = JSON.parse(cli(['run','--inline-query',`
      const p=await ctx.db.query("accessPolicy").withIndex("by_key",q=>q.eq("key","staff-access")).unique();
      const d=await ctx.db.query("departments").withIndex("by_code",q=>q.eq("code","IT-DEMO")).unique();
      const a=p?.bootstrapAccountId ? await ctx.db.get(p.bootstrapAccountId) : null;
      const r=p?.bootstrapApplicationId ? await ctx.db.get(p.bootstrapApplicationId) : null;
      return {
        department:d ? {id:d._id,code:d.code,name:d.name,classification:d.classification,active:d.active}:null,
        policy:p ? {classification:p.classification,reference:p.developmentPolicyReference,setupReference:p.developmentSetupReference,institutionalPolicyReference:p.institutionalPolicyReference,manualVerificationEnabled:p.manualVerificationEnabled,developmentReviewEnabled:p.developmentReviewEnabled,bootstrapClosed:p.bootstrapCompletedAt!==undefined}:null,
        administrator:a ? {id:a._id,name:a.fullName,staffId:a.verifiedStaffId,classification:a.classification,role:a.role,systemRole:a.systemRole,capabilities:a.capabilities,scope:a.scope,status:a.status,clerkIdentityLinked:!!r && r.emailVerified && a.clerkUserId===r.clerkUserId && a.identity===r.identity && r.accountId===a._id}:null,
        equipment:d ? (await ctx.db.query("equipment").withIndex("by_department",q=>q.eq("departmentId",d._id)).take(100)).map(e=>({id:e._id,assetId:e.assetId,name:e.name})):[],
        reports:d ? (await ctx.db.query("faultReports").withIndex("by_department",q=>q.eq("departmentId",d._id)).take(100)).map(e=>({id:e._id,symptoms:e.symptoms})):[],
        tasks:d ? (await ctx.db.query("maintenanceTasks").withIndex("by_department",q=>q.eq("departmentId",d._id)).take(100)).map(e=>({id:e._id,state:e.state,notes:e.notes})):[],
        activeSafetyPolicyCount:d ? (await ctx.db.query("safetyPolicies").withIndex("by_department_active",q=>q.eq("departmentId",d._id).eq("active",true)).take(2)).length:0,
        releaseRecordCount:d ? (await ctx.db.query("releaseRecords").withIndex("by_department",q=>q.eq("departmentId",d._id)).take(2)).length:0,
        setupAudit:d ? (await ctx.db.query("authorizationAudit").withIndex("by_department_at",q=>q.eq("departmentId",d._id)).take(100)).filter(e=>e.action.startsWith("demo.")).map(e=>({action:e.action,target:e.target,reason:e.reason})):[],
      };
    `,'--deployment',target],env));
    report.status='read_only_snapshot';
  } else if (flag === '--verify-signed-out') {
    const { ConvexHttpClient } = require('convex/browser');
    const { makeFunctionReference } = require('convex/server');
    const { ConvexError } = require('convex/values');
    const client = new ConvexHttpClient(expectedUrl, { logger: false });
    report.resolution = (await client.query(makeFunctionReference('staff:resolve'), {})).status;
    report.checks = [];
    for (const [area, name] of [['equipment','operations:equipment'],['reports','operations:reports'],['tasks','operations:tasks'],['preferences','extensions:preferences'],['administration','administration:accounts']]) {
      try { await client.query(makeFunctionReference(name), {}); report.checks.push({area,outcome:'unexpected_access'}); }
      catch (e) { report.checks.push({area,outcome:e instanceof ConvexError && e.data === 'Sign in to continue.' ? 'denied_sign_in_required' : 'request_failed'}); }
    }
    if (report.checks.some(c=>c.outcome !== 'denied_sign_in_required')) process.exitCode=1;
  } else throw Error('Use --status, --prepare, --bootstrap, --inspect or --verify-signed-out.');
  const output=JSON.stringify(report,null,2)+'\n';
  fs.mkdirSync('validation/development-demo-2026-10-26',{recursive:true});
  fs.writeFileSync(`validation/development-demo-2026-10-26/${flag.slice(2)}.json`,output);
  console.log(output);
}
main().catch(error=>{ console.error(error instanceof Error && /Read-only Convex|Unexpected development target|^Use --/.test(error.message) ? error.message : 'Development operator action failed; private output withheld.'); process.exitCode=1; });
