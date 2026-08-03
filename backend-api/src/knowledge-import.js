import ExcelJS from 'exceljs';

const aliases = {
  name: ['name', 'content name', 'item name', 'title', 'content'],
  question: ['question', 'user question', 'query', 'intent question'],
  answer: ['how to reply / answer', 'answer', 'approved answer', 'reply', 'response'],
  positive_examples: ['positive examples', 'positive example', 'examples', 'keywords'],
  negative_examples: ['negative examples', 'negative example', 'exclude examples'],
  ai_instruction: ['ai instruction', 'specific ai instruction', 'instruction'],
  locale: ['locale', 'language', 'lang'],
  platform_key: ['platform', 'platform key', 'platform_key'],
  image_url: ['image url', 'image urls', 'photo', 'picture', 'image'],
  image_role: ['image role', 'photo role', 'picture role'],
  image_alt: ['image alt', 'alt text', 'image description'],
  image_caption: ['image caption', 'caption'],
  image_placement: ['image placement', 'placement', 'delivery'],
  ticket: ['corresponding ticket', 'ticket', 'ticket label'],
  intent_key: ['intent key', 'intent', 'source key'],
};

function clean(value) {
  return String(value == null ? '' : value).replace(/\u00a0/g, ' ').trim();
}
function headerKey(value) {
  // Treat "Image Role", "ImageRole", and "image_role" as the same
  // workbook column. This keeps templates friendly to Excel users who
  // rename headers or export them from another system.
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function findColumn(headers, names) {
  const wanted = new Set(names.map(headerKey));
  return headers.findIndex((header) => wanted.has(headerKey(header)));
}
function text(value) { return clean(value); }
function slug(value) {
  return text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 150) || 'knowledge-item';
}
function splitImages(value) {
  return text(value).split(/\s*[\n,;|]\s*/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

function excelCellText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (['string', 'number', 'boolean'].includes(typeof value)) return clean(value);
  if (Array.isArray(value?.richText)) return clean(value.richText.map((part) => part.text || '').join(''));
  if (Object.prototype.hasOwnProperty.call(value, 'result')) return excelCellText(value.result);
  if (value.text != null) return clean(value.text);
  if (value.hyperlink) return clean(value.text || value.hyperlink);
  return clean(value);
}

export async function parseKnowledgeWorkbook(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Workbook is empty');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows = [];
  const sheetErrors = [];
  for (const sheet of workbook.worksheets) {
    const sheetName = sheet.name;
    if (headerKey(sheetName) === 'imageroles') continue;
    const matrix = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = [];
      const width = Math.max(sheet.actualColumnCount || 0, row.cellCount || 0);
      for (let column = 1; column <= width; column += 1) values.push(excelCellText(row.getCell(column).value));
      matrix.push(values);
    });
    if (!Array.isArray(matrix) || matrix.length === 0) continue;
    const headers = (matrix[0] || []).map(clean);
    const questionIndex = findColumn(headers, aliases.question);
    const answerIndex = findColumn(headers, aliases.answer);
    if (questionIndex < 0 || answerIndex < 0) {
      sheetErrors.push({ sheet: sheetName, error: 'Could not find both Question and How to reply / Answer columns.' });
      continue;
    }
    const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, findColumn(headers, names)]));
    for (let offset = 1; offset < matrix.length; offset += 1) {
      const values = matrix[offset] || [];
      if (!values.some((value) => clean(value))) continue;
      const question = text(values[questionIndex]);
      const answer = text(values[answerIndex]);
      const suppliedName = indexes.name >= 0 ? text(values[indexes.name]) : '';
      const name = suppliedName || question.slice(0, 180);
      const locale = text(indexes.locale >= 0 ? values[indexes.locale] : '');
      const intentKey = text(indexes.intent_key >= 0 ? values[indexes.intent_key] : '') || slug(name || question);
      const imageUrls = splitImages(indexes.image_url >= 0 ? values[indexes.image_url] : '');
      const imageRole = text(indexes.image_role >= 0 ? values[indexes.image_role] : '') || 'reference';
      const imageAlt = text(indexes.image_alt >= 0 ? values[indexes.image_alt] : '');
      const imageCaption = text(indexes.image_caption >= 0 ? values[indexes.image_caption] : '');
      const imagePlacement = text(indexes.image_placement >= 0 ? values[indexes.image_placement] : '') || 'after_answer';
      const images = imageUrls.map((url) => ({ url, role: imageRole, alt: imageAlt, caption: imageCaption, placement: imagePlacement }));
      const mapped = {
        content_name: name,
        name,
        title: question || name,
        question,
        intent_key: intentKey,
        answer,
        faq_content: answer,
        knowledge_content: answer,
        positive_examples: text(indexes.positive_examples >= 0 ? values[indexes.positive_examples] : ''),
        negative_examples: text(indexes.negative_examples >= 0 ? values[indexes.negative_examples] : ''),
        ai_instruction: text(indexes.ai_instruction >= 0 ? values[indexes.ai_instruction] : ''),
        locale,
        platform_key: text(indexes.platform_key >= 0 ? values[indexes.platform_key] : ''),
        image_urls: imageUrls,
        image_url: imageUrls[0] || '',
        image_role: imageRole,
        image_alt: imageAlt,
        image_caption: imageCaption,
        image_placement: imagePlacement,
        images,
        ticket_label: text(indexes.ticket >= 0 ? values[indexes.ticket] : ''),
        source_type: 'qa',
      };
      const warnings = [];
      if (!suppliedName) warnings.push('Name was generated from Question for compatibility.');
      const validationError = !question ? 'Question is required.' : (!answer ? 'How to reply / Answer is required.' : '');
      rows.push({ sheet_name: sheetName, row_number: offset + 1, source_key: intentKey, raw: Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, clean(values[index])])), mapped, warnings, validation_error: validationError, status: validationError ? 'error' : 'valid' });
    }
  }
  const validRows = rows.filter((row) => row.status === 'valid').length;
  return {
    rows,
    sheet_count: workbook.worksheets.filter((sheet) => headerKey(sheet.name) !== 'imageroles').length,
    total_rows: rows.length,
    valid_rows: validRows,
    error_rows: rows.length - validRows,
    sheet_errors: sheetErrors,
    truncated: false,
  };
}

