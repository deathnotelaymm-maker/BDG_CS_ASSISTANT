import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const corePath = path.resolve(import.meta.dirname, '../src/core.js');
const core = fs.readFileSync(corePath, 'utf8');
const match = core.match(/function knowledgeImportOut\(batch, previewRows = \[\]\) \{[\s\S]*?\n\}/);
assert.ok(match, 'knowledgeImportOut must be present');

const knowledgeImportOut = vm.runInNewContext(`(${match[0]})`);
const previewRows = [{ row_number: 2, mapped: { question: 'Where is my deposit?' } }];
const output = knowledgeImportOut({
  id: 12,
  filename: 'knowledge.xlsx',
  platform_key: 'default',
  status: 'review',
  sheet_count: 1,
  total_rows: 1,
  valid_rows: 1,
  error_rows: 0,
  summary_json: '{}',
}, previewRows);

assert.strictEqual(output.preview_rows, previewRows);
console.log('PASS Knowledge import preview response returns preview_rows without a ReferenceError');
