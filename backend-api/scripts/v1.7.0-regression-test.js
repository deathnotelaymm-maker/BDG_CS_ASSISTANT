import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const core = read('backend-api/src/core.js');
const server = read('backend-api/src/server.js');
const chat = read('chat-pro/src/App.tsx');
const chatConfig = read('chat-pro/src/lib/chat-config.ts');
const guideApi = read('guide-pro/src/lib/api.ts');
const guideLayout = read('guide-pro/src/components/public/PublicLayout.tsx');
const migration = read('backend-api/migrations/019_v1.7.0_strict_tenant_routing_quick_reply_lifecycle.sql');

const checks = [
  ['v1.7 compatibility marker is aligned', core.includes('1.9.0-locale-aware-knowledge-studio') && server.includes('1.9.0-locale-aware-knowledge-studio')],
  ['Public routes use immutable public_route_key only', core.includes('WHERE p.public_route_key=$1') && !core.includes('WHERE (p.public_route_key=$1 OR p.legacy_support_platform_key=$1)')],
  ['Route identifiers never become visible brand names', core.includes('safePlatformDisplayName') && chatConfig.includes('return "Platform"') && guideApi.includes('Platform Help Center') && guideLayout.includes('Platform Help Center')],
  ['Quick replies have a persisted one-time lifecycle', core.includes('lifecycle_mode') && core.includes('quickReplyLifecycle') && migration.includes('ADD COLUMN IF NOT EXISTS lifecycle_mode')],
  ['Chat quick replies render only after tenant content loads', chat.includes('const quickQuestions = content') && chat.includes(': [];')],
  ['Chat quick replies are consumed after one click', chat.includes('usedQuickReplies') && chat.includes('visibleQuickQuestions') && chat.includes('new Set(previous).add(q)')],
  ['Quick replies are not duplicated in the start module', !chat.includes('quickQuestions={quickQuestions}') && !chat.slice(chat.indexOf('function ChatStartModule')).includes('quickQuestions')],
];

for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`v1.7.0 regression checks: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
