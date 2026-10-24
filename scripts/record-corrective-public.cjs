const fs = require('node:fs');
const path = require('node:path');
const refs = JSON.parse(fs.readFileSync('artifacts/design-inventory.json', 'utf8'));
const files = ['SmartMaint Staff Sign-In Screen-1.png', 'SmartMaint Staff Registration Mockup-1.png'];
for (const name of files) {
  const index = refs.findIndex((r) => path.basename(r.reference) === name);
  if (index < 0) throw Error('Reference missing');
  const folder = `validation/screens/${String(index + 1).padStart(2, '0')}`;
  const file = `${folder}/evidence.json`; const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!fs.existsSync(`${folder}/implementation.png`) || !fs.existsSync(`${folder}/comparison.png`)) throw Error('Actual capture and comparison are required');
  record.screenshot = `${folder}/implementation.png`; record.comparison = `${folder}/comparison.png`;
  record.visual = 'Compared; FAIL / needs correction, not accepted'; record.accessibility = 'Labeled native controls observed; full accessibility testing pending';
  record.controls = name.includes('Sign-In') ? 'Empty email rejected; Request an account navigates (2 sampled controls pass; authentication not completed)' : 'Picker opens; Unit Head selection updates requested value; cancel preserves value; empty submission rejected (4 sampled controls pass; account creation not completed)';
  record.discrepancies = name.includes('Sign-In') ? 'Email-code strategy differs intentionally from password reference; logo scale, heading size, spacing, field treatment and flat surfaces need correction.' : 'Header/date chip, field treatment/icons, spacing, glass and extra requested department differ. Text/image columns do not overlap at the sampled default font size.';
  record.finalStatus = 'Partial / Blocked'; record.runtime = 'Pixel API35 Android debug x86_64 development build; public unsigned-in screen only';
  record.supplementalScreenshots = (name.includes('Sign-In') ? ['corrective-native-email-validation'] : ['corrective-native-role-picker','corrective-native-requested-role','corrective-native-role-cancel','corrective-native-registration-validation']).map((f) => `artifacts/runtime/${f}.png`);
  for (const screenshot of record.supplementalScreenshots) if (!fs.existsSync(screenshot)) throw Error(`Missing inspected control evidence: ${screenshot}`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n');
  // Patch the generated baseline matrix without inferring a visual pass.
  let matrix = fs.readFileSync('SMARTMAINT_73_SCREEN_MATRIX.md', 'utf8');
  matrix = matrix.split('\n').map((line) => line.includes(`| ${name} |`) ? line.replace('| None | Not tested | Not tested |', `| ${record.screenshot} | Compared: needs correction | Full test pending |`) : line).join('\n');
  fs.writeFileSync('SMARTMAINT_73_SCREEN_MATRIX.md', matrix);
}
const welcomeIndex = refs.findIndex((r) => r.screen === 'welcome');
if (welcomeIndex < 0) throw Error('Welcome reference missing');
const welcomeFolder = `validation/screens/${String(welcomeIndex + 1).padStart(2, '0')}`;
const welcomeFile = `${welcomeFolder}/evidence.json`; const welcome = JSON.parse(fs.readFileSync(welcomeFile, 'utf8'));
welcome.screenshot = 'artifacts/runtime/corrective-native-welcome.png';
if (!fs.existsSync(welcome.screenshot)) throw Error('Inspected welcome capture missing');
welcome.controls = 'Staff Sign In opens the actual sign-in form (1 sampled control passes)';
welcome.visual = 'Captured; comparison pending'; welcome.runtime = 'Pixel API35 Android debug development build; public welcome only';
welcome.accessibility = 'Action labels inspected; 1.3x font sample returns to Welcome after activity recreation; full accessibility acceptance pending';
welcome.supplementalScreenshots = ['artifacts/runtime/corrective-native-large-text.png'];
fs.writeFileSync(welcomeFile, JSON.stringify(welcome, null, 2) + '\n');
console.log('Recorded 2 inspected native comparisons and 7 sampled public controls; zero complete-screen or visual passes.');
