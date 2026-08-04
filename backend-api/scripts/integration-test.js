import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import pg from 'pg';
import api, { closeDatabasePools, runMigrations } from '../src/core.js';

const { Pool } = pg;
const ADMIN_ORIGIN = 'https://admin.example.test';
const SHARED_CHAT_ORIGIN = 'https://bdg-chat-pages.pages.dev';
const originalFetch = globalThis.fetch;
let providerMode = 'success';
let selectedSourceId = 0;
const providerRequestKinds = [];
const providerSystemPrompts = [];
const connectionString = String(process.env.TEST_DATABASE_URL || '').trim();
if (!connectionString) throw new Error('TEST_DATABASE_URL is required. Integration tests never fall back to DATABASE_URL.');

const databaseName = decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ''));
if (!/test/i.test(databaseName)) {
  throw new Error(`Refusing to reset database "${databaseName}" because its name does not contain "test".`);
}

const env = {
  APP_NAME: 'BDG integration test',
  NODE_ENV: 'test',
  DATABASE_PROVIDER: 'postgres',
  DATABASE_URL: connectionString,
  DATABASE_SSL: 'false',
  REQUIRE_NEON_POOLER: false,
  DB_POOL_MAX: '4',
  DB_CONNECT_TIMEOUT_MS: '10000',
  DB_QUERY_TIMEOUT_MS: '120000',
  ADMIN_EMAIL: 'integration-owner@example.test',
  ADMIN_PASSWORD: 'Integration-Test-Password-2026!',
  JWT_SECRET: 'integration-test-jwt-secret-at-least-32-characters-long',
  ALLOWED_ORIGINS: ADMIN_ORIGIN,
  AI_MODE_ENABLED: 'true',
  DEEPSEEK_API_KEY: 'integration-test-provider-key',
  DEEPSEEK_API_BASE: 'https://deepseek.integration.test',
  DEEPSEEK_MODEL: 'deepseek-v4-flash',
  R2_REQUIRED: false,
  GUIDE_IMAGES: null,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_CHAT: 10_000,
  RATE_LIMIT_LOGIN: 10_000,
};