export function importedRowToAiContentDraft(row = {}, platformKey = 'default', batchId = null) {
  const name = text(row.content_name || row.name || row.title || row.question) || 'Imported knowledge';
  const title = text(row.title || row.question || name);
  const intentKey = text(row.intent_key || row.source_key) || slug(name);
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : splitImages(row.image_urls || row.image_url || '');
  const imageRole = text(row.image_role) || 'reference';
  const imageAlt = text(row.image_alt);
  const imageCaption = text(row.image_caption);
  const imagePlacement = text(row.image_placement) || 'after_answer';
  const qaSteps = Array.isArray(row.images) && row.images.length
    ? row.images
    : imageUrls.map((url) => ({ url, role: imageRole, alt: imageAlt, caption: imageCaption, placement: imagePlacement }));
  return {
    content_name: name,
    title,
    intent_key: intentKey,
    locale: text(row.locale) || 'en',
    status: 'draft',
    approval_status: 'draft',
    source_type: 'qa',
    priority: 100,
    confidence_threshold: 86,
    positive_examples: text(row.positive_examples),
    negative_examples: text(row.negative_examples),
    ai_instruction: text(row.ai_instruction),
    faq_content: text(row.answer || row.faq_content),
    knowledge_content: text(row.answer || row.knowledge_content),
    example_answers: text(row.answer || row.example_answers),
    image_urls: imageUrls,
    image_delivery: imagePlacement,
    qa_steps: qaSteps,
    qa_steps_json: JSON.stringify(qaSteps),
    platform_scope: text(row.platform_scope || platformKey) || platformKey,
    route_policy: 'answer_only',
    import_batch_id: batchId,
    import_source_key: intentKey,
    source_sheet: text(row.source_sheet),
    source_row: Number(row.source_row || 0) || null,
    source_ticket_label: text(row.ticket_label || row.ticket),
    source_image_ref: imageUrls.join('\n'),
  };
}
