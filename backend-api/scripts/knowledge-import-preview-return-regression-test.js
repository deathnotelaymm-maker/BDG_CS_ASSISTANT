import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const corePath = path.resolve(import.meta.dirname, '../src/core.js');
const core = fs.readFileSync(corePath, 'utf8');
const match = core.match(/function knowledgeImportOut\(batch, previewRows = \[\]\) \{[\s\S]*?\n\}/);
assert.ok(match, 'knowledgeImportOut must remain available for preview responses');

const knowledgeImportOut = vm.runInNewContext(`(${match[0]})`);
const previewRows = [{ sheet_name: 'Deposit', row_number: 2, mapped: { question: 'Where is my deposit?' } }];
const result = knowledgeImportOut({
  id: 91,
  filename: 'knowledge.xlsx',
  platform_key: 'default',
  summary_json: '{}',
}, previewRows);

assert.strictEqual(result.preview_rows, previewRows);
assert.equal(result.id, 91);
assert.equal(result.filename, 'knowledge.xlsx');
console.log('PASS Knowledge import preview response returns preview_rows without a ReferenceError');
