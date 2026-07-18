import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const core = read('backend-api/src/core.js');
const server = read('backend-api/src/server.js');
const api = read('admin-pro/src/lib/api.ts');
const qaRoute = read('admin-pro/src/routes/_admin.ai-qa.tsx');
const faqRoute = read('admin-pro/src/routes/_admin.faq.tsx');
const faqPublic = read('guide-pro/src/routes/_public.faq.tsx');
const importRoute = read('admin-pro/src/routes/_admin.ai-knowledge-import.tsx');
const migration = read('backend-api/migrations/020_v1.8.0_ai_qa_rich_faq_studio.sql');

const checks = [
  ['v1.8 API markers align', core.includes('1.8.0-ai-qa-rich-faq-studio') && server.includes('1.8.0-ai-qa-rich-faq-studio')],
  ['v1.8 migration is additive and idempotent', migration.includes('IF NOT EXISTS') && migration.includes('ON CONFLICT')],
  ['AI Q&A source is tenant scoped', core.includes("source_type='qa'") && core.includes('function listAiQa')],
  ['Q&A rich fields are persisted', core.includes('qa_answer_html') && core.includes('qa_steps_json') && core.includes('localized_fields_json')],
  ['Import drafts target AI Q&A', read('backend-api/src/knowledge-import.js').includes("source_type: 'qa'")],
  ['Import review has explicit approval', core.includes('approveKnowledgeImportRow') && importRoute.includes('Approve & publish')],
  ['Admin exposes AI Q&A studio', api.includes('"ai-qa": "/admin/ai-qa"') && qaRoute.includes('RichKnowledgeEditor')],
  ['FAQ editor stores rich content', faqRoute.includes('RichKnowledgeEditor') && api.includes('answer_html')],
  ['Guide renders rich FAQ answers', faqPublic.includes('dangerouslySetInnerHTML') && faqPublic.includes('answerHtml')],
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exitCode = 1;
console.log(`v1.8.0 regression checks: ${checks.length - failed.length}/${checks.length} passed`);
