import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { importedRowToAiContentDraft, parseKnowledgeWorkbook } from '../src/knowledge-import.js';

const book = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ['Question', 'How to reply/Answer', 'Photo/Picture', 'Corresponding Ticket', 'Positive examples', 'Negative examples', 'AI instruction'],
  ['Can I chnage my bank name?', 'Verify identity and submit a bank-name change request.', 'bank-name.png', 'Bank name change', 'change bank name\nname typo in bank', 'How to bind a card?', 'Use simple English and ask only for the required details.'],
  ['', 'Missing question must be reviewed', '', '', '', '', ''],
]);
XLSX.utils.book_append_sheet(book, sheet, 'Bank name change');
const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
const parsed = parseKnowledgeWorkbook(buffer);

assert.equal(parsed.sheet_count, 1);
assert.equal(parsed.total_rows, 2);
assert.equal(parsed.valid_rows, 1);
assert.equal(parsed.error_rows, 1);
assert.equal(parsed.rows[0].mapped.question, 'Can I chnage my bank name?');
assert.equal(parsed.rows[0].mapped.ticket_label, 'Bank name change');
assert.ok(parsed.rows[0].warnings.some((warning) => warning.includes('Image reference')));
assert.ok(parsed.rows[0].warnings.some((warning) => warning.includes('Ticket label')));
assert.match(parsed.rows[1].validation_error, /Question is required/);

const draft = importedRowToAiContentDraft({ ...parsed.rows[0].mapped, source_sheet:'Bank name change', source_row:2 }, 'bdg-india', 22);
assert.equal(draft.status, 'draft');
assert.equal(draft.approval_status, 'draft');
assert.equal(draft.platform_scope, 'bdg-india');
assert.equal(draft.route_policy, 'ticket_optional');
assert.equal(draft.import_batch_id, 22);
assert.match(draft.knowledge_content, /Approved knowledge/);

console.log('PASS Knowledge workbook creates reviewable drafts');
console.log('PASS Missing Question is rejected before draft creation');
console.log('PASS Ticket and image references remain review notes');
console.log('PASS Imported draft is not eligible for live AI routing');

