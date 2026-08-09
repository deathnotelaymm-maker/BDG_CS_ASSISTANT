import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const staff = read('staff-pro/src/App.tsx');
const staffApi = read('staff-pro/src/api.ts');
const legacy = read('backend-api/scripts/v1.16.1-realtime-ai-worker-regression-test.js');
const ci = read('.github/workflows/ci.yml');
const productionCi = read('.github/workflows/bdg-production-release.yml');

const checks = [];
function test(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
  console.log(`PASS ${name}`);
}

const requiredAppMarkers = [
  ['Dashboard', 'Dashboard'],
  ['conversation-list', 'conversation-list'],
  ['context-panel', 'context-panel'],
  ['openStaffConversationStream', 'openStaffConversationStream'],
  ['consumeStaffEventStream', 'consumeStaffEventStream'],
  ['api.sync', 'api.sync'],
];
for (const [label, marker] of requiredAppMarkers) {
  test(`R1 authoritative Staff App contains ${label}`, staff.includes(marker));
}

test('R1 Staff API keeps authenticated Staff/Admin SSE routes',
  staffApi.includes('/staff/conversations/${conversationId}/stream?after_sequence=${afterSequence}') &&
  staffApi.includes('/admin/support/conversations/${conversationId}/stream?after_sequence=${afterSequence}') &&
  staffApi.includes('headers.set("Authorization",`Bearer ${token()}`)'));

test('R1 Staff API parses real SSE frames instead of line-delimited JSON',
  staffApi.includes('consumeStaffEventStream') &&
  staffApi.includes(String.raw`buffer.match(/\r?\n\r?\n/)`) &&
  staffApi.includes('line.startsWith("event:")') &&
  staffApi.includes('line.startsWith("data:")'));

test('R1 Staff API preserves HTTP sequence catch-up for Staff and Admin',
  staffApi.includes('/staff/conversations/${id}/sync?after_sequence=${Math.max(0,afterSequence)}') &&
  staffApi.includes('/admin/support/conversations/${id}/sync?after_sequence=${Math.max(0,afterSequence)}'));

test('legacy v1.16.1 regression now reports Staff markers individually',
  legacy.includes('staffConsoleMarkers') &&
  legacy.includes('staff console source contains ${label} marker'));

test('normal CI executes the v1.17.4-R1 source-sync guard', ci.includes('npm run test:v1174r1'));
test('production CI executes the v1.17.4-R1 source-sync guard', productionCi.includes('npm --prefix backend-api run test:v1174r1'));

console.log(`\n${checks.length}/${checks.length} v1.17.4-R1 CI/source-sync checks passed.`);
