import * as XLSX from 'xlsx';

const MAX_SHEETS = 40;
const MAX_ROWS = 2000;

const HEADER_ALIASES = {
  question: ['question', 'questions', 'customer question', 'user question', 'query', 'issue'],
  answer: ['how to reply', 'how to reply answer', 'answer', 'reply', 'response', 'guidance', 'how to answer'],
  photo_ref: ['photo', 'picture', 'image', 'image key', 'photo picture', 'screenshot'],
  ticket_label: ['corresponding ticket', 'ticket', 'ticket name', 'ticket type'],
  title: ['title', 'topic', 'knowledge title'],
  positive_examples: ['positive examples', 'positive example', 'match examples'],
  negative_examples: ['negative examples', 'negative example', 'do not match'],
  instruction: ['item instruction', 'ai instruction', 'instruction'],
  locale: ['locale', 'language'],
  platform_key: ['platform', 'platform key', 'support platform'],
};

function clean(value) {
  return String(value ?? '').replace(/\r/g, '').trim();
}

export function normalizeWorkbookHeader(value) {
  return clean(value).toLowerCase().replace(/[()\[\]{}]/g, ' ').replace(/[\/_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function aliasFor(header) {
  const normalized = normalizeWorkbookHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) return field;
  }
  return '';
}

function firstNonEmpty(row = []) {
  return row.some((value) => clean(value));
}

function safeSlug(value, fallback = 'knowledge') {
  const slug = clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72);
  return slug || fallback;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildHeaderMap(rows) {
  const limit = Math.min(rows.length, 10);
  let best = null;
  for (let index = 0; index < limit; index += 1) {
    const map = {};
    let score = 0;
    rows[index].forEach((value, column) => {
      const field = aliasFor(value);
      if (field && map[field] == null) {
        map[field] = column;
        score += 1;
      }
    });
    if (!best || score > best.score) best = { index, map, score };
  }
  return best && best.map.question != null && best.map.answer != null ? best : null;
}

function valueAt(row, column) {
  return column == null ? '' : clean(row[column]);
}

function rowOut({ row, headers, sheetName, rowNumber }) {
  const question = valueAt(row, headers.question);
  const answer = valueAt(row, headers.answer);
  const localeValue = valueAt(row, headers.locale).toLowerCase();
  const locale = ['en', 'hi', 'all'].includes(localeValue) ? localeValue : 'en';
  const title = valueAt(row, headers.title) || sheetName;
  const sourceKey = `${safeSlug(sheetName)}-${stableHash(`${sheetName}|${question}|${locale}`)}`;
  const warnings = [];
  const photoRef = valueAt(row, headers.photo_ref);
  const ticketLabel = valueAt(row, headers.ticket_label);
  if (photoRef) warnings.push('Image reference kept for review. Upload the image in the visual editor after the draft is created.');
  if (ticketLabel) warnings.push('Ticket label kept for review. Bind it to an approved button only for a platform that supports tickets.');
  const errors = [];
  if (!question) errors.push('Question is required.');
  if (!answer) errors.push('How to reply / Answer is required.');
  return {
    sheet_name: sheetName,
    row_number: rowNumber,
    source_key: sourceKey,
    status: errors.length ? 'error' : 'valid',
    validation_error: errors.join(' '),
    warnings,
    mapped: {
      title,
      question,
      answer,
      positive_examples: valueAt(row, headers.positive_examples) || question,
      negative_examples: valueAt(row, headers.negative_examples),
      instruction: valueAt(row, headers.instruction),
      image_ref: photoRef,
      ticket_label: ticketLabel,
      locale,
      platform_key: safeSlug(valueAt(row, headers.platform_key), ''),
      intent_key: `import-${sourceKey}`,
    },
    raw: Object.fromEntries(Object.entries(headers).map(([field, column]) => [field, valueAt(row, column)])),
  };
}

/**
 * Parse a knowledge workbook without making any DB or network change.
 * All results are drafts; the caller decides whether to persist/publish them.
 */
export function parseKnowledgeWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: false, cellDates: false, dense: true });
  const sheetNames = workbook.SheetNames.slice(0, MAX_SHEETS);
  const rows = [];
  const sheetErrors = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    const header = buildHeaderMap(grid);
    if (!header) {
      sheetErrors.push({ sheet_name: sheetName, error: 'Could not find both Question and How to reply / Answer columns.' });
      continue;
    }
    for (let index = header.index + 1; index < grid.length && rows.length < MAX_ROWS; index += 1) {
      const source = grid[index];
      if (!firstNonEmpty(source)) continue;
      rows.push(rowOut({ row: source, headers: header.map, sheetName, rowNumber: index + 1 }));
    }
  }

  const validRows = rows.filter((row) => row.status === 'valid').length;
  const errorRows = rows.length - validRows + sheetErrors.length;
  return {
    filename: '',
    sheet_count: sheetNames.length,
    total_rows: rows.length,
    valid_rows: validRows,
    error_rows: errorRows,
    truncated: workbook.SheetNames.length > MAX_SHEETS || rows.length >= MAX_ROWS,
    sheet_errors: sheetErrors,
    rows,
  };
}

export function importedRowToAiContentDraft(mapped = {}, platformKey = 'default', batchId = null) {
  const platformScope = safeSlug(mapped.platform_key || platformKey, 'default');
  const ticketLabel = clean(mapped.ticket_label);
  return {
    title: clean(mapped.title) || 'Imported knowledge',
    intent_key: clean(mapped.intent_key),
    locale: ['en', 'hi', 'all'].includes(clean(mapped.locale)) ? clean(mapped.locale) : 'en',
    status: 'draft',
    priority: 100,
    confidence_threshold: 86,
    keywords: '',
    positive_examples: clean(mapped.positive_examples || mapped.question),
    negative_examples: clean(mapped.negative_examples),
    required_fields: '',
    faq_content: clean(mapped.answer),
    knowledge_content: `Customer question:\n${clean(mapped.question)}\n\nApproved knowledge:\n${clean(mapped.answer)}`,
    example_answers: clean(mapped.answer),
    example_answers_hi: '',
    ai_instruction: clean(mapped.instruction),
    ai_instruction_hi: '',
    rich_json: '',
    rich_html: '',
    rich_json_hi: '',
    rich_html_hi: '',
    image_urls: [],
    image_delivery: 'after_answer',
    button_ids: [],
    approval_status: 'draft',
    version_label: 'import-draft',
    platform_scope: platformScope,
    route_policy: ticketLabel ? 'ticket_optional' : 'answer_only',
    import_batch_id: batchId,
    import_source_key: clean(mapped.intent_key),
    source_sheet: clean(mapped.source_sheet),
    source_row: Number(mapped.source_row || 0),
    source_ticket_label: ticketLabel,
    source_image_ref: clean(mapped.image_ref),
  };
}

