const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { getFunctionName } = require('convex/server');
const cache = new Map();
let raw = [], params = {}, queryData = {}, mode = 'live', dark = false;
const account = { id: 'staff', name: 'TEST Staff', staffId: 'TEST-001', email: 'test@example.invalid', role: 'Administrator', scope: ['department'], capabilities: ['report','assign','repair','clinical','technical','reconcile','export','analytics','accounts','audit','hold'] };
const preferences = { theme: 'system', largeText: true, bold: false, contrast: false, reducedMotion: true, notifications: {} };
function View({ children }) {
  for (const child of React.Children.toArray(children)) if (typeof child === 'string' || typeof child === 'number') raw.push(child);
  return React.createElement('div', null, children);
}
function Text({ children }) { return React.createElement('span', null, children); }
const native = { View, Text, ScrollView: View, KeyboardAvoidingView: View, Pressable: View, Modal: () => null, TextInput: () => null, Switch: () => null, Image: () => null, Platform: { OS: 'web' }, StyleSheet: { create: s => s } };
const mocks = {
  'react': React,
  'react-native': native,
  'react-native-safe-area-context': { SafeAreaView: View },
  '@expo/vector-icons/Ionicons': () => null,
  'expo-crypto': { randomUUID: () => 'TEST-only' },
  'expo-router': { usePathname: () => '/flow/test', useLocalSearchParams: () => params, router: { push() {}, replace() {}, canGoBack: () => true, back() {} } },
  'convex/react': { useQuery: (ref, args) => args === 'skip' ? undefined : queryData[getFunctionName(ref)], useMutation: () => async () => undefined, usePaginatedQuery: () => ({ results: [], status: 'Exhausted', isLoading: false, loadMore() {} }) },
  '@/state/app-state': { useApp: () => ({ account, mode, preferences, dark, state: { queue: [] }, setPreferences() {}, signOut() {} }) },
  '@/features/access/identity': { useIdentity: () => ({ email: account.email, signedIn: true, refresh: async () => {}, signOut: async () => {} }) },
  '@/features/staff/provider': { useStaffAccess: () => ({ account, connected: true }) },
  '@/features/staff/operational-screens': { ScopeSelect: () => null },
  '@/components/smart/date-time-field': { DateTimeField: () => null },
  '@/navigation/go': { go() {} },
};
function load(file) {
  file = path.resolve(file);
  if(cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} }; cache.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  new Function('require','module','exports',code)(name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/assets/')) return 1;
    const candidate = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
    if (!candidate) return require(name);
    const alias = '@/'+path.relative(path.resolve('src'), candidate).replaceAll('\\','/');
    if(alias in mocks) return mocks[alias];
    for(const suffix of ['', '.tsx', '.ts']) if(fs.existsSync(candidate+suffix) && fs.statSync(candidate+suffix).isFile()) return load(candidate+suffix);
    throw Error('Missing module '+name);
  }, mod, mod.exports);
  return mod.exports;
}
const settings = load('src/features/workflows/settings.tsx');
const profile = load('src/features/workspace/profile.tsx');
const management = load('src/features/staff/management-screens.tsx');
const equipment = load('src/features/staff/equipment-status.tsx');
const reports = load('src/features/staff/report-results.tsx');
const safety = load('src/features/staff/safety-screens.tsx');
const review = load('src/features/staff/identity-review.tsx');
let count = 0;
function check(Component, props, expected, unexpected) {
  raw = [];
  const html = renderToStaticMarkup(React.createElement(Component, props));
  assert.deepEqual(raw, [], 'Native layout containers received raw text');
  if(expected)assert.ok(html.includes(expected), 'Missing state: '+expected);
  if(unexpected)assert.ok(!html.includes(unexpected), 'Premature state: '+unexpected);
  count++;
}
for(const appearance of [false,true]) {
 dark = appearance;
 for(const screen of settings.settingsScreens) check(settings.SettingsWorkflow,{screen});
 for(const currentMode of ['preview','live']) { mode=currentMode; check(profile.AccountProfile,{},'Profile and Security'); }
 mode='live';
 delete queryData['workflows:reportDetail'];
 check(reports.ReportReceipt,{id:'unresolved'},'Checking Report Status','Server receipt confirmed');
 check(management.ManagementAnalytics,{},'Loading authorized');
 queryData['operations:managementSummary']={ limit:100, limited:true, equipment:3,reports:1,openTasks:1,activeHolds:1,completeRecords:2,incompleteRecords:1,verifiedIdentities:2,scopeCount:1,completedRepairs:1,priorities:[{label:'High',count:1}] };
 check(management.ManagementAnalytics,{},'Data Completeness');
 delete queryData['operations:managementSummary'];
 check(management.ReportsExport,{},'Generate CSV');
 queryData['operations:holds']=[];
 check(equipment.EquipmentHolds,{id:'equipment'},'No holds have been recorded');
 queryData['operations:holds']=[{_id:'hold',active:true,createdAt:100,createdBy:'TEST staff',reason:'TEST restriction'}];
 check(equipment.EquipmentHolds,{id:'equipment',details:true},'Active safety hold');
 queryData['operations:holds'][0]={...queryData['operations:holds'][0],active:false,resolvedAt:200,resolvedBy:'TEST reviewer',resolutionReason:'TEST resolution'};
 check(equipment.EquipmentHolds,{id:'equipment',details:true},'Hold resolved');
 queryData['workflows:equipmentStatus']={ equipment:{assetId:'TEST-DEVICE',name:'Test equipment',location:'Test bay'},events:[{id:'event',at:100,title:'Safety hold raised',detail:'TEST only',kind:'hold'}],limit:50,limited:false };
 check(equipment.EquipmentStatusTimeline,{id:'equipment'},'Safety hold raised');
 queryData['workflows:reportDetail']={_id:'report',category:'TEST category',symptoms:'TEST fault',createdAt:100,priority:'High',submissionState:'draft'};
 check(reports.ReportReceipt,{id:'report'},'Saved as a draft');
 queryData['workflows:reportDetail'].submissionState='submitted';
 check(reports.ReportReceipt,{id:'report',emergency:true},'Server receipt confirmed');
 check(reports.UnmatchedEquipment,{identifier:'TEST-unknown'},'TEST-unknown');
 check(reports.UnmatchedEquipment,{},'No identifier supplied');
 queryData['safety:releaseStatus']={available:false,blockers:['TEST restriction'],eligible:false,canRelease:false,expectedTaskRevision:null,policyReference:null};
 check(safety.ReleaseScreen,{id:'equipment'},'Not released for service');
 queryData['safety:releaseStatus']={available:true,blockers:[],eligible:true,canRelease:true,expectedTaskRevision:1,policyReference:'TEST-only policy'};
 check(safety.ReleaseScreen,{id:'equipment',overview:true},'Released for service');
 queryData['safety:verificationContext']={task:{_id:'task',state:'Completed',revision:1,cycle:1,equipmentId:'equipment',assigneeId:'other',diagnosis:'TEST work'},policy:null,attempts:[]};
 check(safety.VerificationScreen,{id:'task',kind:'technical'},'Verification is disabled');
 check(safety.VerificationScreen,{id:'task',kind:'clinical',view:'result'},'No clinical verification decision');
 check(review.IdentityReview,{},'No unverified reports');
}
console.log(`PASS: ${count} light/dark render cases with large text; no raw layout text. Native controls and backend hooks were stubbed; this is not device or screenshot acceptance.`);
