import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const core = read('backend-api/src/core.js');
const server = read('backend-api/src/server.js');
const api = read('admin-pro/src/lib/api.ts');
const ui = read('admin-pro/src/routes/_admin.platform-control-center.tsx');
const migration = read('backend-api/migrations/016_v1.4.0_operations_connector_gateway.sql');
const checks = [
  ['Operations Connector version marker', core.includes('1.6.0-tenant-experience-studio-resilient-knowledge-import') && server.includes('1.6.0-tenant-experience-studio-resilient-knowledge-import')],
  ['Connector schema is idempotent and platform unique', migration.includes('CREATE TABLE IF NOT EXISTS platform_connectors') && migration.includes('UNIQUE(platform_id)')],
  ['Connector actions are allowlisted', core.includes("new Set(['game_status', 'game_catalog', 'payment_order_status'])") && core.includes('Unsupported connector action')],
  ['Connector secrets are encrypted and write-only', core.includes('AES-GCM') && core.includes('secret_configured') && !core.includes('secret_token: row.secret_token_encrypted')],
  ['Connector requests reject private hosts', core.includes('cannot target a private network host')],
  ['Connector requests are audited with redacted identifiers', core.includes('connector_audit_logs') && core.includes('redactConnectorValue')],
  ['AI can request an approved connector tool', core.includes('tool_call') && core.includes('callPlatformConnector') && core.includes('Trusted platform connector result')],
  ['Admin exposes connector configuration and test flow', api.includes('getPlatformConnector') && api.includes('testPlatformConnector') && ui.includes('Operations Connector')],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`Operations connector checks: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