globalThis.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url;
  if (!String(url || '').startsWith('https://deepseek.integration.test/')) return originalFetch(input, init);
  const request = JSON.parse(String(init.body || '{}'));
  assert.equal(request.model, 'deepseek-v4-flash', 'Integration provider calls must use the current DeepSeek model');
  const systemPrompt = String(request.messages?.[0]?.content || '');
  const requestKind = systemPrompt.startsWith('This is a provider connectivity test')
    ? 'connectivity'
    : systemPrompt.startsWith('You are the production AI assistant') ? 'prompt_first'
    : systemPrompt.startsWith('You are the AI Meaning Judge') ? 'judge' : 'composer';
  providerRequestKinds.push(requestKind);
  providerSystemPrompts.push(systemPrompt);
  if (providerMode === 'outage') return new Response(JSON.stringify({ error:{ message:'simulated provider outage' } }), { status:503, headers:{ 'Content-Type':'application/json' } });
  const userMessage = String(request.messages?.[1]?.content || '');
  if (requestKind === 'connectivity') return new Response(JSON.stringify({ choices:[{ message:{ content:JSON.stringify({ ok:true }) } }] }), { status:200, headers:{ 'Content-Type':'application/json' } });
  if (requestKind === 'prompt_first') {
    const matched = userMessage.includes('Customer message: Integration duplicate intent');
    const greeting = userMessage.includes('Customer message: halo');
    const localizedReply = greeting ? 'Halo, saya mengikuti Prompt Manager.' : matched && systemPrompt.includes('requested locale (id)') ? 'Jawaban terverifikasi' : matched ? 'Verified answer' : 'I can help with general support questions under the configured role and instructions.';
    return new Response(JSON.stringify({ choices:[{ message:{ content:JSON.stringify({ reply:localizedReply, item_id:matched ? selectedSourceId : null, reason:matched ? 'Matched approved integration source' : 'General prompt answer' }) } }] }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  // The composer prompt contains an "AI Meaning Judge decision" section.
  // Classify only the dedicated judge prompt by its authoritative prefix so
  // the fake provider cannot accidentally send judge JSON to the composer.
  if (systemPrompt.startsWith('You are the AI Meaning Judge')) {
    return new Response(JSON.stringify({ choices:[{ message:{ content:JSON.stringify({ decision:'match', item_id:selectedSourceId, confidence:96, user_intent:'integration test', desired_outcome:'verified answer', clarification_question:'', reason:'Matched the integration source', tool_call:null }) } }] }), { status:200, headers:{ 'Content-Type':'application/json' } });
  }
  if (providerMode === 'composer_fail') return new Response(JSON.stringify({ error:{ message:'simulated composer outage' } }), { status:503, headers:{ 'Content-Type':'application/json' } });
  const localizedReply = userMessage.includes('Customer message: Integration duplicate intent') && systemPrompt.includes('requested locale (id)')
    ? 'Jawaban terverifikasi'
    : 'Verified answer';
  return new Response(JSON.stringify({ choices:[{ message:{ content:JSON.stringify({ reply:localizedReply, blocks:[{ type:'paragraph', text:localizedReply }] }) } }] }), { status:200, headers:{ 'Content-Type':'application/json' } });
};

let database;
let token = '';
let platform;

async function call(path, {
  method = 'GET', body, platformRoute = platform?.public_route_key, auth = true, origin = ADMIN_ORIGIN,
} = {}) {
  const headers = new Headers();
  if (origin) headers.set('Origin', origin);
  if (auth && token) headers.set('Authorization', `Bearer ${token}`);
  if (platformRoute) headers.set('X-BDG-Platform-Route', platformRoute);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await api.fetch(new Request(`https://api.example.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  }), env);
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  return { response, payload };
}

function expectStatus(result, status, label) {
  assert.equal(result.response.status, status, `${label}: ${JSON.stringify(result.payload)}`);
  return result.payload;
}

try {
  const reset = new Pool({ connectionString, ssl:false, max:1 });
  await reset.query('DROP SCHEMA public CASCADE');
  await reset.query('CREATE SCHEMA public');
  await reset.end();

  const migrationFiles = (await readdir(new URL('../migrations/', import.meta.url)))
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name));
  const firstMigration = await runMigrations(env);
  assert.equal(firstMigration.file_migrations.applied.length, migrationFiles.length, 'Every SQL migration file should run on a clean database');
  const secondMigration = await runMigrations(env);
  assert.equal(secondMigration.file_migrations.skipped.length, migrationFiles.length, 'A second migration run should skip every checksum-matched file');

  database = new Pool({ connectionString, ssl:false, max:2 });
  const registry = await database.query('SELECT filename,checksum_sha256 FROM schema_migration_files ORDER BY filename');
  assert.equal(registry.rowCount, migrationFiles.length);
  assert.ok(registry.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum_sha256)));
  const qualityTables = await database.query("SELECT COUNT(*)::integer AS count FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ai_quality_findings','ai_quality_test_cases','ai_quality_test_runs')");
  assert.equal(qualityTables.rows[0].count, 3);
  const promptRuntimeTables = await database.query("SELECT COUNT(*)::integer AS count FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ai_prompt_runtime_versions','ai_prompt_runtime_state')");
  assert.equal(promptRuntimeTables.rows[0].count, 2);
  const modelSettings = (await database.query('SELECT model,require_approved_context,max_tokens FROM ai_model_settings ORDER BY id LIMIT 1')).rows[0];
  assert.equal(modelSettings.model, 'deepseek-v4-flash');
  assert.equal(modelSettings.require_approved_context, false);
  assert.ok(Number(modelSettings.max_tokens) >= 1200);

  const login = await call('/auth/login', {
    method:'POST', auth:false, platformRoute:'',
    body:{ email:env.ADMIN_EMAIL, password:env.ADMIN_PASSWORD },
  });
  const loginBody = expectStatus(login, 200, 'Owner login');
  token = loginBody.access_token;
  assert.ok(token);

  platform = (await database.query(`SELECT id,tenant_id,public_route_key FROM saas_platforms
    WHERE archived_at IS NULL AND status='active' ORDER BY id LIMIT 1`)).rows[0];
  assert.ok(platform?.public_route_key, 'Bootstrap must create an active routed platform');
  const workflowMode = (await database.query('SELECT workflow_mode FROM ai_reliability_settings WHERE tenant_id=$1 AND platform_id=$2', [platform.tenant_id,platform.id])).rows[0]?.workflow_mode;
  assert.equal(workflowMode, 'prompt_first');
  await database.query(`UPDATE saas_platforms SET supported_languages='["en","id"]' WHERE id=$1`, [platform.id]);
  await database.query(`INSERT INTO platform_locales(tenant_id,platform_id,locale,display_name,native_name,direction,is_default,is_enabled)
    VALUES($1,$2,'id','Indonesian','Bahasa Indonesia','ltr',FALSE,TRUE)
    ON CONFLICT(tenant_id,platform_id,locale) DO UPDATE SET is_enabled=TRUE`, [platform.tenant_id,platform.id]);

  const runtimeRole = expectStatus(await call('/admin/ai/prompts', {
    method:'POST', body:{ section_key:'integration_runtime_role', title:'Integration Runtime Role', content:'INTEGRATION_ROLE_MARKER: You are the versioned integration assistant.', enabled:true, priority:5 },
  }), 200, 'Publish integration runtime role section');
  const runtimeOutput = expectStatus(await call('/admin/ai/prompts', {
    method:'POST', body:{ section_key:'integration_runtime_output', title:'Integration Runtime Output', content:'INTEGRATION_OUTPUT_MARKER: Answer clearly and directly.', enabled:true, priority:6 },
  }), 200, 'Publish integration runtime output section');
  assert.ok(runtimeOutput.prompt_runtime.version_number > runtimeRole.prompt_runtime.version_number);
  assert.notEqual(runtimeOutput.prompt_runtime.compiled_prompt_hash, runtimeRole.prompt_runtime.compiled_prompt_hash);
  const runtimeResponse = await call('/admin/ai/prompt-runtime');
  const runtimeAdmin = expectStatus(runtimeResponse, 200, 'Read exact active prompt runtime');
  assert.match(runtimeResponse.response.headers.get('cache-control') || '', /no-store/i);
  assert.match(runtimeAdmin.runtime.compiled_prompt, /INTEGRATION_ROLE_MARKER/);
  assert.match(runtimeAdmin.runtime.compiled_prompt, /INTEGRATION_OUTPUT_MARKER/);
  assert.ok(runtimeAdmin.runtime.section_ids.includes(Number(runtimeRole.id)));
  assert.ok(runtimeAdmin.runtime.section_ids.includes(Number(runtimeOutput.id)));

  const providerTest = expectStatus(await call('/admin/ai/reliability/test', { method:'POST', body:{ message:'provider connectivity' } }), 200, 'Run a real provider connectivity test');
  assert.equal(providerTest.ok, true);
  assert.equal(providerTest.model, 'deepseek-v4-flash');
  assert.equal(providerTest.checks.find((check) => check.name === 'provider connection')?.ok, true);

  const unsafeHtml = '<p>Verified answer</p><img src="https://cdn.example.test/help.png" onerror="alert(1)"><a href="javascript:alert(2)">bad</a><script>alert(3)</script>';
  const createdFaq = expectStatus(await call('/admin/faqs', {
    method:'POST',
    body:{ question:'Integration duplicate intent', answer:'Verified answer', answer_html:unsafeHtml, locale:'en', status:'published' },
  }), 200, 'Create sanitized FAQ');
  assert.ok(createdFaq.id);
  assert.doesNotMatch(createdFaq.answer_html, /script|onerror|javascript:/i);
  const storedFaq = (await database.query('SELECT answer_html FROM faqs WHERE id=$1', [createdFaq.id])).rows[0];
  assert.doesNotMatch(storedFaq.answer_html, /script|onerror|javascript:/i);


  const createdMenuSource = expectStatus(await call('/admin/ai-content', {
    method:'POST',
    body:{
      content_name:'Integration duplicate intent', title:'Integration duplicate intent',
      intent_key:'integration-duplicate-intent', locale:'en', source_type:'prompt_image',
      status:'published', approval_status:'approved',
      positive_examples:'Integration duplicate intent\nVerified integration answer',
      negative_examples:'Unrelated integration request',
      knowledge_content:'Verified answer', example_answers:'Verified answer',
      ai_instruction:'Use only the approved content.',
      image_urls:['https://cdn.example.test/help.png'], image_delivery:'after_answer',
    },
  }), 200, 'Create approved Menu & Images source');
  selectedSourceId = Number(createdMenuSource.id);
  assert.equal(createdMenuSource.source_type, 'prompt_image');

  const publicFaqPath = `/faqs?platform=${encodeURIComponent(platform.public_route_key)}&language=en`;
  const publicFaqs = expectStatus(await call(publicFaqPath, {
    auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
  }), 200, 'Read public FAQs through the shared Chat hostname');
  const publicFaq = publicFaqs.find((row) => Number(row.id) === Number(createdFaq.id));
  assert.ok(publicFaq);
  assert.doesNotMatch(publicFaq.answer_html, /script|onerror|javascript:/i);

  const mismatchedHostname = expectStatus(await call(publicFaqPath, {
    auth:false, platformRoute:'', origin:'https://unmapped-customer.example.test',
  }), 400, 'Reject a route that does not match the custom hostname');
  assert.equal(mismatchedHostname.code, 'PLATFORM_CONTEXT_MISMATCH');

  const isolatedTenant = (await database.query(`INSERT INTO saas_tenants(tenant_key,name,status,default_locale)
    VALUES('integration-isolated','Integration Isolated','active','en') RETURNING id`)).rows[0];
  const isolatedPlatform = (await database.query(`INSERT INTO saas_platforms(tenant_id,platform_key,public_route_key,name,default_locale,supported_languages,support_mode,legacy_support_platform_key,status)
    VALUES($1,'isolated','p-integration-isolated-1a2b3c4d5e','Integration Isolated','en','["en"]','none','integration-isolated','active') RETURNING public_route_key`, [isolatedTenant.id])).rows[0];
  const isolatedFaqs = expectStatus(await call('/admin/faqs', { platformRoute:isolatedPlatform.public_route_key }), 200, 'Read isolated platform FAQs');
  assert.equal(isolatedFaqs.some((row) => Number(row.id) === Number(createdFaq.id)), false, 'Platform-scoped API must not leak FAQ rows');

  const callsBeforeGreeting = providerRequestKinds.length;
  const promptGreeting = expectStatus(await call('/chat', {
    method:'POST', auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
    body:{ message:'halo', language:'id', platform_key:platform.public_route_key, session_id:'integration-prompt-greeting' },
  }), 200, 'Route an Indonesian greeting through the active Prompt Manager runtime');
  assert.equal(promptGreeting.response_status, 'success');
  assert.equal(promptGreeting.resolution_path, 'prompt_first_general_answer');
  assert.match(promptGreeting.reply, /Halo/i);
  assert.deepEqual(providerRequestKinds.slice(callsBeforeGreeting), ['prompt_first']);
  assert.match(providerSystemPrompts.at(-1), /INTEGRATION_ROLE_MARKER/);
  assert.match(providerSystemPrompts.at(-1), /INTEGRATION_OUTPUT_MARKER/);
  assert.equal(promptGreeting.response_blocks.some((block) => block.type === 'error'), false);

  const localizedAiAnswer = expectStatus(await call('/chat', {
    method:'POST', auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
    body:{ message:'Integration duplicate intent', language:'id', platform_key:platform.public_route_key, session_id:'integration-id-answer' },
  }), 200, 'Use default-locale verified content for an Indonesian AI answer');
  assert.equal(localizedAiAnswer.response_status, 'success');
  assert.equal(localizedAiAnswer.language, 'id');
  assert.match(localizedAiAnswer.reply, /Jawaban terverifikasi/);
  assert.equal(localizedAiAnswer.resolution_path, 'prompt_first_grounded_answer');
  assert.equal(localizedAiAnswer.response_blocks.filter((block) => block.type === 'image').length, 1, 'A matched source must attach its approved image once');
  assert.match(localizedAiAnswer.response_blocks.find((block) => block.type === 'image')?.url || '', /cdn\.example\.test\/help\.png/);
  assert.deepEqual(providerRequestKinds.slice(-1), ['prompt_first'], 'A normal answer must use one provider call');

  const callsBeforeGeneral = providerRequestKinds.length;
  const generalAnswer = expectStatus(await call('/chat', {
    method:'POST', auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
    body:{ message:'What can you help me with today?', language:'en', platform_key:platform.public_route_key, session_id:'integration-general-answer' },
  }), 200, 'Answer a general question under Prompt Manager rules');
  assert.equal(generalAnswer.response_status, 'success');
  assert.equal(generalAnswer.resolution_path, 'prompt_first_general_answer');
  assert.match(generalAnswer.reply, /general support questions/i);
  assert.deepEqual(providerRequestKinds.slice(callsBeforeGeneral), ['prompt_first'], 'A general prompt answer must use exactly one provider call');

  const runtimeBeforeEdit = generalAnswer.prompt_runtime.hash;
  const editedRole = expectStatus(await call(`/admin/ai/prompts/${runtimeRole.id}`, {
    method:'PUT', body:{ section_key:'integration_runtime_role', title:'Integration Runtime Role', content:'INTEGRATION_ROLE_MARKER_V2: You are the newly published integration assistant.', enabled:true, priority:5 },
  }), 200, 'Publish a changed prompt runtime');
  assert.notEqual(editedRole.prompt_runtime.compiled_prompt_hash, runtimeBeforeEdit);
  const afterPromptChange = expectStatus(await call('/chat', {
    method:'POST', auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
    body:{ message:'What changed in your instructions?', language:'en', platform_key:platform.public_route_key, session_id:'integration-general-answer' },
  }), 200, 'Reset old conversation memory after a prompt runtime change');
  assert.equal(afterPromptChange.memory_reset.reset, true);
  assert.match(afterPromptChange.memory_reset.reason, /^prompt_runtime_changed:/);
  assert.equal(afterPromptChange.prompt_runtime.hash, editedRole.prompt_runtime.compiled_prompt_hash);
  assert.match(providerSystemPrompts.at(-1), /INTEGRATION_ROLE_MARKER_V2/);
  assert.doesNotMatch(providerSystemPrompts.at(-1), /INTEGRATION_ROLE_MARKER: /);
  const promptChangeLog = (await database.query(`SELECT prompt_runtime_hash,memory_reset_reason,prompt_section_ids_json FROM chat_logs WHERE session_id='integration-general-answer' ORDER BY id DESC LIMIT 1`)).rows[0];
  assert.equal(promptChangeLog.prompt_runtime_hash, editedRole.prompt_runtime.compiled_prompt_hash);
  assert.match(promptChangeLog.memory_reset_reason, /^prompt_runtime_changed:/);
  assert.ok(JSON.parse(promptChangeLog.prompt_section_ids_json).includes(Number(runtimeRole.id)));

  providerMode = 'outage';
  const verifiedFallback = expectStatus(await call('/chat', {
    method:'POST', auth:false, platformRoute:'', origin:SHARED_CHAT_ORIGIN,
    body:{ message:'Integration duplicate intent', language:'en', platform_key:platform.public_route_key, session_id:'integration-provider-fallback' },
  }), 200, 'Return verified source content when the prompt-first provider fails');
  assert.equal(verifiedFallback.response_status, 'degraded');
  assert.equal(verifiedFallback.resolution_path, 'verified_source_fallback');
  assert.match(verifiedFallback.reply, /Verified answer/);
  assert.equal(verifiedFallback.response_blocks.filter((block) => block.type === 'image').length, 1, 'Provider outage fallback must retain the matched approved image');
  assert.equal(verifiedFallback.response_blocks.some((block) => block.type === 'error'), false);
  assert.equal(Object.hasOwn(verifiedFallback, 'provider_error'), false, 'Public chat must not expose provider details');
  const fallbackLog = (await database.query(`SELECT response_status,resolution_path,degraded_reason,provider_attempts FROM chat_logs WHERE session_id='integration-provider-fallback' ORDER BY id DESC LIMIT 1`)).rows[0];
  assert.equal(fallbackLog.response_status, 'degraded');
  assert.equal(fallbackLog.resolution_path, 'verified_source_fallback');
  assert.ok(Number(fallbackLog.provider_attempts) >= 3, 'Configured provider retries must execute and be recorded');
  providerMode = 'success';

  const blockedConnector = await call('/admin/connector', {
    method:'PUT',
    body:{ enabled:true, allowed_actions:['game_status'], game_status_url:'https://127.0.0.1/private' },
  });
  const blockedBody = expectStatus(blockedConnector, 400, 'Reject private connector target');
  assert.match(blockedBody.code, /^CONNECTOR_/);

  for (const [path, method] of [
    ['/admin/ai-qa', 'GET'],
    ['/admin/ai-source-router', 'GET'],
    ['/admin/knowledge-imports', 'GET'],
    ['/admin/ai-quality/scan', 'POST'],
    ['/admin/locale-studio', 'GET'],
  ]) {
    const retired = expectStatus(await call(path, { method, body:method === 'POST' ? {} : undefined }), 410, `Retire ${path}`);
    assert.equal(retired.code, 'AI_MODULE_RETIRED');
  }


  console.log(`PASS ${migrationFiles.length} immutable SQL migration files applied and rechecked`);
  console.log('PASS Real login, scoped CRUD, shared-host public read, hostname guard, and tenant-isolation paths');
  console.log('PASS Rich HTML is sanitized in the API response and PostgreSQL row');
  console.log('PASS Private connector targets are rejected through the authenticated API');
  console.log('PASS Prompt-managed greeting, one-call general and grounded answers, matched images, provider retry, and verified-source fallback paths');
  console.log('PASS Prompt runtime versions, hashes, and prompt-aware memory reset persist in PostgreSQL');
  console.log('PASS Retired AI Admin modules return HTTP 410 and cannot participate in production routing');
} finally {
  globalThis.fetch = originalFetch;
  if (database) await database.end();
  await closeDatabasePools();
}
