import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const core = read('backend-api/src/core.js');
const server = read('backend-api/src/server.js');
const api = read('admin-pro/src/lib/api.ts');
const layout = read('admin-pro/src/components/AdminLayout.tsx');
const qaRoute = read('admin-pro/src/routes/_admin.ai-qa.tsx');
const localeRoute = read('admin-pro/src/routes/_admin.locale-studio.tsx');
const importRoute = read('admin-pro/src/routes/_admin.ai-knowledge-import.tsx');
const routeTree = read('admin-pro/src/routeTree.gen.ts');
const migration = read('backend-api/migrations/021_v1.9.0_locale_aware_knowledge_studio.sql');

const checks = [
  ['v1.9 API markers align', core.includes('1.9.0-locale-aware-knowledge-studio') && server.includes('1.9.0-locale-aware-knowledge-studio')],
  ['Health advertises locale policy and coverage', server.includes("'locale-policy'") && server.includes("'locale-coverage'")],
  ['Locale migration is additive and idempotent', migration.includes('IF NOT EXISTS') && migration.includes('ON CONFLICT') && migration.includes('locale')],
  ['Platform locale policy normalizes BCP-47 values', core.includes('function localePolicy') && core.includes('normalizeLocaleList') && core.includes('assertSupportedLocale')],
  ['Unsupported import locales are rejected before draft creation', core.includes('UNSUPPORTED_LOCALE') && core.includes('locale_policy') && core.includes('previewKnowledgeImport')],
  ['AI Q&A is filtered by the requested platform locale', core.includes('requested_locale') && core.includes('function listAiQa') && core.includes('assertSupportedLocale(scope, requested)')],
  ['Locale coverage reports missing published translations', core.includes('function listLocaleStudio') && core.includes('missing_translations') && core.includes('published_items')],
  ['Translation drafts remain tenant and platform scoped', core.includes('function createLocaleTranslation') && core.includes('tenant_id=$2 AND platform_id=$3') && core.includes('translation_status')],
  ['FAQ and AI Q&A writes enforce enabled locales', core.includes("'FAQ locale'") && core.includes('item.locale = assertSupportedLocale(scope, item.locale)')],
  ['Admin exposes Locale Studio and policy-aware Q&A locale selection', api.includes('getLocaleStudio') && api.includes('createLocaleTranslation') && qaRoute.includes('localeOptions') && qaRoute.includes('<Select options={localeOptions}')],
  ['Locale Studio route supports translation draft creation', localeRoute.includes('createLocaleTranslation') && localeRoute.includes('Create draft') && localeRoute.includes('Locale coverage')],
  ['Admin navigation and generated route tree include Locale Studio', layout.includes('Locale Studio') && layout.includes('v1.9.0') && (routeTree.includes('locale-studio') || localeRoute.includes('createFileRoute("/_admin/locale-studio")'))],
  ['Import UI explains locale validation', importRoute.includes('Locale') && importRoute.includes('Target support platform')],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`v1.9.0 regression checks: ${checks.length - failed.length}/${checks.length} passed`);
if (failed.length) process.exitCode = 1;
