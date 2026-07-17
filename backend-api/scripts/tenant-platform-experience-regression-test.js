import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const core = read('backend-api/src/core.js');
const server = read('backend-api/src/server.js');
const control = read('admin-pro/src/routes/_admin.platform-control-center.tsx');
const importPage = read('admin-pro/src/routes/_admin.ai-knowledge-import.tsx');
const theme = read('admin-pro/src/routes/_admin.theme-settings.tsx');
const layout = read('admin-pro/src/components/AdminLayout.tsx');
const checks = [
  ['Release version is aligned', core.includes('1.5.0-tenant-platform-experience-owner-controls') && server.includes('1.5.0-tenant-platform-experience-owner-controls')],
  ['Membership role queries are qualified', core.includes('tm.role AS membership_role') && core.includes('pm.role AS membership_role') && !core.includes('SELECT tm.role FROM saas_tenant_memberships')],
  ['Child platform owners can edit their own support platform', core.includes('assertScopedSupportPlatform') && core.includes('scope.legacy_support_platform_key')],
  ['One-platform UI has no child New platform action', !control.includes('>New platform</Button>') && !importPage.includes('>New platform</Button>')],
  ['Arbitrary platform languages are persisted', core.includes('supported_languages') && core.includes('normalizeLocaleList') && core.includes('JSON.parse(text)')],
  ['Platform settings editor is available', control.includes('savePlatformDetails') && control.includes('Platform settings')],
  ['Brand studio supports local uploads', control.includes('uploadBrandField') && control.includes('UploadOutlined')],
  ['Chat start studio has preview, uploads, colors, and actions', theme.includes('Chat Start Studio') && theme.includes('chat_background_url') && theme.includes('chat_start_button_ids') && theme.includes('bdg-marquee')],
  ['Admin identity/version is visible', layout.includes('Luke Admin Control') && layout.includes('AI') && layout.includes('v1.5.0')],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
const failed = checks.filter(([, ok]) => !ok);
console.log(`Tenant platform experience checks: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
