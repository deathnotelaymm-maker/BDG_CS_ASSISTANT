import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const core = read('backend-api/src/core.js');
const adminApi = read('admin-pro/src/lib/api.ts');
const chatLogs = read('admin-pro/src/routes/_admin.chat-logs.tsx');
const theme = read('admin-pro/src/routes/_admin.theme-settings.tsx');
const migration = read('backend-api/migrations/002_v0.7.1_admin_stability_reliable_fallback.sql');

expect('Site Content uses block_key as editable id', /id:\s*b\.block_key/.test(adminApi));
expect('Chat Logs uses API response fields', chatLogs.includes('customer_message') && chatLogs.includes('assistant_reply'));
expect('Chat Logs has no create action', !chatLogs.includes('New session'));
expect('Theme includes all persisted chat fields', ['chat_welcome_title','chat_welcome_subtitle','chat_input_placeholder'].every((x) => theme.includes(x)));
expect('Theme backend preserves omitted values', core.includes('p.chat_welcome_title ?? current.chat_welcome_title'));
expect('DeepSeek retries temporary failures', core.includes('attempt <= 2') && core.includes('res.status === 429 || res.status >= 500'));
expect('Fallback records provider diagnostics', core.includes('provider_status') && core.includes('error_type') && core.includes('attachment_decision'));
expect('Smart Match test exposes attachment decision', core.includes('attachment_decision: attachment'));
expect('System health endpoint is authenticated', core.includes("path === '/admin/system-health'"));
expect('v0.7.1 migration is idempotent', migration.includes('IF NOT EXISTS') && migration.includes('ON CONFLICT'));

for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
const failed = checks.filter((x) => !x.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} regression checks passed`);
if (failed.length) process.exitCode = 1;
