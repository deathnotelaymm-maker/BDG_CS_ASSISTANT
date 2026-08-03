import { createHash } from 'node:crypto';

export const PROMPT_RUNTIME_SECTION_LIMIT = 6000;
export const PROMPT_RUNTIME_TOTAL_LIMIT = 24000;

function cleanText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function sha256(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function normalizedKey(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function promptSectionHash(section) {
  return sha256(JSON.stringify({
    id: Number(section?.id || 0),
    section_key: normalizedKey(section?.section_key || section?.key || ''),
    title: cleanText(section?.title || section?.name || 'Prompt Section'),
    content: cleanText(section?.content || ''),
    enabled: section?.enabled !== false,
    priority: Number(section?.priority ?? 100),
  }));
}

export function compilePromptRuntime(sections = [], options = {}) {
  const sectionLimit = Math.max(500, Number(options.sectionLimit || PROMPT_RUNTIME_SECTION_LIMIT));
  const totalLimit = Math.max(sectionLimit, Number(options.totalLimit || PROMPT_RUNTIME_TOTAL_LIMIT));
  const warnings = [];
  const enabled = (Array.isArray(sections) ? sections : [])
    .filter((section) => section && section.enabled !== false)
    .map((section) => ({
      id: Number(section.id || 0),
      section_key: normalizedKey(section.section_key || section.key || section.title || 'prompt'),
      title: cleanText(section.title || section.name || section.section_key || 'Prompt Section'),
      content: cleanText(section.content || ''),
      priority: Number(section.priority ?? 100),
    }))
    .sort((a, b) => a.priority - b.priority || a.id - b.id || a.section_key.localeCompare(b.section_key));

  if (!enabled.length) warnings.push({ code: 'NO_ENABLED_SECTIONS', severity: 'warning', message: 'No Prompt Manager section is enabled; the safe built-in fallback will be used.' });

  const priorities = new Map();
  for (const section of enabled) {
    const list = priorities.get(section.priority) || [];
    list.push(section.section_key);
    priorities.set(section.priority, list);
    if (!section.content) warnings.push({ code: 'EMPTY_SECTION', severity: 'warning', section_id: section.id, section_key: section.section_key, message: `Enabled section “${section.title}” is empty.` });
  }
  for (const [priority, keys] of priorities) {
    if (keys.length > 1) warnings.push({ code: 'DUPLICATE_PRIORITY', severity: 'info', priority, section_keys: keys, message: `Multiple sections use priority ${priority}; ID order decides their final order.` });
  }

  const coreGroups = {
    role: ['role', 'identity', 'assistant_role'],
    job: ['job', 'scope', 'responsibilities'],
    output: ['output', 'response_policy', 'structured_output_policy'],
    safety: ['safety', 'safety_rules', 'forbidden_actions'],
  };
  for (const [group, keys] of Object.entries(coreGroups)) {
    if (!enabled.some((section) => keys.some((key) => section.section_key.includes(key)))) {
      warnings.push({ code: 'MISSING_CORE_SECTION', severity: 'info', group, message: `No enabled ${group} section was detected.` });
    }
  }

  const compiledSections = [];
  let characters = 0;
  for (const section of enabled) {
    let content = section.content;
    let clipped = false;
    if (content.length > sectionLimit) {
      content = content.slice(0, sectionLimit).trimEnd();
      clipped = true;
      warnings.push({ code: 'SECTION_CLIPPED', severity: 'warning', section_id: section.id, section_key: section.section_key, original_characters: section.content.length, included_characters: content.length, message: `Section “${section.title}” exceeded ${sectionLimit} characters and was clipped.` });
    }
    const header = `## ${section.title} [${section.section_key}]`;
    const block = `${header}\n${content || '(No instructions supplied.)'}`;
    const separatorLength = compiledSections.length ? 2 : 0;
    if (characters + separatorLength + block.length > totalLimit) {
      const remaining = totalLimit - characters - separatorLength;
      if (remaining > header.length + 20) {
        const partialContent = content.slice(0, Math.max(0, remaining - header.length - 1)).trimEnd();
        compiledSections.push({ ...section, content: partialContent, clipped: true, block: `${header}\n${partialContent}` });
        characters += separatorLength + header.length + 1 + partialContent.length;
      }
      warnings.push({ code: 'RUNTIME_CLIPPED', severity: 'warning', section_id: section.id, section_key: section.section_key, total_limit: totalLimit, message: `The compiled prompt reached the ${totalLimit}-character runtime limit. Later instructions were excluded.` });
      break;
    }
    compiledSections.push({ ...section, content, clipped, block });
    characters += separatorLength + block.length;
  }

  const fallback = '## Safe default [safe_default]\nBe a polite, concise customer support assistant. Never request passwords, OTPs, PINs, or full banking credentials.';
  const compiledPrompt = compiledSections.length ? compiledSections.map((section) => section.block).join('\n\n') : fallback;
  const sectionIds = compiledSections.map((section) => section.id).filter((id) => id > 0);
  const sectionHashes = Object.fromEntries(compiledSections.map((section) => [String(section.id || section.section_key), promptSectionHash(section)]));
  const sectionSnapshot = compiledSections.map(({ block, ...section }) => ({ ...section, hash: promptSectionHash(section) }));

  return {
    compiled_prompt: compiledPrompt,
    compiled_prompt_hash: sha256(compiledPrompt),
    prompt_characters: compiledPrompt.length,
    section_ids: sectionIds,
    section_hashes: sectionHashes,
    section_snapshot: sectionSnapshot,
    warnings,
    enabled_section_count: enabled.length,
    included_section_count: compiledSections.length,
    clipped: warnings.some((warning) => warning.code === 'SECTION_CLIPPED' || warning.code === 'RUNTIME_CLIPPED'),
    limits: { section_characters: sectionLimit, total_characters: totalLimit },
  };
}
