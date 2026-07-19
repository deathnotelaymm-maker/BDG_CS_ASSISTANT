import http from 'node:http';
import { randomUUID } from 'node:crypto';
import api, { closeDatabasePools, readiness } from './core.js';
import { allowedOrigin, databaseDescriptor, getRuntimeEnv, validateRuntimeEnv } from './env.js';
import { createR2Adapter } from './r2-adapter.js';

const env = getRuntimeEnv();
const API_VERSION = '1.10.0-unified-ai-source-router';
const API_FEATURES = ['tenant-core','platform-control-center','platform-scoped-admin','tenant-data-isolation','platform-context-header','platform-context-no-fallback','platform-admin-users','automatic-platform-access-links','custom-domain-safety','tenant-role-boundaries','platform-domain-registry','platform-feature-entitlements','legacy-content-backfill','advanced-knowledge-import','xlsx-draft-review','multi-platform-support-router','ticket-capability-guard','ai-knowledge-orchestrator-v3','backend-keyword-scoring-disabled','multilingual-visual-knowledge','structured-rich-response-v2','visual-guide-studio','action-buttons','durable-site-content-delete','unified-content-versions','chat-start-module','experience-studio','safe-animation-presets','platform-chat-layout','r2-s3-api','operations-connector-gateway','platform-connector-allowlist','connector-test-connection','connector-audit-trail','redacted-operation-logs','qualified-membership-permissions','owner-scoped-support-platform','arbitrary-platform-locales','local-brand-uploads','chat-start-preview-controls','one-platform-guard','strict-public-platform-route','neutral-route-presentation','quick-reply-one-time','ai-qa-source','rich-faq-studio','import-approval-publish','locale-aware-knowledge-studio','locale-policy','locale-coverage','faq-sql-repair','platform-locale-registry','unified-ai-source-router','source-policy-controls','source-aware-diagnostics','dynamic-ai-locale-routing'];
validateRuntimeEnv(env);
env.GUIDE_IMAGES = createR2Adapter(env);

const counters = new Map();
// Theme, chat content, and Guide Page content are excluded so Admin changes publish immediately.
const publicCachePaths = new Set(['/popular-help', '/public/popular-help', '/navigation', '/public/navigation', '/categories', '/public/categories', '/guides', '/public/guides', '/faqs', '/public/faqs', '/action-buttons', '/public/action-buttons']);

function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function rateLimit(req, path) {
  let limit = 0;
  if (path === '/chat') limit = env.RATE_LIMIT_CHAT;
  if (path === '/auth/login' || path === '/login' || path === '/api/login') limit = env.RATE_LIMIT_LOGIN;
  if (!limit) return null;
  const now = Date.now();
  const bucket = Math.floor(now / env.RATE_LIMIT_WINDOW_MS);
  const key = `${clientIp(req)}:${path}:${bucket}`;
  const count = (counters.get(key) || 0) + 1;
  counters.set(key, count);
  if (counters.size > 10_000) {
    for (const existing of counters.keys()) if (!existing.endsWith(`:${bucket}`)) counters.delete(existing);
  }
  return count > limit ? Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000) : null;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > env.MAX_REQUEST_BYTES) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

function requestUrl(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${env.PORT}`;
  return `${proto}://${host}${req.url || '/'}`;
}

function jsonResponse(res, status, payload, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(payload));
}

