import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const routePath = resolve(here, '../src/routes/_admin.customer-service.tsx');
const source = readFileSync(routePath, 'utf8');

assert.match(
  source,
  /useState<SupportConversationDetail\|null>\(null\)/,
  'Conversation detail state must remain explicitly nullable.',
);
assert.ok(
  source.includes('open={!!detail} onClose={()=>setDetail(null)}>{detail ? <>'),
  'The hidden conversation drawer must not render detail-dependent children while detail is null.',
);
assert.doesNotMatch(
  source,
  /open=\{!!detail\}[^>]*><Descriptions/,
  'Unsafe drawer rendering regression detected.',
);
assert.match(
  source,
  /Array\.isArray\(value\.messages\)\?value\.messages:\[\]/,
  'Conversation messages must be normalized before rendering.',
);

console.log('PASS customer-service route null-state regression checks (4/4)');
