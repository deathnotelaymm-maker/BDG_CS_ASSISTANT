import assert from 'node:assert/strict';
import { compilePromptRuntime, promptSectionHash } from '../src/prompt-runtime.js';

const sections = [
  { id: 30, section_key:'output', title:'Output', content:'Start every reply with TEST-V154.', enabled:true, priority:30 },
  { id: 10, section_key:'role', title:'Role', content:'You are Ruby, a professional customer support assistant.', enabled:true, priority:10 },
  { id: 20, section_key:'job', title:'Job', content:'Answer the customer directly and accurately.', enabled:true, priority:20 },
  { id: 40, section_key:'safety_rules', title:'Safety Rules', content:'Never request passwords or OTP codes.', enabled:true, priority:40 },
];

const runtime = compilePromptRuntime(sections);
assert.deepEqual(runtime.section_ids, [10,20,30,40], 'Every enabled section must be compiled in priority order');
for (const marker of ['You are Ruby', 'Answer the customer directly', 'TEST-V154', 'Never request passwords']) {
  assert.match(runtime.compiled_prompt, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Compiled runtime must contain: ${marker}`);
}
assert.match(runtime.compiled_prompt_hash, /^[a-f0-9]{64}$/);
assert.equal(runtime.compiled_prompt_hash, compilePromptRuntime([...sections].reverse()).compiled_prompt_hash, 'Input array order must not change the compiled runtime');
assert.equal(Object.keys(runtime.section_hashes).length, 4);
assert.equal(runtime.section_hashes['10'], promptSectionHash(sections[1]));

const edited = compilePromptRuntime(sections.map((section) => section.id === 10 ? { ...section, content:'You are Nova.' } : section));
assert.notEqual(edited.compiled_prompt_hash, runtime.compiled_prompt_hash, 'Editing a section must create a new runtime hash');

const deleted = compilePromptRuntime(sections.filter((section) => section.id !== 10));
assert.notEqual(deleted.compiled_prompt_hash, runtime.compiled_prompt_hash, 'Deleting a section must create a new runtime hash');
assert.doesNotMatch(deleted.compiled_prompt, /You are Ruby/);

const disabled = compilePromptRuntime(sections.map((section) => section.id === 20 ? { ...section, enabled:false } : section));
assert.deepEqual(disabled.section_ids, [10,30,40], 'Disabled sections must not reach the runtime');
assert.doesNotMatch(disabled.compiled_prompt, /Answer the customer directly/);

const clipped = compilePromptRuntime([
  { id:1, section_key:'role', title:'Role', content:'x'.repeat(900), enabled:true, priority:1 },
  { id:2, section_key:'job', title:'Job', content:'y'.repeat(900), enabled:true, priority:2 },
], { sectionLimit:500, totalLimit:800 });
assert.equal(clipped.clipped, true);
assert.ok(clipped.warnings.some((warning) => warning.code === 'SECTION_CLIPPED'));
assert.ok(clipped.warnings.some((warning) => warning.code === 'RUNTIME_CLIPPED'));
assert.ok(clipped.prompt_characters <= 800);

const fallback = compilePromptRuntime([]);
assert.match(fallback.compiled_prompt, /safe_default/);
assert.ok(fallback.warnings.some((warning) => warning.code === 'NO_ENABLED_SECTIONS'));

console.log('PASS All enabled Prompt Manager sections compile in stable priority order');
console.log('PASS Prompt edits, deletes, and disable operations create different runtime hashes');
console.log('PASS Section hashes and compiled SHA-256 values are deterministic');
console.log('PASS Per-section and total runtime limits emit visible clipping warnings');
console.log('PASS Empty Prompt Manager state receives a safe compiled fallback');
console.log('\n5/5 prompt runtime regression checks passed');