async function handleHealth(path) {
  if (path === '/health/live') return { ok: true, service: env.APP_NAME, version: API_VERSION, features:API_FEATURES, runtime: 'render-node-neon', ...databaseDescriptor(env), timestamp: new Date().toISOString() };
  const db = await readiness(env);
  if (path === '/health/dependencies') {
    let r2 = env.R2_REQUIRED ? 'not_checked' : 'optional';
    if (env.GUIDE_IMAGES) {
      await env.GUIDE_IMAGES.health();
      r2 = 'ok';
    }
    return { ...db, features:API_FEATURES, r2, deepseek: env.DEEPSEEK_API_KEY ? 'configured' : 'not_configured', timestamp: new Date().toISOString() };
  }
  return { ...db, features:API_FEATURES, runtime: 'render-node-neon', timestamp: new Date().toISOString() };
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const requestId = String(req.headers['x-request-id'] || randomUUID());
  const url = new URL(requestUrl(req));
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const origin = String(req.headers.origin || '');
  const corsOrigin = allowedOrigin(env, origin);

  try {
    if (origin && !corsOrigin) return jsonResponse(res, 403, { ok: false, error: 'Origin is not allowed', request_id: requestId }, { 'X-Request-ID': requestId });
    const retryAfter = rateLimit(req, path);
    if (retryAfter) return jsonResponse(res, 429, { ok: false, error: 'Too many requests', request_id: requestId }, { 'Retry-After': String(retryAfter), 'X-Request-ID': requestId, ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}) });

    if (['/health', '/health/ready', '/health/live', '/health/dependencies'].includes(path)) {
      const payload = await handleHealth(path === '/health' ? '/health/ready' : path);
      return jsonResponse(res, 200, payload, { 'Cache-Control': 'no-store', 'X-Request-ID': requestId, 'X-API-Version': API_VERSION, ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin, Vary: 'Origin' } : {}) });
    }

    const body = ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : await readBody(req);
    const requestHeaders = { ...req.headers, 'x-request-id': requestId };
    const request = new Request(url, {
      method: req.method,
      headers: requestHeaders,
      body,
      ...(body ? { duplex: 'half' } : {}),
    });
    const response = await api.fetch(request, env);
    const headers = Object.fromEntries(response.headers.entries());
    headers['x-request-id'] = requestId;
    headers['x-api-version'] = API_VERSION;
    headers['vary'] = 'Origin, Accept-Encoding';
    if (corsOrigin) headers['access-control-allow-origin'] = corsOrigin;
    else delete headers['access-control-allow-origin'];
    // A platform query is part of the public resource identity. Do not let a
    // shared edge cache serve another tenant's categories, guides, or FAQ.
    const hasPlatformContext = url.searchParams.has('platform');
    if (req.method === 'GET' && !hasPlatformContext && (publicCachePaths.has(path) || path.startsWith('/guides/'))) {
      headers['cache-control'] = 'public, max-age=60, stale-while-revalidate=600, stale-if-error=86400';
    } else if (hasPlatformContext || path.startsWith('/admin/') || path.startsWith('/auth/') || path === '/chat' || path === '/guide/content' || path === '/public/guide-content') {
      headers['cache-control'] = 'no-store';
    }
    const responseBody = req.method === 'HEAD' ? null : Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, headers);
    res.end(responseBody);
  } catch (error) {
    const status = Number(error.status || 500);
    jsonResponse(res, status, { ok: false, error: status >= 500 ? 'Service temporarily unavailable' : error.message, request_id: requestId, version: API_VERSION }, { 'Cache-Control': 'no-store', 'X-Request-ID': requestId, ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}) });
    console.error(JSON.stringify({ level: 'error', request_id: requestId, method: req.method, path, status, duration_ms: Date.now() - started, message: error.message, stack: error.stack }));
    return;
  } finally {
    console.log(JSON.stringify({ level: 'info', request_id: requestId, method: req.method, path, status: res.statusCode, duration_ms: Date.now() - started, ip: clientIp(req), version: API_VERSION, ...databaseDescriptor(env) }));
  }
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 65_000;
server.listen(env.PORT, '0.0.0.0', () => console.log(JSON.stringify({ level: 'info', event: 'server_started', port: env.PORT, version: API_VERSION, ...databaseDescriptor(env) })));

async function shutdown(signal) {
  console.log(JSON.stringify({ level: 'info', event: 'shutdown_started', signal }));
  server.close(async () => {
    await closeDatabasePools();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 25_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
