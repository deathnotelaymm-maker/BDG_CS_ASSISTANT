import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import pg from 'pg';
import api, { closeDatabasePools, runMigrations } from '../src/core.js';

const { Pool } = pg;
const ADMIN_ORIGIN = 'https://admin.example.test';
const SHARED_CHAT_ORIGIN = 'https://bdg-chat-pages.pages.dev';
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
  AI_MODE_ENABLED: 'false',
  DEEPSEEK_API_KEY: '',
  R2_REQUIRED: false,
  GUIDE_IMAGES: null,
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_CHAT: 10_000,
  RATE_LIMIT_LOGIN: 10_000,
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

  const unsafeHtml = '<p>Verified answer</p><img src="https://cdn.example.test/help.png" onerror="alert(1)"><a href="javascript:alert(2)">bad</a><script>alert(3)</script>';
  const createdFaq = expectStatus(await call('/admin/faqs', {
    method:'POST',
    body:{ question:'Integration duplicate intent', answer:'Verified answer', answer_html:unsafeHtml, locale:'en', status:'published' },
  }), 200, 'Create sanitized FAQ');
  assert.ok(createdFaq.id);
  assert.doesNotMatch(createdFaq.answer_html, /script|onerror|javascript:/i);
  const storedFaq = (await database.query('SELECT answer_html FROM faqs WHERE id=$1', [createdFaq.id])).rows[0];
  assert.doesNotMatch(storedFaq.answer_html, /script|onerror|javascript:/i);

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

  const blockedConnector = await call('/admin/connector', {
    method:'PUT',
    body:{ enabled:true, allowed_actions:['game_status'], game_status_url:'https://127.0.0.1/private' },
  });
  const blockedBody = expectStatus(blockedConnector, 400, 'Reject private connector target');
  assert.match(blockedBody.code, /^CONNECTOR_/);

  expectStatus(await call('/admin/ai-content', {
    method:'POST',
    body:{
      content_name:'Integration duplicate intent', title:'Integration duplicate intent',
      intent_key:'integration-duplicate-intent', locale:'en', source_type:'qa',
      status:'published', approval_status:'approved', faq_content:'A deliberately different approved answer.',
      ai_instruction:'Use only the approved content.',
    },
  }), 200, 'Create approved AI source');
  const scan = expectStatus(await call('/admin/ai-quality/scan', { method:'POST', body:{} }), 200, 'Run AI quality scan');
  assert.ok(scan.findings.some((finding) => finding.finding_type === 'duplicate_intent'));
  assert.ok(scan.findings.some((finding) => finding.finding_type === 'conflicting_answer'));

  const testCase = expectStatus(await call('/admin/ai-quality/test-cases', {
    method:'POST', body:{ name:'Integration route test', message:'Integration duplicate intent', locale:'en', expected_image_mode:'any' },
  }), 201, 'Create AI response test');
  const testRun = expectStatus(await call(`/admin/ai-quality/test-cases/${testCase.test_case.id}/run`, { method:'POST', body:{} }), 200, 'Run AI response test');
  assert.equal(testRun.run.status, 'pass');
  const persistedRun = await database.query('SELECT status FROM ai_quality_test_runs WHERE id=$1', [testRun.run.id]);
  assert.equal(persistedRun.rows[0]?.status, 'pass');

  console.log(`PASS ${migrationFiles.length} immutable SQL migration files applied and rechecked`);
  console.log('PASS Real login, scoped CRUD, shared-host public read, hostname guard, and tenant-isolation paths');
  console.log('PASS Rich HTML is sanitized in the API response and PostgreSQL row');
  console.log('PASS Private connector targets are rejected through the authenticated API');
  console.log('PASS AI quality findings and live-router test runs persist in PostgreSQL');
} finally {
  if (database) await database.end();
  await closeDatabasePools();
}
