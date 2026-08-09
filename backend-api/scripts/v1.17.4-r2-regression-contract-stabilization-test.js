import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
function test(name, condition) {
  if (!condition) throw new Error(`FAIL ${name}`);
  checks.push(name);
  console.log(`PASS ${name}`);
}

const staff = read('staff-pro/src/App.tsx');
const supportTest = read('backend-api/scripts/support-foundation-regression-test.js');
const v1161 = read('backend-api/scripts/v1.16.1-realtime-ai-worker-regression-test.js');
const v1174 = read('backend-api/scripts/v1.17.4-cs-identity-domain-promotion-menu-regression-test.js');
const r1 = read('backend-api/scripts/v1.17.4-r1-ci-source-sync-regression-test.js');
const ci = read('.github/workflows/ci.yml');
const productionCi = read('.github/workflows/bdg-production-release.yml');

const uiContractScripts = [
  'backend-api/scripts/support-foundation-regression-test.js',
  'backend-api/scripts/v1.16.1-realtime-ai-worker-regression-test.js',
  'backend-api/scripts/v1.16.2-conversation-continuity-regression-test.js',
  'backend-api/scripts/v1.16.4-sse-delivery-regression-test.js',
  'backend-api/scripts/v1.17.0-professional-support-workspace-regression-test.js',
  'backend-api/scripts/v1.17.3-support-workspace-ux-regression-test.js',
  'backend-api/scripts/v1.17.4-cs-identity-domain-promotion-menu-regression-test.js',
  'backend-api/scripts/v1.17.4-r1-ci-source-sync-regression-test.js',
].map((file) => [file, read(file)]);

test('R2 current Staff application uses Luke CS Workspace identity', staff.includes('Luke CS Workspace'));
test('R2 current Staff application does not regress to Luke Support Workspace identity', !staff.includes('Luke Support Workspace'));
test('R2 Staff application retains Team queue contract', staff.includes('{ key: "team", label: "Team" }'));
test('R2 Staff application retains Staff and Administrator login modes', staff.includes('mode==="STAFF"') && staff.includes('mode==="ADMIN"'));
test('R2 Human Support foundation no longer expects obsolete Luke Support Workspace text', !supportTest.includes("staff.includes('Luke Support Workspace')"));
test('R2 Human Support foundation checks current CS identity', supportTest.includes("dedicated CS workspace uses the current customer-service identity") && supportTest.includes("staff.includes('Luke CS Workspace')"));
test('R2 Human Support foundation checks Team queue independently', supportTest.includes('dedicated CS workspace retains the Team conversation queue'));
test('R2 Human Support foundation checks Staff and Administrator login modes independently', supportTest.includes('dedicated CS workspace exposes Staff and Administrator login modes'));
test('R2 audited support UI contract scripts contain no obsolete positive Luke Support Workspace assertion', uiContractScripts.every(([,source]) => !/includes\(['\"]Luke Support Workspace['\"]\)/.test(source)));
test('R2 v1.16.1 carry-forward guard remains diagnostic', v1161.includes('staff console source contains ${label} marker'));
test('R2 v1.17.4 product regression remains authoritative for CS identity', v1174.includes("staffApp.includes('Luke CS Workspace')"));
test('R2 R1 source-sync guard remains present', r1.includes('R1 authoritative Staff App contains ${label}'));
test('normal CI runs support foundation before carry-forward workspace suites', ci.indexOf('npm run test:support') < ci.indexOf('npm run test:v1161'));
test('normal CI executes the v1.17.4-R2 regression-contract guard', ci.includes('npm run test:v1174r2'));
test('production CI executes the v1.17.4-R2 regression-contract guard', productionCi.includes('npm --prefix backend-api run test:v1174r2'));

console.log(`\n${checks.length}/${checks.length} v1.17.4-R2 regression contract stabilization checks passed.`);
