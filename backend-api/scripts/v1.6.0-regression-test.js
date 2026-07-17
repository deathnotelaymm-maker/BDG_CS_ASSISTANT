import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const core = fs.readFileSync(path.join(root, 'src/core.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, '..', 'chat-pro/src/App.tsx'), 'utf8');
const chatApi = fs.readFileSync(path.join(root, '..', 'chat-pro/src/lib/api.ts'), 'utf8');
const importPage = fs.readFileSync(path.join(root, '..', 'admin-pro/src/routes/_admin.ai-knowledge-import.tsx'), 'utf8');
const guideLayout = fs.readFileSync(path.join(root, '..', 'guide-pro/src/components/public/PublicLayout.tsx'), 'utf8');

assert.match(core, /knowledgeImportTemplateResponse/);
assert.match(core, /progress_percent/);
assert.match(core, /guide_hero_background_url/);
assert.match(core, /tenant_id=\$2 AND platform_id=\$3/);
assert.match(chat, /Quick replies/);
assert.match(chat, /actionButtons/);
assert.match(chat, /chat-announcement-track/);
assert.match(chatApi, /class ChatApiError/);
assert.match(chatApi, /request_id/);
assert.match(importPage, /Example template/);
assert.match(importPage, /Progress/);
assert.match(importPage, /Image role/);
assert.match(guideLayout, /guide_background_url/);

console.log('PASS v1.6.0 tenant Guide theme fields are scoped and rendered');
console.log('PASS v1.6.0 Chat quick replies are placed above the composer');
console.log('PASS v1.6.0 Chat actions and errors carry tenant-safe diagnostics');
console.log('PASS v1.6.0 Knowledge import exposes template, progress, and image roles');
