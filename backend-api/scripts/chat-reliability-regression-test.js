import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  chatSystemText,
  localConversationReply,
  parseModelJsonText,
  reliabilityFallbackText,
} from '../src/chat-reliability.js';

const indonesianGreeting = localConversationReply('halo', 'id');
assert.equal(indonesianGreeting.intent, 'greeting');
assert.match(indonesianGreeting.reply, /Halo/);

const respectfulBoundary = localConversationReply("no I'm laughing at you, idiot", 'id');
assert.equal(respectfulBoundary.intent, 'boundary');
assert.match(respectfulBoundary.reply, /sopan/i);
assert.equal(localConversationReply('my deposit has not arrived', 'en'), null, 'Business questions must continue to the grounded AI router');

const safeFallback = reliabilityFallbackText('id', {
  provider_error_reply:'There was an error while connecting to server. Please check your internet connection.',
}, 'provider');
assert.doesNotMatch(safeFallback, /internet|connecting to server/i);
assert.match(safeFallback, /Layanan AI/);

assert.deepEqual(parseModelJsonText('```json\n{"decision":"match",}\n```'), { decision:'match' });
assert.equal(parseModelJsonText('not-json'), null);

const chatText = chatSystemText('zh-CN', 'JAVO');
assert.match(chatText.welcome_title, /JAVO/);
assert.match(chatText.online, /在线/);

const core = await readFile(new URL('../src/core.js', import.meta.url), 'utf8');
assert.match(core, /attempts:1 \+ Number\(reliability\?\.max_retries \|\| 0\)/, 'The saved retry policy must drive provider calls');
assert.match(core, /deadline_at:deadlineAt/, 'Provider retries must stay inside the chat deadline');
assert.match(core, /verified_source_fallback/, 'A matched approved source must survive composer failure');
assert.doesNotMatch(core, /provider_error: usedDeepSeek/, 'Public responses must not expose raw provider failures');

console.log('PASS Indonesian social and respectful-boundary responses are deterministic');
console.log('PASS Legacy network-blaming fallbacks are rejected');
console.log('PASS Model JSON receives narrow, non-executable repair');
console.log('PASS Saved retries, deadline budget, and verified-source fallback are wired');
console.log('\n4/4 AI response reliability checks passed');
