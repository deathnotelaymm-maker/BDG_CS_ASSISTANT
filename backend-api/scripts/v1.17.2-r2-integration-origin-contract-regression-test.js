import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.resolve(here, '..');
const project = path.resolve(backend, '..');
const integration = readFileSync(path.join(here, 'integration-test.js'), 'utf8');
const core = readFileSync(path.join(backend, 'src', 'core.js'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(backend, 'package.json'), 'utf8'));
const workflow = readFileSync(path.join(project, '.github', 'workflows', 'ci.yml'), 'utf8');

const checks = [];
function check(name, fn) {
  try { fn(); console.log(`PASS ${name}`); checks.push(true); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); checks.push(false); }
}

check('backend runtime carries forward the v1.17.2-r2 contract', () => assert.equal(pkg.version, '1.17.4'));
check('integration Admin fixture uses the Luke shared Admin origin', () => assert.match(integration, /const ADMIN_ORIGIN = 'https:\/\/admin\.ar-ai666\.com'/));
check('integration Admin origin remains the static test allowlist', () => assert.match(integration, /ALLOWED_ORIGINS:\s*ADMIN_ORIGIN/));
check('Admin integration requests still carry the immutable platform route header', () => assert.match(integration, /headers\.set\('X-BDG-Platform-Route',\s*platformRoute\)/));
check('unknown customer hostname mismatch protection remains explicitly tested', () => {
  assert.match(integration, /origin:'https:\/\/unmapped-customer\.example\.test'/);
  assert.match(integration, /PLATFORM_CONTEXT_MISMATCH/);
});
check('Luke shared hostnames remain excluded from custom hostname resolution', () => {
  assert.match(core, /function sharedPublicHostnames\(\)/);
  assert.match(core, /Object\.values\(LUKE_SHARED_ORIGINS\)/);
  assert.match(core, /sharedPublicHostnames\(\)\.has\(hostname\)/);
});
check('strict route-to-custom-hostname validation remains unchanged', () => assert.match(core, /Chat platform route does not match the custom hostname/));
check('CI runs the v1.17.2-r2 integration-origin regression before integration', () => {
  const guard = workflow.indexOf('npm run test:v1172r2');
  const integrationStep = workflow.indexOf('npm run test:integration');
  assert.ok(guard >= 0 && integrationStep > guard);
});
check('no migration 046 is introduced by this test-contract hotfix', () => {
  assert.equal(existsSync(path.join(backend, 'migrations', '046_v1.17.2_r2_integration_origin_contract.sql')), false);
});

const passed = checks.filter(Boolean).length;
console.log(`\n${passed}/${checks.length} v1.17.2-r2 integration origin contract checks passed.`);
if (passed !== checks.length) process.exit(1);
