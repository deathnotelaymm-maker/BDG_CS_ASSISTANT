import pg from 'pg';
import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const { Pool } = pg;
const scryptAsync = promisify(scryptCallback);
const pools = new Map();

const VERSION = '0.9.0a-reliable-r2-image-upload-diagnostics-hotfix';
const PBKDF2_ITERATIONS = 60000; // Compatibility cap only; new admin passwords use Worker-safe salted SHA-256.
const DEFAULT_SUPPORT = 'https://t.me/your_support_bot';
const OWNER_EMAIL = 'owner@example.invalid';
const STOPWORDS = new Set(['the','a','an','and','or','to','of','in','on','for','with','is','are','am','i','you','we','they','how','what','why','can','do','does','did','please','my','me','your','sir','madam','boss','babe','want','need','help']);
const SYNONYMS = {
  withdraw: ['withdraw','withdrawal','cashout','cash','payout','money'],
  deposit: ['deposit','recharge','topup','top','pay','payment'],
  bank: ['bank','card','upi','wallet','bind','binding'],
  login: ['login','signin','sign','password','otp','account','freeze','locked'],
  promotion: ['promotion','bonus','activity','invite','invitation','reward'],
  app: ['app','download','install','android','ios','desktop'],
};
let bootstrapped = false;

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') return corsResponse(null, 204, env);
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '') || '/';
      // Emergency safety: /health and /auth/login must not depend on full database bootstrap.
      if (request.method.toUpperCase() === 'GET' && path === '/health') {
        return json({ ok: true, service: appName(env), version: VERSION, runtime: 'db-bootstrap-bypassed-for-health' }, 200, env);
      }
      if (request.method.toUpperCase() === 'POST' && (path === '/auth/login' || path === '/login' || path === '/api/login')) {
        return await login(request, env);
      }
      return await route(request, env, url);
    } catch (err) {
      const status = Number(err?.status || 500);
      const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
      const url = new URL(request.url);
      console.error(JSON.stringify({
        level: 'error',
        event: 'api_request_failed',
        request_id: requestId,
        method: request.method,
        path: url.pathname,
        status,
        code: err?.code || 'INTERNAL_ERROR',
        message: err?.message || String(err),
        cause: err?.cause?.message || undefined,
        stack: err?.stack || undefined,
        version: VERSION,
      }));
      const publicMessage = status >= 500
        ? (err?.publicMessage || 'Service temporarily unavailable')
        : (err?.message || 'Request failed');
      return json({
        ok: false,
        error: publicMessage,
        code: err?.code || (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        request_id: requestId,
        version: VERSION,
      }, status, env);
    }
  }
};

async function route(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method === 'GET' && path === '/') return json({ ok: true, service: appName(env), version: VERSION, message: 'Render business backend API with Neon PostgreSQL is running.' }, 200, env);
  if (method === 'GET' && path === '/health') return json({ ok: true, service: appName(env), version: VERSION, features: ['prompt-first-ai','ai-content-studio','visual-knowledge-editor','single-content-selection','greeting-bypass','image-output-not-router','technical-failure-only-fallback','custom-category-icons','prompt-delete','structured-rich-responses','semantic-response-colors','customer-question-chat-logs','site-content-control','prompt-versions','audit-logs','render-node','neon-postgresql','r2-s3-api','deepseek','smart-memory','admin-2fa','single-session-login','owner-permissions'] }, 200, env);
  if (method === 'GET' && path.startsWith('/uploads/')) return serveUpload(request, env, path);

  // Public API
  if (method === 'GET' && (path === '/settings' || path === '/public/theme')) return json(await getTheme(env), 200, env);
  if (method === 'GET' && (path === '/guide/content' || path === '/public/guide-content')) return json(await getGuideContent(env), 200, env);
  if (method === 'GET' && (path === '/popular-help' || path === '/public/popular-help')) return json(await listPopularHelp(env, false), 200, env);
  if (method === 'GET' && (path === '/navigation' || path === '/public/navigation')) return json(await listNavigation(env, false), 200, env);
  if (method === 'GET' && (path === '/categories' || path === '/public/categories')) return json(await listCategories(env), 200, env);
  if (method === 'GET' && (path === '/guides' || path === '/public/guides')) return json(await listGuides(env, url.searchParams), 200, env);
  if (method === 'GET' && path.startsWith('/guides/')) return json(await getGuide(env, decodeURIComponent(path.split('/').pop()), url.searchParams.get('language') || url.searchParams.get('lang') || 'en'), 200, env);
  if (method === 'GET' && (path === '/faqs' || path === '/public/faqs')) return json(await listFaqs(env, false), 200, env);
  if (method === 'GET' && (path === '/chat/content' || path === '/public/chat-content')) return json(await getChatContent(env), 200, env);
  if (method === 'POST' && path === '/chat') return json(finalizeChatResponse(await runAiChat(env, await readJson(request), false)), 200, env);
  if (method === 'POST' && path === '/chat/uploads') return uploadToR2(request, env, 'chat');

  if (method === 'POST' && (path === '/auth/login' || path === '/login' || path === '/api/login')) return login(request, env);

  let admin = null;
  if (path.startsWith('/admin/')) admin = await requireAdmin(request, env);

  // Current admin security endpoints
  if (method === 'GET' && path === '/admin/me') return json({ ok: true, user: admin }, 200, env);
  if (method === 'POST' && path === '/admin/me/password') return json(await changeOwnPassword(env, admin, await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/me/2fa/setup') return json(await setupOwn2fa(env, admin), 200, env);
  if (method === 'POST' && path === '/admin/me/2fa/enable') return json(await enableOwn2fa(env, admin, await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/me/2fa/disable') return json(await disableOwn2fa(env, admin, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/sessions') return json(await listAdminSessions(env, admin), 200, env);

  // Admin settings / theme
  if (method === 'PUT' && path === '/admin/settings') return json(await updateTheme(env, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/site-content') return json(await getAdminSiteContent(env), 200, env);
  if (method === 'PUT' && path === '/admin/site-content/bulk') return json(await updateSiteContentBulk(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/site-content\/blocks\/[a-zA-Z0-9_.:-]+$/.test(path)) return json(await updateContentBlock(env, decodeURIComponent(path.split('/').pop()), await readJson(request)), 200, env);

  // Business CMS: cards, nav, homepage sections, quick replies
  if (method === 'GET' && path === '/admin/popular-help') return json(await listPopularHelp(env, true), 200, env);
  if (method === 'POST' && path === '/admin/popular-help') return json(await createPopularHelp(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/popular-help\/\d+$/.test(path)) return json(await updatePopularHelp(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/popular-help\/\d+$/.test(path)) return json(await deleteById(env, 'popular_help_cards', idFromPath(path)), 200, env);

  if (method === 'GET' && path === '/admin/navigation') return json(await listNavigation(env, true), 200, env);
  if (method === 'POST' && path === '/admin/navigation') return json(await createNavigation(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/navigation\/\d+$/.test(path)) return json(await updateNavigation(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/navigation\/\d+$/.test(path)) return json(await deleteById(env, 'navigation_items', idFromPath(path)), 200, env);

  if (method === 'GET' && path === '/admin/home-sections') return json(await listHomeSections(env, true), 200, env);
  if (method === 'PUT' && /^\/admin\/home-sections\/[a-zA-Z0-9_.:-]+$/.test(path)) return json(await updateHomeSection(env, decodeURIComponent(path.split('/').pop()), await readJson(request)), 200, env);

  if (method === 'GET' && path === '/admin/chat-quick-replies') return json(await listQuickReplies(env, true), 200, env);
  if (method === 'POST' && path === '/admin/chat-quick-replies') return json(await createQuickReply(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/chat-quick-replies\/\d+$/.test(path)) return json(await updateQuickReply(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/chat-quick-replies/batch-delete') return json(await batchDeleteByIds(env, 'chat_quick_replies', (await readJson(request)).ids), 200, env);
  if (method === 'DELETE' && path === '/admin/chat-quick-replies/all') return json(await deleteAllRows(env, 'chat_quick_replies'), 200, env);
  if (method === 'POST' && path === '/admin/chat-quick-replies/cleanup-duplicates') return json(await cleanupDuplicateQuickReplies(env), 200, env);
  if (method === 'DELETE' && /^\/admin\/chat-quick-replies\/\d+$/.test(path)) return json(await deleteById(env, 'chat_quick_replies', idFromPath(path)), 200, env);

  // Prompt-first AI Content Studio. Images are presentation output and never routing input.
  if (method === 'GET' && path === '/admin/ai-content') return json(await listAiContent(env, true), 200, env);
  if (method === 'POST' && path === '/admin/ai-content') return json(await createAiContent(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/ai-content\/\d+$/.test(path)) return json(await updateAiContent(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/ai-content\/\d+$/.test(path)) return json(await deleteAiContent(env, idFromPath(path)), 200, env);
  if (method === 'POST' && path === '/admin/ai-content/test') return json(await testAiContent(env, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/incorrect-match-reports') return json(await listIncorrectMatchReports(env), 200, env);
  if (method === 'POST' && path === '/admin/incorrect-match-reports') return json(await createIncorrectMatchReport(env, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/knowledge-versions') return json(await listKnowledgeVersions(env), 200, env);

  // Admin uploads
  if (method === 'POST' && path === '/admin/uploads') return uploadToR2(request, env, 'guide');

  // Existing admin CRUD
  if (method === 'GET' && path === '/admin/categories') return json(await listCategories(env), 200, env);
  if (method === 'POST' && path === '/admin/categories') return json(await createCategory(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/categories\/\d+$/.test(path)) return json(await updateCategory(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/categories\/\d+$/.test(path)) return json(await deleteById(env, 'categories', idFromPath(path)), 200, env);

  if (method === 'GET' && path === '/admin/guides') return json(await listAdminGuides(env), 200, env);
  if (method === 'POST' && path === '/admin/guides') return json(await createGuide(env, await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/guides/ai-layout') return json(await generateAiGuideLayout(env, await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/guides/ai-copy-layout') return json(await copyGuideLayoutForLanguage(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/guides\/\d+$/.test(path)) return json(await updateGuide(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/guides/batch-delete') return json(await batchDeleteByIds(env, 'guides', (await readJson(request)).ids), 200, env);
  if (method === 'DELETE' && /^\/admin\/guides\/\d+$/.test(path)) return json(await deleteById(env, 'guides', idFromPath(path)), 200, env);

  if (method === 'GET' && path === '/admin/faqs') return json(await listFaqs(env, true), 200, env);
  if (method === 'POST' && path === '/admin/faqs') return json(await createFaq(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/faqs\/\d+$/.test(path)) return json(await updateFaq(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/faqs\/\d+$/.test(path)) return json(await deleteById(env, 'faqs', idFromPath(path)), 200, env);

  // AI Knowledge endpoints kept only as backend compatibility. The Admin UI no longer shows AI Knowledge in v0.6.2.
  if (method === 'GET' && path === '/admin/knowledge') return json(await listKnowledge(env), 200, env);
  if (method === 'POST' && path === '/admin/knowledge') return json(await createKnowledge(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/knowledge\/\d+$/.test(path)) return json(await updateKnowledge(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/knowledge\/\d+$/.test(path)) return json(await deleteById(env, 'knowledge_items', idFromPath(path)), 200, env);

  // Owner/Admin users
  if (method === 'GET' && path === '/admin/admin-users') { requireOwner(admin); return json(await listAdminUsers(env), 200, env); }
  if (method === 'POST' && path === '/admin/admin-users') { requireOwner(admin); return json(await createAdminUser(env, await readJson(request)), 200, env); }
  if (method === 'PUT' && /^\/admin\/admin-users\/\d+$/.test(path)) { requireOwner(admin); return json(await updateAdminUser(env, idFromPath(path), await readJson(request)), 200, env); }
  if (method === 'POST' && /^\/admin\/admin-users\/\d+\/password$/.test(path)) { requireOwner(admin); return json(await changeAdminPassword(env, idFromParts(path, 3), await readJson(request)), 200, env); }
  if (method === 'DELETE' && /^\/admin\/admin-users\/\d+$/.test(path)) { requireOwner(admin); return json(await deleteAdminUser(env, idFromPath(path)), 200, env); }

  // AI mode
  if (method === 'GET' && path === '/admin/ai/prompts') return json(await listPrompts(env), 200, env);
  if (method === 'POST' && path === '/admin/ai/prompts') return json(await upsertPrompt(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/ai\/prompts\/\d+$/.test(path)) return json(await updatePrompt(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'DELETE' && /^\/admin\/ai\/prompts\/\d+$/.test(path)) { requireOwner(admin); return json(await deletePrompt(env, idFromPath(path)), 200, env); }
  if (method === 'GET' && path === '/admin/ai/prompt-versions') return json(await listPromptVersions(env), 200, env);
  if (method === 'GET' && /^\/admin\/ai\/prompts\/\d+\/versions$/.test(path)) return json(await listPromptVersions(env, idFromParts(path, 4)), 200, env);
  if (method === 'POST' && /^\/admin\/ai\/prompts\/\d+\/restore\/\d+$/.test(path)) return json(await restorePromptVersion(env, Number(path.split('/')[4]), Number(path.split('/')[6])), 200, env);
  if (method === 'GET' && path === '/admin/ai/settings') return json(await getAiSettingsOut(env), 200, env);
  if (method === 'PUT' && path === '/admin/ai/settings') return json(await updateAiSettings(env, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/ai/diagnostics') return json(await aiDiagnostics(env), 200, env);
  if (method === 'GET' && path === '/admin/api-diagnostics') return json(await adminApiDiagnostics(env), 200, env);
  if (method === 'GET' && path === '/admin/system-health') return json(await systemHealth(env), 200, env);
  if (method === 'GET' && path === '/admin/foundation-diagnostics') return json(await adminFoundationDiagnostics(env), 200, env);
  if (method === 'POST' && path === '/admin/ai/test') return json(finalizeChatResponse(await runAiChat(env, await readJson(request), true)), 200, env);

  if (method === 'GET' && path === '/admin/chat-sessions') return json(await listSessions(env), 200, env);
  if (method === 'DELETE' && path.startsWith('/admin/chat-sessions/')) return json(await clearSession(env, decodeURIComponent(path.replace('/admin/chat-sessions/', ''))), 200, env);
  if (method === 'GET' && path === '/admin/chat-logs') return json(await listChatLogs(env), 200, env);
  if (method === 'GET' && path === '/admin/unmatched-questions') return json(await listUnmatchedQuestions(env), 200, env);
  if (method === 'DELETE' && /^\/admin\/unmatched-questions\/\d+$/.test(path)) return json(await deleteById(env, 'unmatched_questions', idFromPath(path)), 200, env);
  if (method === 'GET' && path === '/admin/audit-logs') return json(await listAuditLogs(env), 200, env);

  return json({ ok: false, error: 'Not found', path }, 404, env);
}

function idFromPath(path) { return Number(path.split('/').pop()); }
function idFromParts(path, index) { return Number(path.split('/')[index]); }
function appName(env) { return env.APP_NAME || 'BDG Help Center'; }
function getConnectionString(env) {
  const connectionString = env.DATABASE_URL || env.HYPERDRIVE?.connectionString;
  if (!connectionString) throw new Error('Missing required DATABASE_URL');
  return connectionString;
}
function getPool(env) {
  const connectionString = getConnectionString(env);
  if (!pools.has(connectionString)) {
    const ssl = String(env.DATABASE_SSL || 'false').toLowerCase() === 'true' ? { rejectUnauthorized: false } : undefined;
    const pool = new Pool({
      connectionString,
      max: Number(env.DB_POOL_MAX || 10),
      min: Number(env.DB_POOL_MIN || 0),
      idleTimeoutMillis: Number(env.DB_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(env.DB_CONNECT_TIMEOUT_MS || 5000),
      statement_timeout: Number(env.DB_QUERY_TIMEOUT_MS || 15000),
      query_timeout: Number(env.DB_QUERY_TIMEOUT_MS || 15000),
      allowExitOnIdle: false,
      keepAlive: true,
      keepAliveInitialDelayMillis: Number(env.DB_KEEPALIVE_INITIAL_DELAY_MS || 10000),
      application_name: 'bdg-help-render-neon',
      ssl,
    });
    pool.on('error', (error) => console.error(JSON.stringify({ level: 'error', event: 'postgres_pool_error', message: error.message })));
    pools.set(connectionString, pool);
  }
  return pools.get(connectionString);
}
async function q(env, text, params = []) {
  if (!Array.isArray(params)) params = [];
  if (env?.__DB_CLIENT) return env.__DB_CLIENT.query(text, params);
  return getPool(env).query(text, params);
}
export async function closeDatabasePools() {
  await Promise.all([...pools.values()].map((pool) => pool.end().catch(() => undefined)));
  pools.clear();
}
function corsHeaders(env) { return { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' }; }
function corsResponse(body, status, env, headers = {}) { return new Response(body, { status, headers: { ...corsHeaders(env), ...headers } }); }
function json(data, status = 200, env) { return corsResponse(JSON.stringify(data), status, env, { 'Content-Type': 'application/json; charset=utf-8' }); }
function bad(message, status = 400, code = 'BAD_REQUEST') { const e = new Error(message); e.status = status; e.code = code; throw e; }


function slugifyGuideText(text) {
  return String(text || 'guide')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'guide';
}
function compactLine(line) { return String(line || '').replace(/\s+/g, ' ').trim(); }
function detectGuideCategory(raw) {
  const t = String(raw || '').toLowerCase();
  if (/deposit|recharge|top\s*up|payment|balance added/.test(t)) return { slug: 'deposit', name: 'Deposit' };
  if (/withdraw|withdrawal|payout|cashout/.test(t)) return { slug: 'withdrawal', name: 'Withdrawal' };
  if (/bank|upi|wallet|ifsc|account number/.test(t)) return { slug: 'account', name: 'Account' };
  if (/login|password|otp|frozen|locked|ip/.test(t)) return { slug: 'account', name: 'Account' };
  if (/app|download|install|android|ios/.test(t)) return { slug: 'app', name: 'App' };
  return { slug: '', name: 'General' };
}
function buildGuideKeywords(raw, title) {
  const words = String(`${title || ''} ${raw || ''}`).toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || [];
  const banned = new Set(['the','and','for','with','your','this','that','please','account','guide','step','steps','submit','click','open']);
  const counts = new Map();
  for (const w of words) if (!banned.has(w)) counts.set(w, (counts.get(w) || 0) + 1);
  return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 12).map(x=>x[0]).join(', ');
}
function heuristicGuideBlocks(rawText, template = 'problem_solution') {
  const text = String(rawText || '').replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = text.split(/\n+/).map(compactLine).filter(Boolean);
  const first = lines[0] || 'Guide';
  const title = first.length <= 90 ? first.replace(/^title[:：]\s*/i, '') : first.slice(0, 80);
  const blocks = [];
  blocks.push({ type: 'heading', level: 2, text: title });
  const intro = lines.find((l, i) => i > 0 && l.length > 30 && !/^\d+[.)]/.test(l)) || 'Follow the approved steps below. Please make sure all details are correct before submitting.';
  blocks.push({ type: 'paragraph', text: intro });
  const warningLine = lines.find(l => /important|注意|warning|must|required|clear|correct|do not|don't/i.test(l));
  if (warningLine) blocks.push({ type: 'note', text: warningLine });
  const stepLines = [];
  for (const line of lines) {
    const m = line.match(/^(?:step\s*)?(\d+)[.)：:]\s*(.+)$/i);
    if (m) stepLines.push(m[2]);
  }
  if (!stepLines.length) {
    for (const line of lines.slice(1)) {
      if (/click|open|select|enter|upload|submit|confirm|go to|choose|check/i.test(line)) stepLines.push(line);
    }
  }
  const usedSteps = stepLines.slice(0, 10);
  if (usedSteps.length) {
    blocks.push({ type: 'heading', level: 2, text: 'Step-by-step guide' });
    usedSteps.forEach((line, idx) => {
      blocks.push({ type: 'step', title: `Step ${idx + 1}`, text: line });
      if (idx === 1 || idx === usedSteps.length - 1) blocks.push({ type: 'image', url: '', alt: `Screenshot for Step ${idx + 1}`, caption: `Upload the related screenshot for Step ${idx + 1}` });
    });
  } else {
    blocks.push({ type: 'paragraph', text: lines.slice(1, 5).join('\n') || text });
    blocks.push({ type: 'image', url: '', alt: 'Guide screenshot', caption: 'Upload the related guide screenshot here' });
  }
  if (/reject|failed|wrong|unclear|missing|not match/i.test(text)) {
    blocks.push({ type: 'warning', text: 'If the request is rejected, please check whether the submitted details and documents match the account information.' });
  }
  if (template === 'faq') {
    blocks.push({ type: 'heading', level: 2, text: 'Common questions' });
    blocks.push({ type: 'paragraph', text: 'Q: What should the member do if the issue is still not solved?\nA: Contact official customer support with the correct request details.' });
  }
  blocks.push({ type: 'note', text: 'Please review the guide before publishing. AI prepared the layout, but admin approval is required.' });
  return blocks;
}
async function generateAiGuideLayout(env, data) {
  const raw_text = String(data?.raw_text || data?.text || '').trim();
  if (!raw_text) return { ok: false, error: 'raw_text is required' };
  const language = String(data?.language || 'en').toLowerCase();
  const template = String(data?.template || 'problem_solution');
  const blocks = heuristicGuideBlocks(raw_text, template);
  const title = blocks.find(b => b.type === 'heading')?.text || 'Guide';
  const category = detectGuideCategory(raw_text);
  const summary = blocks.find(b => b.type === 'paragraph')?.text?.slice(0, 220) || 'Step-by-step official guide.';
  const keywords = buildGuideKeywords(raw_text, title);
  const payload = {
    ok: true,
    source: 'safe-local-guide-layout-assistant',
    ai_note: 'Layout generated from admin-provided text. Review before publishing. Official meaning is preserved; no policy/rule changes are added.',
    language,
    title,
    summary,
    slug: slugifyGuideText(title),
    category_slug: category.slug,
    category_name: category.name,
    keywords,
    image_suggestions: blocks.filter(b => b.type === 'image').map((b, i) => ({ position: i + 1, caption: b.caption || 'Upload related screenshot' })),
    blocks,
  };
  if (language === 'hi') {
    payload.title_hi = title;
    payload.summary_hi = summary;
    payload.body_blocks_json_hi = JSON.stringify(blocks);
  } else {
    payload.body_blocks_json = JSON.stringify(blocks);
  }
  return payload;
}
async function copyGuideLayoutForLanguage(env, data) {
  const sourceBlocks = Array.isArray(data?.blocks) ? data.blocks : [];
  const target = String(data?.target_language || 'hi').toLowerCase();
  const copied = sourceBlocks.map((b) => {
    if (b.type === 'image') return { ...b, url: '', caption: target === 'hi' ? 'यहाँ हिंदी/भारतीय स्क्रीनशॉट अपलोड करें' : (b.caption || 'Upload localized screenshot here') };
    if (b.type === 'step') return { ...b, image: '', title: `${b.title || 'Step'} (${target.toUpperCase()} draft)`, text: b.text || '' };
    if (b.type === 'heading') return { ...b, text: `${b.text || 'Guide'} (${target.toUpperCase()} draft)` };
    return { ...b };
  });
  return { ok: true, target_language: target, blocks: copied, note: 'Layout copied. Translate text and upload localized screenshots before publishing.' };
}

async function ensureBootstrap(env) {
  if (bootstrapped) return;
  await ensureAdminAuthReady(env);
  await createTables(env);
  await seedDefaults(env);
  bootstrapped = true;
}
async function createTables(env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY,name VARCHAR(160) DEFAULT 'Owner',email VARCHAR(255) UNIQUE NOT NULL,password_hash VARCHAR(255),role VARCHAR(50) DEFAULT 'owner',is_active BOOLEAN DEFAULT TRUE,last_login_at TIMESTAMPTZ,twofa_enabled BOOLEAN DEFAULT FALSE,twofa_secret TEXT,session_version INTEGER DEFAULT 0,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY,name VARCHAR(120) UNIQUE NOT NULL,slug VARCHAR(150) UNIQUE NOT NULL,description TEXT,icon VARCHAR(20) DEFAULT 'target',icon_url TEXT,sort_order INTEGER DEFAULT 100,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS guides (id SERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,slug VARCHAR(220) UNIQUE NOT NULL,summary TEXT,body TEXT NOT NULL,image_urls TEXT,keywords TEXT,language VARCHAR(20) DEFAULT 'en',priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'published',category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS faqs (id SERIAL PRIMARY KEY,question VARCHAR(255) NOT NULL,answer TEXT NOT NULL,keywords TEXT,priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS knowledge_items (id SERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,content TEXT NOT NULL,keywords TEXT,priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS theme_settings (id SERIAL PRIMARY KEY,app_name VARCHAR(160) DEFAULT 'BDG Help Center',logo_text VARCHAR(40) DEFAULT 'BDG',banner_title VARCHAR(200) DEFAULT 'BDG Mobile Help Center',banner_subtitle VARCHAR(255) DEFAULT 'Search FAQ and view official guide images.',support_link VARCHAR(500) DEFAULT 'https://t.me/your_support_bot',primary_color VARCHAR(40) DEFAULT '#f7c948',updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ai_prompt_sections (id SERIAL PRIMARY KEY,section_key VARCHAR(80) UNIQUE NOT NULL,title VARCHAR(180) NOT NULL,content TEXT DEFAULT '',enabled BOOLEAN DEFAULT TRUE,priority INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ai_content_items (id SERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,intent_key VARCHAR(180) UNIQUE NOT NULL,locale VARCHAR(20) DEFAULT 'en',status VARCHAR(30) DEFAULT 'draft',priority INTEGER DEFAULT 100,confidence_threshold INTEGER DEFAULT 86,keywords TEXT,positive_examples TEXT,negative_examples TEXT,required_fields TEXT,faq_content TEXT,knowledge_content TEXT,example_answers TEXT,ai_instruction TEXT,rich_json TEXT,rich_html TEXT,image_urls TEXT,image_delivery VARCHAR(30) DEFAULT 'after_answer',version_label VARCHAR(80) DEFAULT 'v1',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW(),deleted_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS ai_model_settings (id SERIAL PRIMARY KEY,provider VARCHAR(50) DEFAULT 'deepseek',model VARCHAR(120) DEFAULT 'deepseek-chat',api_base VARCHAR(500) DEFAULT 'https://api.deepseek.com',enabled BOOLEAN DEFAULT FALSE,temperature DOUBLE PRECISION DEFAULT 0.2,max_tokens INTEGER DEFAULT 700,require_approved_context BOOLEAN DEFAULT TRUE,memory_enabled BOOLEAN DEFAULT TRUE,memory_max_messages INTEGER DEFAULT 12,memory_ttl_days INTEGER DEFAULT 30,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_sessions (id SERIAL PRIMARY KEY,session_id VARCHAR(120) UNIQUE NOT NULL,memory_summary TEXT,message_count INTEGER DEFAULT 0,resolution_state TEXT DEFAULT 'open',resolved_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_memory_messages (id SERIAL PRIMARY KEY,session_id VARCHAR(120) NOT NULL,role VARCHAR(20) NOT NULL,content TEXT NOT NULL,image_urls TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_logs (id SERIAL PRIMARY KEY,session_id VARCHAR(120),customer_message TEXT NOT NULL,assistant_reply TEXT NOT NULL,matched_sources TEXT,matched_images TEXT,uploaded_images TEXT,used_deepseek BOOLEAN DEFAULT FALSE,model VARCHAR(120),response_blocks_json TEXT,response_format TEXT DEFAULT 'structured-v1',resolution_state TEXT DEFAULT 'open',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS site_content_blocks (id SERIAL PRIMARY KEY,block_key VARCHAR(100) UNIQUE NOT NULL,label VARCHAR(160) NOT NULL,value TEXT DEFAULT '',input_type VARCHAR(40) DEFAULT 'text',sort_order INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS popular_help_cards (id SERIAL PRIMARY KEY,title VARCHAR(120) NOT NULL,subtitle VARCHAR(200),icon VARCHAR(24) DEFAULT 'star',query VARCHAR(200),linked_category_slug VARCHAR(150),sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS navigation_items (id SERIAL PRIMARY KEY,nav_key VARCHAR(80) UNIQUE NOT NULL,label VARCHAR(80) NOT NULL,icon VARCHAR(24) DEFAULT '•',href VARCHAR(500) DEFAULT '#',sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS guide_home_sections (id SERIAL PRIMARY KEY,section_key VARCHAR(80) UNIQUE NOT NULL,title VARCHAR(160) NOT NULL,enabled BOOLEAN DEFAULT TRUE,sort_order INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_quick_replies (id SERIAL PRIMARY KEY,text VARCHAR(180) NOT NULL,query VARCHAR(220),sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS unmatched_questions (id SERIAL PRIMARY KEY,session_id VARCHAR(120),customer_message TEXT NOT NULL,language VARCHAR(20) DEFAULT 'en',suggested_intent TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS incorrect_match_reports (id SERIAL PRIMARY KEY,session_id VARCHAR(120),message TEXT NOT NULL,detected_intent TEXT,expected_intent TEXT,reason TEXT,status VARCHAR(30) DEFAULT 'open',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS knowledge_versions (id SERIAL PRIMARY KEY,version_label VARCHAR(80),content_type VARCHAR(60),content_id INTEGER,status VARCHAR(30) DEFAULT 'draft',notes TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),published_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS ai_prompt_versions (id SERIAL PRIMARY KEY,prompt_id INTEGER,section_key VARCHAR(80),title VARCHAR(180),content TEXT,enabled BOOLEAN,priority INTEGER,change_note TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY,actor_email VARCHAR(255),action VARCHAR(120) NOT NULL,entity_type VARCHAR(120),entity_id VARCHAR(120),details TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS admin_sessions (id SERIAL PRIMARY KEY,admin_email VARCHAR(255),session_version INTEGER DEFAULT 0,user_agent TEXT,ip TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),last_seen_at TIMESTAMPTZ DEFAULT NOW(),revoked_at TIMESTAMPTZ)`,
    `CREATE TABLE IF NOT EXISTS system_migrations (migration_key VARCHAR(120) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT)`
  ];
  for (const s of statements) await q(env, s);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_guides_status ON guides(status)`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_faqs_status ON faqs(status)`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status)`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id)`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_content_key ON site_content_blocks(block_key)`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_ai_content_status_priority ON ai_content_items(status, priority, id)`);
  // v0.6.2c recovery: older deployments may already have admin_users with fewer columns.
  // CREATE TABLE IF NOT EXISTS does not upgrade existing tables, so add every owner/admin column safely.
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name VARCHAR(160) DEFAULT 'Owner'`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner'`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS twofa_secret TEXT`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 0`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  await q(env, `UPDATE admin_users SET name=COALESCE(name, 'Owner'), role=COALESCE(role, 'owner'), is_active=COALESCE(is_active, TRUE), updated_at=COALESCE(updated_at, NOW())`);
  await q(env, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_url TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE faqs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE chat_quick_replies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE unmatched_questions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await ensureOwnerAdmin(env);
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.6.6_admin_foundation_owner_lacus', 'Owner/account/admin foundation migration applied') ON CONFLICT(migration_key) DO NOTHING`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_icon_url TEXT`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS guide_logo_url TEXT`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_header_title TEXT DEFAULT 'BDG AI Support'`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_online_text TEXT DEFAULT 'Online assistant'`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS show_chat_support_button BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS show_guide_support_button BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_welcome_title TEXT DEFAULT 'Welcome to BDG AI Support'`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_welcome_subtitle TEXT DEFAULT 'Please describe your issue and we will guide you step by step.'`);
  await q(env, `ALTER TABLE theme_settings ADD COLUMN IF NOT EXISTS chat_input_placeholder TEXT DEFAULT 'Type your message...'`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS title_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS summary_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS body_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS body_html TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS body_blocks_json TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS cover_image_url TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS body_html_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS body_blocks_json_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS image_urls_hi TEXT`);
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS cover_image_url_hi TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS active_intent TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS detected_language VARCHAR(20)`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS selected_language VARCHAR(20)`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS conversation_state_json TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS confirmed_issue TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS missing_required_details TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_unresolved_question TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS guide_already_sent BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS sensitive_confirmation_status TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS resolution_state TEXT DEFAULT 'open'`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS provider_status TEXT DEFAULT 'fallback'`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS error_type TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS error_detail TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS latency_ms INTEGER DEFAULT 0`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS request_id TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS intent_id TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS confidence INTEGER`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS attachment_decision TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS response_blocks_json TEXT`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS response_format TEXT DEFAULT 'structured-v1'`);
  await q(env, `ALTER TABLE chat_logs ADD COLUMN IF NOT EXISTS resolution_state TEXT DEFAULT 'open'`);
  await q(env, `CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at DESC)`);
  await q(env, `DO $$ BEGIN IF to_regclass('public.smart_match_guides') IS NOT NULL THEN EXECUTE 'UPDATE smart_match_guides SET status=''archived'', updated_at=NOW() WHERE status=''active'''; END IF; END $$`);
  await q(env, `UPDATE ai_prompt_sections SET enabled=FALSE, updated_at=NOW() WHERE section_key IN ('guide_usage_policy','smart_guide_rules','fallback_reply_rules')`);
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.9.0_prompt_first_ai_content_studio', 'Guide Attachments archived; AI Content Studio, visual knowledge, strict greeting bypass, and technical-only fallback enabled') ON CONFLICT(migration_key) DO NOTHING`);
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.8.0_structured_rich_responses_precision_guide_delivery', 'Structured response blocks, explicit resolution state, live Guide content, and customer-first Chat Logs') ON CONFLICT(migration_key) DO NOTHING`);
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.7.1_admin_stability_reliable_ai_fallback', 'Chat diagnostics, stable content/theme contracts, and reliable AI fallback') ON CONFLICT(migration_key) DO NOTHING`);
}
async function seedDefaults(env) {
  await q(env, `INSERT INTO theme_settings (app_name, logo_text, banner_title, banner_subtitle, support_link, primary_color) SELECT $1,'BDG','BDG Mobile Help Center','Search FAQ and view official guide images.',$2,'#f7c948' WHERE NOT EXISTS (SELECT 1 FROM theme_settings)`, [appName(env), env.SUPPORT_LINK || DEFAULT_SUPPORT]);
  await q(env, `INSERT INTO ai_model_settings (provider, model, api_base, enabled, temperature, max_tokens, require_approved_context, memory_enabled, memory_max_messages, memory_ttl_days) SELECT 'deepseek', $1::text, $2::text, $3::boolean, 0.2, 700, TRUE, TRUE, 12, 30 WHERE NOT EXISTS (SELECT 1 FROM ai_model_settings)`, [env.DEEPSEEK_MODEL || 'deepseek-chat', env.DEEPSEEK_API_BASE || 'https://api.deepseek.com', String(env.AI_MODE_ENABLED || '').toLowerCase() === 'true']);
  await ensureOwnerAdmin(env);
  await q(env, `INSERT INTO categories (name, slug, description, icon, sort_order) SELECT * FROM (VALUES ('Withdrawal','withdrawal','Withdraw, bank card, and payout help','card',10),('Deposit','deposit','Recharge and payment guide','money',20),('Account','account','Login, password, and account help','user',30),('Promotion','promotion','Bonus and activity help','gift',40)) AS v(name, slug, description, icon, sort_order) WHERE NOT EXISTS (SELECT 1 FROM categories)`);
  await q(env, `INSERT INTO guides (title, slug, summary, body, image_urls, keywords, language, priority, status, category_id) SELECT 'How to Bind Bank Card','how-to-bind-bank-card','Fill in the correct bank card information before withdrawal.','1. Open Wallet or Profile.\n2. Choose Bank Card or Payment Method.\n3. Fill in the correct bank card information.\n4. Check the name, card number, and bank carefully.\n5. Submit and wait for confirmation.\n\nImportant: wrong bank information may cause withdrawal delay or failure.','','bank card, bind card, add bank, bank information, withdrawal card, payout card, wrong card','en',10,'published',(SELECT id FROM categories WHERE slug='withdrawal' LIMIT 1) WHERE NOT EXISTS (SELECT 1 FROM guides)`);
  await q(env, `INSERT INTO faqs (question, answer, keywords, priority, status) SELECT * FROM (VALUES ('Do I need login to use help center?','No. Customers can open FAQ and guides without login.','login, help center, customer',10,'published'),('How can I contact support?','Tap Contact Support or Official Support on the page. Use only the official support link.','support, telegram, customer service, contact',20,'published'),('Why should bank card information be correct?','Wrong bank card information may cause withdrawal delay or failure. Please check carefully before submitting.','bank card, wrong bank, withdrawal failed',30,'published')) AS v(question, answer, keywords, priority, status) WHERE NOT EXISTS (SELECT 1 FROM faqs)`);
  await q(env, `INSERT INTO knowledge_items (title, content, keywords, priority, status) SELECT * FROM (VALUES ('Safe answer rule','Only answer with approved FAQ, guide, and admin knowledge. If the question is not covered, ask the customer to contact official support.','fallback, unknown, support',10,'active'),('Simple customer tone','Use short, simple, polite sentences. Give clear steps. Show matched guide images when available.','tone, style, reply',20,'active')) AS v(title, content, keywords, priority, status) WHERE NOT EXISTS (SELECT 1 FROM knowledge_items)`);
  await seedContent(env);
  await seedPromptSections(env);
}
async function seedContent(env) {
  const blocks = [
    ['header_status','Header status text','Official Help Center','text',10],['hero_eyebrow','Hero eyebrow','24/7 HELP & GUIDE','text',20],['hero_title','Hero title','BDG Mobile Help Center','text',30],['hero_subtitle','Hero subtitle','Search FAQ, view guide images, or contact official support.','textarea',40],['search_placeholder','Search placeholder','Search help, FAQ, or guide','text',50],['search_button_text','Search button text','Search','text',55],['quick_help_title','Quick help label','Quick help','text',60],['popular_title','Popular help title','Popular Help','text',70],['topics_title','Topics title','Topics','text',80],['guides_title','Guides title','Official Guides','text',90],['faq_title','FAQ title','Frequently Asked','text',100],['support_button_text','Support button text','Support','text',110],['read_guide_text','Read guide button text','Read guide','text',112],['view_all_text','View all button text','View all','text',114],['footer_note','Footer note','Official BDG Mobile Help Center','text',120],['guide_empty_title','No guide title','No guides yet','text',130],['guide_empty_message','No guide message','Guide images will appear here after admin publishes them.','textarea',140],['error_state_text','Guide loading error','Unable to load guide content from the backend.','textarea',150]
  ];
  for (const b of blocks) await q(env, `INSERT INTO site_content_blocks(block_key,label,value,input_type,sort_order) VALUES($1,$2,$3,$4,$5) ON CONFLICT(block_key) DO NOTHING`, b);
  const cards = [['Deposit','Add funds to your account','money','deposit','deposit',10,'active'],['Withdrawal','Cash out safely','card','withdrawal','withdrawal',20,'active'],['Bank Card','Link or verify your card','bank','bank card','withdrawal',30,'active'],['Login','Sign-in and password help','lock','login','account',40,'active']];
  for (const c of cards) await q(env, `INSERT INTO popular_help_cards(title,subtitle,icon,query,linked_category_slug,sort_order,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, c);
  const nav = [['home','Home','home','#',10,'active'],['guides','Guides','book','#guidesSection',20,'active'],['faq','FAQ','help','#faqSection',30,'active'],['support','Support','support','support',40,'active']];
  for (const n of nav) await q(env, `INSERT INTO navigation_items(nav_key,label,icon,href,sort_order,status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(nav_key) DO NOTHING`, n);
  const sections = [['hero','Hero',true,10],['popular','Popular Help',false,20],['topics','Topics',true,30],['guides','Guides',true,40],['faq','FAQ',true,50],['support','Support block',true,60],['ai_entry','AI Chat entry on guide site',false,70]];
  for (const s of sections) await q(env, `INSERT INTO guide_home_sections(section_key,title,enabled,sort_order) VALUES($1,$2,$3,$4) ON CONFLICT(section_key) DO NOTHING`, s);
  const replies = [['How to withdraw?','how to withdraw',10,'active'],['How to bind bank card?','how to bind bank card',20,'active'],['How to deposit?','how to deposit',30,'active'],['Contact support','contact support',40,'active']];
  for (const r of replies) await q(env, `INSERT INTO chat_quick_replies(text,query,sort_order,status) SELECT $1::text,$2::text,$3::integer,$4::text WHERE NOT EXISTS (SELECT 1 FROM chat_quick_replies WHERE lower(trim(text))=lower(trim($1::text)) AND lower(trim(query))=lower(trim($2::text)))`, r);
}

async function seedPromptSections(env) {
  const prompts = [
    ['role','Role','You are the official BDG Help Center customer support assistant. Be polite, short, accurate, and customer-service focused.',true,10],
    ['job','Job','Help customers understand platform information and support steps. Do not perform account actions.',true,20],
    ['knowledge','Knowledge','Use AI Prompt Manager as the primary source of behavior, rules, tone, safety, and escalation. Use at most one published AI Content item when it matches with high confidence.',true,30],
    ['faq_prompt','FAQ Prompt','When one published AI Content item matches clearly, use its approved FAQ and knowledge as supporting context. Do not guess a topic.',true,40],
    ['example_answers','Example Answers','Example: "Please check your bank card information carefully before submitting withdrawal."',true,50],
    ['response_policy','Response Policy','Use simple steps. Avoid long explanations. Do not promise approval, payment success, or account changes.',true,60],
    ['language_rules','Language Rules','Reply in the same language as the customer when possible. Use simple words and short sentences.',true,70],
    ['safety_rules','Safety Rules','Never ask for password, OTP, PIN, full bank login, or private security information.',true,80],
    ['escalation_rules','Escalation Rules','If the issue needs account verification, payment confirmation, withdrawal approval, or manual checking, ask the customer to contact official support.',true,90],
    ['image_receipt_rules','Image / Receipt Rules','When users upload images or receipts, explain what they can check. Do not confirm payment success unless system data confirms it.',true,100],
    ['visual_content_policy','Visual Content Policy','Images are presentation output only, never routing input. Attach images after the text answer only when the single selected AI Content item explicitly includes them.',true,110],
    ['forbidden_actions','Forbidden Actions','Do not approve deposits, withdrawals, bonuses, account changes, or security changes. Do not invent business rules or use a hardcoded business fallback.',true,130]
  ];
  for (const p of prompts) await q(env, `INSERT INTO ai_prompt_sections(section_key,title,content,enabled,priority) VALUES($1,$2,$3,$4,$5) ON CONFLICT(section_key) DO NOTHING`, p);
}

function splitUrls(value) { return !value ? [] : String(value).split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
function joinUrls(urls) { return (urls || []).map(u => String(u || '').trim()).filter(Boolean).join('\n'); }
function slugify(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') || 'item'; }
function cleanAssistantText(text) { return String(text || '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/[ \t]+$/gm, '').trim(); }
function firstSentences(text, max = 500) { const s = String(text || '').replace(/\s+/g, ' ').trim(); return s.length > max ? s.slice(0, max - 1) + '...' : s; }
function tokenize(text) { const source = String(text || '').toLowerCase(); const words = source.match(/[a-z0-9]+/g) || []; const expanded = []; for (const w of words) { if (!STOPWORDS.has(w)) expanded.push(w); for (const list of Object.values(SYNONYMS)) if (list.includes(w)) expanded.push(...list); } return expanded; }
function scoreMatch(message, fields = [], keywords = '') { const msg = tokenize(message); if (!msg.length) return 0; const hay = tokenize([...fields, keywords].join(' ')); const hset = new Set(hay); let score = 0; for (const w of msg) if (hset.has(w)) score += 5; const k = String(keywords || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean); for (const phrase of k) if (String(message || '').toLowerCase().includes(phrase)) score += 18; return score; }
function categoryOut(row) { return { id: row.id, name: row.name, slug: row.slug, description: row.description, icon: row.icon || 'target', icon_url: row.icon_url || '', sort_order: row.sort_order ?? 100 }; }
function guideOut(row, lang='en') {
  const useHi = String(lang || '').toLowerCase().startsWith('hi');
  const imageUrlsEn = splitUrls(row.image_urls);
  const imageUrlsHi = splitUrls(row.image_urls_hi);
  const imageUrls = useHi && imageUrlsHi.length ? imageUrlsHi : imageUrlsEn;
  const bodyBlocks = useHi && row.body_blocks_json_hi ? row.body_blocks_json_hi : row.body_blocks_json;
  const bodyHtml = useHi && row.body_html_hi ? row.body_html_hi : row.body_html;
  const bodyText = useHi && row.body_hi ? row.body_hi : row.body;
  const title = useHi && row.title_hi ? row.title_hi : row.title;
  const summary = useHi && row.summary_hi ? row.summary_hi : row.summary;
  return {
    id: row.id,
    title,
    title_hi: row.title_hi || '',
    slug: row.slug,
    summary,
    summary_hi: row.summary_hi || '',
    body: bodyText || '',
    body_hi: row.body_hi || '',
    body_html: bodyHtml || '',
    body_html_hi: row.body_html_hi || '',
    body_blocks_json: row.body_blocks_json || '',
    body_blocks_json_hi: row.body_blocks_json_hi || '',
    blocks: parseBlocks(bodyBlocks),
    image_urls: imageUrls,
    image_urls_hi: imageUrlsHi,
    cover_image_url: (useHi && row.cover_image_url_hi) ? row.cover_image_url_hi : (row.cover_image_url || imageUrls[0] || ''),
    cover_image_url_hi: row.cover_image_url_hi || imageUrlsHi[0] || '',
    keywords: row.keywords || '',
    language: lang || row.language || 'en',
    priority: row.priority ?? 100,
    status: row.status || 'published',
    category_id: row.category_id,
    category_name: row.category_name || null,
    category_icon: row.category_icon || null,
    category_slug: row.category_slug || null,
    translations: {
      en: { title: row.title || '', summary: row.summary || '', body: row.body || '', body_html: row.body_html || '', image_urls: imageUrlsEn, cover_image_url: row.cover_image_url || imageUrlsEn[0] || '' },
      hi: { title: row.title_hi || '', summary: row.summary_hi || '', body: row.body_hi || '', body_html: row.body_html_hi || '', image_urls: imageUrlsHi, cover_image_url: row.cover_image_url_hi || imageUrlsHi[0] || '' },
    },
  };
}
function faqOut(row) { return { id: row.id, question: row.question, answer: row.answer, keywords: row.keywords || '', priority: row.priority ?? 100, status: row.status || 'published' }; }
function knowledgeOut(row) { return { id: row.id, title: row.title, content: row.content, keywords: row.keywords || '', priority: row.priority ?? 100, status: row.status || 'active' }; }
function promptOut(row) { return { id: row.id, section_key: row.section_key, title: row.title, content: row.content || '', enabled: !!row.enabled, priority: row.priority ?? 100, updated_at: String(row.updated_at || '') }; }
function aiSettingOut(row, env) { row = row || {}; return { id: row.id || 1, provider: row.provider || 'deepseek', model: row.model || env.DEEPSEEK_MODEL || 'deepseek-chat', api_base: row.api_base || env.DEEPSEEK_API_BASE || 'https://api.deepseek.com', enabled: !!row.enabled, temperature: Number(row.temperature ?? 0.2), max_tokens: row.max_tokens ?? 700, require_approved_context: !!row.require_approved_context, memory_enabled: row.memory_enabled !== false, memory_max_messages: row.memory_max_messages ?? 12, memory_ttl_days: row.memory_ttl_days ?? 30, has_api_key: !!env.DEEPSEEK_API_KEY }; }
function blockOut(row) { return { id: row.id, block_key: row.block_key, label: row.label, value: row.value || '', input_type: row.input_type || 'text', sort_order: row.sort_order ?? 100, updated_at: row.updated_at ? String(row.updated_at) : '' }; }
function cardOut(row) { return { id: row.id, title: row.title, subtitle: row.subtitle || '', icon: row.icon || 'star', query: row.query || '', linked_category_slug: row.linked_category_slug || '', sort_order: row.sort_order ?? 100, status: row.status || 'active' }; }
function navOut(row) { return { id: row.id, nav_key: row.nav_key, label: row.label, icon: row.icon || '•', href: row.href || '#', sort_order: row.sort_order ?? 100, status: row.status || 'active' }; }
function sectionOut(row) { return { id: row.id, section_key: row.section_key, title: row.title, enabled: !!row.enabled, sort_order: row.sort_order ?? 100 }; }
function quickReplyOut(row) { return { id: row.id, text: row.text, query: row.query || row.text, sort_order: row.sort_order ?? 100, status: row.status || 'active' }; }
function aiContentOut(row, score = null, reason = '') {
  return {
    id: row.id,
    title: row.title,
    intent_key: row.intent_key,
    locale: row.locale || 'en',
    status: row.status || 'draft',
    priority: row.priority ?? 100,
    confidence_threshold: row.confidence_threshold ?? 86,
    keywords: row.keywords || '',
    positive_examples: row.positive_examples || '',
    negative_examples: row.negative_examples || '',
    required_fields: row.required_fields || '',
    faq_content: row.faq_content || '',
    knowledge_content: row.knowledge_content || '',
    example_answers: row.example_answers || '',
    ai_instruction: row.ai_instruction || '',
    rich_json: row.rich_json || '',
    rich_html: row.rich_html || '',
    image_urls: splitUrls(row.image_urls),
    image_delivery: row.image_delivery || 'after_answer',
    version_label: row.version_label || 'v1',
    score,
    reason,
    created_at: row.created_at ? String(row.created_at) : '',
    updated_at: row.updated_at ? String(row.updated_at) : '',
  };
}
function normalizeAiContentPayload(p = {}) {
  const title = String(p.title || '').trim();
  if (!title) bad('Title is required');
  const status = ['draft','published','archived'].includes(String(p.status || '').toLowerCase()) ? String(p.status).toLowerCase() : 'draft';
  const delivery = ['after_answer','never'].includes(String(p.image_delivery || '').toLowerCase()) ? String(p.image_delivery).toLowerCase() : 'after_answer';
  return {
    title,
    intent_key: String(p.intent_key || slugify(title)).trim(),
    locale: String(p.locale || 'en').trim().toLowerCase().slice(0, 20),
    status,
    priority: Math.max(1, Number(p.priority ?? 100)),
    confidence_threshold: Math.max(70, Math.min(99, Number(p.confidence_threshold ?? 86))),
    keywords: Array.isArray(p.keywords) ? p.keywords.join('\n') : String(p.keywords || ''),
    positive_examples: Array.isArray(p.positive_examples) ? p.positive_examples.join('\n') : String(p.positive_examples || ''),
    negative_examples: Array.isArray(p.negative_examples) ? p.negative_examples.join('\n') : String(p.negative_examples || ''),
    required_fields: Array.isArray(p.required_fields) ? p.required_fields.join('\n') : String(p.required_fields || ''),
    faq_content: String(p.faq_content || ''),
    knowledge_content: String(p.knowledge_content || ''),
    example_answers: String(p.example_answers || ''),
    ai_instruction: String(p.ai_instruction || ''),
    rich_json: typeof p.rich_json === 'string' ? p.rich_json : JSON.stringify(p.rich_json || {}),
    rich_html: String(p.rich_html || ''),
    image_urls: Array.isArray(p.image_urls) ? joinUrls(p.image_urls) : String(p.image_urls || ''),
    image_delivery: delivery,
    version_label: String(p.version_label || 'v1').trim().slice(0, 80),
  };
}

async function getTheme(env) {
  const { rows } = await q(env, 'SELECT * FROM theme_settings ORDER BY id ASC LIMIT 1');
  const row = rows[0] || {};
  return {
    id: row.id || 1,
    app_name: row.app_name || appName(env),
    logo_text: row.logo_text || 'BDG',
    banner_title: row.banner_title || 'BDG Mobile Help Center',
    banner_subtitle: row.banner_subtitle || 'Search FAQ and view official guide images.',
    support_link: row.support_link || env.SUPPORT_LINK || DEFAULT_SUPPORT,
    primary_color: row.primary_color || '#f7c948',
    favicon_url: row.favicon_url || '',
    chat_icon_url: row.chat_icon_url || '',
    guide_logo_url: row.guide_logo_url || '',
    chat_header_title: row.chat_header_title || 'BDG AI Support',
    chat_online_text: row.chat_online_text || 'Online assistant',
    show_chat_support_button: row.show_chat_support_button === true,
    show_guide_support_button: row.show_guide_support_button === true,
    chat_welcome_title: row.chat_welcome_title || 'Welcome to BDG AI Support',
    chat_welcome_subtitle: row.chat_welcome_subtitle || 'Please describe your issue and we will guide you step by step.',
    chat_input_placeholder: row.chat_input_placeholder || 'Type your message...',
    updated_at: row.updated_at ? String(row.updated_at) : ''
  };
}
async function updateTheme(env, p = {}) {
  const current = await getTheme(env);
  const values = [
    p.app_name ?? current.app_name,
    p.logo_text ?? current.logo_text,
    p.banner_title ?? current.banner_title,
    p.banner_subtitle ?? current.banner_subtitle,
    p.support_link ?? current.support_link,
    p.primary_color ?? current.primary_color,
    p.favicon_url ?? p.favicon ?? current.favicon_url,
    p.chat_icon_url ?? current.chat_icon_url,
    p.guide_logo_url ?? current.guide_logo_url,
    p.chat_header_title ?? current.chat_header_title,
    p.chat_online_text ?? current.chat_online_text,
    p.show_chat_support_button ?? current.show_chat_support_button,
    p.show_guide_support_button ?? current.show_guide_support_button,
    p.chat_welcome_title ?? current.chat_welcome_title,
    p.chat_welcome_subtitle ?? current.chat_welcome_subtitle,
    p.chat_input_placeholder ?? current.chat_input_placeholder
  ];
  const { rows } = await q(env, `UPDATE theme_settings SET app_name=$1, logo_text=$2, banner_title=$3, banner_subtitle=$4, support_link=$5, primary_color=$6, favicon_url=$7, chat_icon_url=$8, guide_logo_url=$9, chat_header_title=$10, chat_online_text=$11, show_chat_support_button=$12, show_guide_support_button=$13, chat_welcome_title=$14, chat_welcome_subtitle=$15, chat_input_placeholder=$16, updated_at=NOW() WHERE id=(SELECT id FROM theme_settings ORDER BY id ASC LIMIT 1) RETURNING *`, values);
  if (!rows[0]) {
    await q(env, `INSERT INTO theme_settings(app_name,logo_text,banner_title,banner_subtitle,support_link,primary_color,favicon_url,chat_icon_url,guide_logo_url,chat_header_title,chat_online_text,show_chat_support_button,show_guide_support_button,chat_welcome_title,chat_welcome_subtitle,chat_input_placeholder) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, values);
  }
  await audit(env,'update','theme_settings','1','Theme settings updated');
  return getTheme(env);
}
async function listCategories(env) { const { rows } = await q(env, 'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'); return rows.map(categoryOut); }
async function listGuides(env, params = new URLSearchParams()) { let sql = `SELECT g.*, c.name AS category_name, c.icon AS category_icon, c.slug AS category_slug FROM guides g LEFT JOIN categories c ON c.id=g.category_id WHERE g.status='published'`; const vals = []; const category = params.get?.('category'); const lang = params.get?.('language') || params.get?.('lang') || 'en'; if (category) { vals.push(category); sql += ` AND c.slug=$${vals.length}`; } sql += ' ORDER BY g.priority ASC, g.updated_at DESC, g.id DESC'; const { rows } = await q(env, sql, vals); let guides = rows; const query = params.get?.('q'); if (query) guides = guides.map(g => [scoreMatch(query, [g.title, g.title_hi || '', g.summary || '', g.summary_hi || '', g.body, g.body_hi || ''], g.keywords), g]).filter(x => x[0] > 0).sort((a,b) => b[0]-a[0] || (a[1].priority||100)-(b[1].priority||100)).map(x => x[1]); return guides.map(g => guideOut(g, lang)); }
async function listAdminGuides(env) { const { rows } = await q(env, `SELECT g.*, c.name AS category_name, c.icon AS category_icon, c.slug AS category_slug FROM guides g LEFT JOIN categories c ON c.id=g.category_id ORDER BY g.priority ASC, g.updated_at DESC, g.id DESC`); return rows.map(g => guideOut(g, 'en')); }
async function getGuide(env, slug, lang='en') { const { rows } = await q(env, `SELECT g.*, c.name AS category_name, c.icon AS category_icon, c.slug AS category_slug FROM guides g LEFT JOIN categories c ON c.id=g.category_id WHERE (g.slug=$1 OR CAST(g.id AS TEXT)=$1) AND g.status='published' LIMIT 1`, [slug]); if (!rows[0]) bad('Guide not found', 404); return guideOut(rows[0], lang); }
async function listFaqs(env, admin = false) { const { rows } = await q(env, `SELECT * FROM faqs ${admin ? '' : "WHERE status='published'"} ORDER BY priority ASC, id DESC`); return rows.map(faqOut); }
async function listKnowledge(env) { const { rows } = await q(env, 'SELECT * FROM knowledge_items ORDER BY priority ASC, id DESC'); return rows.map(knowledgeOut); }
async function listPrompts(env) { const { rows } = await q(env, 'SELECT * FROM ai_prompt_sections ORDER BY priority ASC, id ASC'); return rows.map(promptOut); }
async function getAiSettings(env) { const { rows } = await q(env, 'SELECT * FROM ai_model_settings ORDER BY id ASC LIMIT 1'); return rows[0]; }
async function getAiSettingsOut(env) { return aiSettingOut(await getAiSettings(env), env); }
async function listContentBlocks(env) { const { rows } = await q(env, 'SELECT * FROM site_content_blocks ORDER BY sort_order ASC, id ASC'); return rows.map(blockOut); }
async function listPopularHelp(env, admin = false) { const { rows } = await q(env, `SELECT * FROM popular_help_cards ${admin ? '' : "WHERE status='active'"} ORDER BY sort_order ASC, id ASC`); return rows.map(cardOut); }
async function listNavigation(env, admin = false) { const { rows } = await q(env, `SELECT * FROM navigation_items ${admin ? '' : "WHERE status='active'"} ORDER BY sort_order ASC, id ASC`); return rows.map(navOut); }
async function listHomeSections(env, admin = false) { const { rows } = await q(env, `SELECT * FROM guide_home_sections ${admin ? '' : 'WHERE enabled=TRUE'} ORDER BY sort_order ASC, id ASC`); return rows.map(sectionOut); }
async function listQuickReplies(env, admin = false) { const { rows } = await q(env, `SELECT * FROM chat_quick_replies ${admin ? '' : "WHERE status='active'"} ORDER BY sort_order ASC, id ASC`); return rows.map(quickReplyOut); }
async function listAiContent(env, admin = false) {
  const { rows } = await q(env, `SELECT * FROM ai_content_items WHERE deleted_at IS NULL ${admin ? '' : "AND status='published'"} ORDER BY priority ASC, updated_at DESC, id DESC`);
  return rows.map(row => aiContentOut(row));
}
async function createAiContent(env, p) {
  const item = normalizeAiContentPayload(p);
  const { rows } = await q(env, `INSERT INTO ai_content_items(title,intent_key,locale,status,priority,confidence_threshold,keywords,positive_examples,negative_examples,required_fields,faq_content,knowledge_content,example_answers,ai_instruction,rich_json,rich_html,image_urls,image_delivery,version_label) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`, [item.title,item.intent_key,item.locale,item.status,item.priority,item.confidence_threshold,item.keywords,item.positive_examples,item.negative_examples,item.required_fields,item.faq_content,item.knowledge_content,item.example_answers,item.ai_instruction,item.rich_json,item.rich_html,item.image_urls,item.image_delivery,item.version_label]);
  await audit(env, 'create', 'ai_content_items', rows[0].id, `AI Content created: ${item.title}`);
  return aiContentOut(rows[0]);
}
async function updateAiContent(env, id, p) {
  const item = normalizeAiContentPayload(p);
  const { rows } = await q(env, `UPDATE ai_content_items SET title=$1,intent_key=$2,locale=$3,status=$4,priority=$5,confidence_threshold=$6,keywords=$7,positive_examples=$8,negative_examples=$9,required_fields=$10,faq_content=$11,knowledge_content=$12,example_answers=$13,ai_instruction=$14,rich_json=$15,rich_html=$16,image_urls=$17,image_delivery=$18,version_label=$19,updated_at=NOW() WHERE id=$20 AND deleted_at IS NULL RETURNING *`, [item.title,item.intent_key,item.locale,item.status,item.priority,item.confidence_threshold,item.keywords,item.positive_examples,item.negative_examples,item.required_fields,item.faq_content,item.knowledge_content,item.example_answers,item.ai_instruction,item.rich_json,item.rich_html,item.image_urls,item.image_delivery,item.version_label,id]);
  if (!rows[0]) bad('AI Content item not found', 404);
  await audit(env, 'update', 'ai_content_items', id, `AI Content updated: ${item.title}`);
  return aiContentOut(rows[0]);
}
async function deleteAiContent(env, id) {
  const { rows } = await q(env, `UPDATE ai_content_items SET status='archived',deleted_at=NOW(),updated_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id,title`, [id]);
  if (!rows[0]) bad('AI Content item not found', 404);
  await audit(env, 'delete', 'ai_content_items', id, `AI Content deleted: ${rows[0].title}`);
  return { ok: true, id };
}
async function testAiContent(env, p = {}) {
  const message = String(p.message || '').trim();
  if (!message) bad('Message is required');
  const result = await findAiContentMatch(env, message, p.language || p.lang || 'en');
  return {
    ok: true,
    engine: 'prompt-first-single-content-router',
    greeting_bypass: isGreetingOnly(message),
    selected_content: result.selected ? aiContentOut(result.selected.row, result.selected.score, result.selected.reason) : null,
    second_best: result.second ? aiContentOut(result.second.row, result.second.score, result.second.reason) : null,
    confidence_gap: result.gap,
    candidates: result.candidates.slice(0, 5).map(item => aiContentOut(item.row, item.score, item.reason)),
  };
}
async function getGuideContent(env) { const settings = await getTheme(env); const blocks = await listContentBlocks(env); const content = Object.fromEntries(blocks.map(b => [b.block_key, b.value])); const content_version = blocks.map((b) => b.updated_at || '').sort().at(-1) || settings.updated_at || ''; return { settings, content, blocks, content_version, cache_policy: 'live-no-store', popular_help: [], navigation: await listNavigation(env, false), home_sections: (await listHomeSections(env, false)).map(s => s.section_key === 'popular' ? { ...s, enabled: false } : s), quick_replies: await listQuickReplies(env, false), public_languages: [{code:'en',label:'English'}, {code:'hi',label:'Hindi'}], admin_languages: [{code:'en',label:'English'}, {code:'zh',label:'中文'}] }; }
async function getChatContent(env) { const theme = await getTheme(env); const quick_replies = await listQuickReplies(env, false); return { settings: theme, branding: { chat_icon_url: theme.chat_icon_url || '', title: theme.chat_header_title || 'BDG AI Support', online: theme.chat_online_text || 'Online assistant' }, languages: [{ code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }], quick_replies, support_enabled: theme.show_chat_support_button === true, texts: { en: { title: theme.chat_header_title || 'BDG AI Support', online: theme.chat_online_text || 'Online assistant', welcome: theme.chat_welcome_subtitle || 'Please describe your issue and we will guide you step by step.', welcome_title: theme.chat_welcome_title || 'Welcome to BDG AI Support', placeholder: theme.chat_input_placeholder || 'Type your message...', busy: 'Please wait for the current reply...' }, hi: { title: theme.chat_header_title || 'BDG AI Support', online: 'ऑनलाइन सहायक', welcome: theme.chat_welcome_subtitle || 'कृपया अपनी समस्या बताएं। हम आपको चरण-दर-चरण मार्गदर्शन देंगे।', welcome_title: theme.chat_welcome_title || 'BDG AI Support में आपका स्वागत है', placeholder: theme.chat_input_placeholder || 'अपना संदेश लिखें...', busy: 'कृपया वर्तमान उत्तर की प्रतीक्षा करें...' } } }; }
async function getAdminSiteContent(env) { return { settings: await getTheme(env), blocks: await listContentBlocks(env), popular_help: [], navigation: await listNavigation(env, true), home_sections: await listHomeSections(env, true), chat_quick_replies: await listQuickReplies(env, true) }; }
async function updateContentBlock(env, key, p) { const { rows } = await q(env, `UPDATE site_content_blocks SET label=$2, value=$3, input_type=$4, sort_order=$5, updated_at=NOW() WHERE block_key=$1 RETURNING *`, [key, p.label || key, p.value || '', p.input_type || 'text', p.sort_order ?? 100]); if (!rows[0]) { const ins = await q(env, `INSERT INTO site_content_blocks(block_key,label,value,input_type,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *`, [key, p.label || key, p.value || '', p.input_type || 'text', p.sort_order ?? 100]); await audit(env,'create','site_content_blocks',key,'Content block created'); return blockOut(ins.rows[0]); } await audit(env,'update','site_content_blocks',key,'Content block updated'); return blockOut(rows[0]); }
async function updateSiteContentBulk(env, p) { if (Array.isArray(p.blocks)) for (const b of p.blocks) await updateContentBlock(env, b.block_key, b); if (p.settings) await updateTheme(env, p.settings); return getAdminSiteContent(env); }
async function createPopularHelp(env,p){const {rows}=await q(env,`INSERT INTO popular_help_cards(title,subtitle,icon,query,linked_category_slug,sort_order,status) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[p.title,p.subtitle||'',p.icon||'✨',p.query||'',p.linked_category_slug||'',p.sort_order??100,p.status||'active']); await audit(env,'create','popular_help_cards',rows[0].id,'Popular help card created'); return cardOut(rows[0]);}
async function updatePopularHelp(env,id,p){const {rows}=await q(env,`UPDATE popular_help_cards SET title=$1,subtitle=$2,icon=$3,query=$4,linked_category_slug=$5,sort_order=$6,status=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,[p.title,p.subtitle||'',p.icon||'✨',p.query||'',p.linked_category_slug||'',p.sort_order??100,p.status||'active',id]); if(!rows[0]) bad('Popular help card not found',404); await audit(env,'update','popular_help_cards',id,'Popular help card updated'); return cardOut(rows[0]);}
async function createNavigation(env,p){const {rows}=await q(env,`INSERT INTO navigation_items(nav_key,label,icon,href,sort_order,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[p.nav_key||slugify(p.label),p.label,p.icon||'•',p.href||'#',p.sort_order??100,p.status||'active']); await audit(env,'create','navigation_items',rows[0].id,'Navigation item created'); return navOut(rows[0]);}
async function updateNavigation(env,id,p){const {rows}=await q(env,`UPDATE navigation_items SET nav_key=$1,label=$2,icon=$3,href=$4,sort_order=$5,status=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,[p.nav_key||slugify(p.label),p.label,p.icon||'•',p.href||'#',p.sort_order??100,p.status||'active',id]); if(!rows[0]) bad('Navigation item not found',404); await audit(env,'update','navigation_items',id,'Navigation item updated'); return navOut(rows[0]);}
async function updateHomeSection(env,key,p){const {rows}=await q(env,`UPDATE guide_home_sections SET title=$2,enabled=$3,sort_order=$4,updated_at=NOW() WHERE section_key=$1 RETURNING *`,[key,p.title||key,!!p.enabled,p.sort_order??100]); if(!rows[0]) bad('Home section not found',404); await audit(env,'update','guide_home_sections',key,'Home section updated'); return sectionOut(rows[0]);}
async function createQuickReply(env,p){const {rows}=await q(env,`INSERT INTO chat_quick_replies(text,query,sort_order,status) VALUES($1,$2,$3,$4) RETURNING *`,[p.text,p.query||p.text,p.sort_order??100,p.status||'active']); await audit(env,'create','chat_quick_replies',rows[0].id,'Chat quick reply created'); return quickReplyOut(rows[0]);}
async function updateQuickReply(env,id,p){const {rows}=await q(env,`UPDATE chat_quick_replies SET text=$1,query=$2,sort_order=$3,status=$4,updated_at=NOW() WHERE id=$5 RETURNING *`,[p.text,p.query||p.text,p.sort_order??100,p.status||'active',id]); if(!rows[0]) bad('Quick reply not found',404); await audit(env,'update','chat_quick_replies',id,'Chat quick reply updated'); return quickReplyOut(rows[0]);}
async function listIncorrectMatchReports(env) { const { rows } = await q(env, `SELECT * FROM incorrect_match_reports ORDER BY id DESC LIMIT 300`); return rows; }
async function createIncorrectMatchReport(env, p = {}) { const { rows } = await q(env, `INSERT INTO incorrect_match_reports(session_id,message,detected_intent,expected_intent,reason,status) VALUES($1,$2,$3,$4,$5,'open') RETURNING *`, [p.session_id || '', p.message || '', p.detected_intent || '', p.expected_intent || '', p.reason || '']); await audit(env,'create','incorrect_match_reports',rows[0].id,'Incorrect match report created'); return rows[0]; }
async function listKnowledgeVersions(env) { const { rows } = await q(env, `SELECT * FROM knowledge_versions ORDER BY id DESC LIMIT 300`); return rows; }
async function createCategory(env, p) { const slug = p.slug || slugify(p.name); const { rows } = await q(env, 'INSERT INTO categories(name,slug,description,icon,icon_url,sort_order) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [p.name, slug, p.description || null, p.icon || 'target', p.icon_url || '', p.sort_order ?? 100]); await audit(env,'create','categories',rows[0].id,'Category created'); return categoryOut(rows[0]); }
async function updateCategory(env, id, p) { const { rows } = await q(env, 'UPDATE categories SET name=$1, slug=$2, description=$3, icon=$4, icon_url=$5, sort_order=$6 WHERE id=$7 RETURNING *', [p.name, p.slug || slugify(p.name), p.description || null, p.icon || 'target', p.icon_url || '', p.sort_order ?? 100, id]); if (!rows[0]) bad('Category not found', 404); await audit(env,'update','categories',id,'Category updated'); return categoryOut(rows[0]); }
async function resolveGuideCategoryId(env, p) { if (p.category_id) return p.category_id; if (p.category_slug) { const { rows } = await q(env, 'SELECT id FROM categories WHERE slug=$1 LIMIT 1', [p.category_slug]); return rows[0]?.id || null; } return null; }
async function createGuide(env, p) { const categoryId = await resolveGuideCategoryId(env, p); const gp = normalizeGuidePayload(p); const { rows } = await q(env, 'INSERT INTO guides(title,slug,summary,body,image_urls,keywords,language,priority,status,category_id,title_hi,summary_hi,body_hi,body_html,body_blocks_json,cover_image_url,body_html_hi,body_blocks_json_hi,image_urls_hi,cover_image_url_hi) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *', [gp.title, gp.slug, gp.summary, gp.body, gp.image_urls, gp.keywords, gp.language, gp.priority, gp.status, categoryId, gp.title_hi, gp.summary_hi, gp.body_hi, gp.body_html, gp.body_blocks_json, gp.cover_image_url, gp.body_html_hi, gp.body_blocks_json_hi, gp.image_urls_hi, gp.cover_image_url_hi]); await audit(env,'create','guides',rows[0].id,'Guide created'); return guideOut(rows[0], gp.language); }
async function updateGuide(env, id, p) { const categoryId = await resolveGuideCategoryId(env, p); const gp = normalizeGuidePayload(p); const { rows } = await q(env, 'UPDATE guides SET title=$1, slug=$2, summary=$3, body=$4, image_urls=$5, keywords=$6, language=$7, priority=$8, status=$9, category_id=$10, title_hi=$11, summary_hi=$12, body_hi=$13, body_html=$14, body_blocks_json=$15, cover_image_url=$16, body_html_hi=$17, body_blocks_json_hi=$18, image_urls_hi=$19, cover_image_url_hi=$20, updated_at=NOW() WHERE id=$21 RETURNING *', [gp.title, gp.slug, gp.summary, gp.body, gp.image_urls, gp.keywords, gp.language, gp.priority, gp.status, categoryId, gp.title_hi, gp.summary_hi, gp.body_hi, gp.body_html, gp.body_blocks_json, gp.cover_image_url, gp.body_html_hi, gp.body_blocks_json_hi, gp.image_urls_hi, gp.cover_image_url_hi, id]); if (!rows[0]) bad('Guide not found', 404); await audit(env,'update','guides',id,'Guide updated'); return guideOut(rows[0], gp.language); }
async function createFaq(env, p) { const { rows } = await q(env, 'INSERT INTO faqs(question,answer,keywords,priority,status) VALUES($1,$2,$3,$4,$5) RETURNING *', [p.question, p.answer, p.keywords || '', p.priority ?? 100, p.status || 'published']); await audit(env,'create','faqs',rows[0].id,'FAQ created'); return faqOut(rows[0]); }
async function updateFaq(env, id, p) { const { rows } = await q(env, 'UPDATE faqs SET question=$1, answer=$2, keywords=$3, priority=$4, status=$5 WHERE id=$6 RETURNING *', [p.question, p.answer, p.keywords || '', p.priority ?? 100, p.status || 'published', id]); if (!rows[0]) bad('FAQ not found', 404); await audit(env,'update','faqs',id,'FAQ updated'); return faqOut(rows[0]); }
async function createKnowledge(env, p) { const { rows } = await q(env, 'INSERT INTO knowledge_items(title,content,keywords,priority,status) VALUES($1,$2,$3,$4,$5) RETURNING *', [p.title, p.content, p.keywords || '', p.priority ?? 100, p.status || 'active']); await audit(env,'create','knowledge_items',rows[0].id,'Knowledge created'); return knowledgeOut(rows[0]); }
async function updateKnowledge(env, id, p) { const { rows } = await q(env, 'UPDATE knowledge_items SET title=$1, content=$2, keywords=$3, priority=$4, status=$5 WHERE id=$6 RETURNING *', [p.title, p.content, p.keywords || '', p.priority ?? 100, p.status || 'active', id]); if (!rows[0]) bad('Knowledge item not found', 404); await audit(env,'update','knowledge_items',id,'Knowledge updated'); return knowledgeOut(rows[0]); }
async function snapshotPrompt(env, row, note='updated') { if (!row) return; await q(env, `INSERT INTO ai_prompt_versions(prompt_id,section_key,title,content,enabled,priority,change_note) VALUES($1,$2,$3,$4,$5,$6,$7)`, [row.id,row.section_key,row.title,row.content||'',!!row.enabled,row.priority??100,note]); }
async function upsertPrompt(env, p) { const { rows } = await q(env, `INSERT INTO ai_prompt_sections(section_key,title,content,enabled,priority) VALUES($1,$2,$3,$4,$5) ON CONFLICT(section_key) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content, enabled=EXCLUDED.enabled, priority=EXCLUDED.priority, updated_at=NOW() RETURNING *`, [p.section_key, p.title, p.content || '', !!p.enabled, p.priority ?? 100]); await snapshotPrompt(env, rows[0], 'saved'); await audit(env,'upsert','ai_prompt_sections',rows[0].id,'Prompt section saved'); return promptOut(rows[0]); }
async function updatePrompt(env, id, p) { const { rows } = await q(env, 'UPDATE ai_prompt_sections SET section_key=$1,title=$2,content=$3,enabled=$4,priority=$5,updated_at=NOW() WHERE id=$6 RETURNING *', [p.section_key, p.title, p.content || '', !!p.enabled, p.priority ?? 100, id]); if (!rows[0]) bad('AI prompt section not found', 404); await snapshotPrompt(env, rows[0], 'updated'); await audit(env,'update','ai_prompt_sections',id,'Prompt section updated'); return promptOut(rows[0]); }
async function deletePrompt(env, id) { const { rows } = await q(env, 'DELETE FROM ai_prompt_sections WHERE id=$1 RETURNING id,title,section_key', [id]); if (!rows[0]) bad('AI prompt section not found', 404); await audit(env,'delete','ai_prompt_sections',id,`Prompt section deleted: ${rows[0].title}`); return { ok: true, id, section_key: rows[0].section_key }; }
async function listPromptVersions(env, promptId=null){ const {rows}= promptId ? await q(env,'SELECT * FROM ai_prompt_versions WHERE prompt_id=$1 ORDER BY id DESC LIMIT 100',[promptId]) : await q(env,'SELECT * FROM ai_prompt_versions ORDER BY id DESC LIMIT 100'); return rows.map(v=>({id:v.id,prompt_id:v.prompt_id,section_key:v.section_key,title:v.title,content:v.content||'',enabled:!!v.enabled,priority:v.priority??100,change_note:v.change_note,created_at:String(v.created_at)}));}
async function restorePromptVersion(env,promptId,versionId){ const {rows}=await q(env,'SELECT * FROM ai_prompt_versions WHERE id=$1 AND prompt_id=$2 LIMIT 1',[versionId,promptId]); if(!rows[0]) bad('Prompt version not found',404); const v=rows[0]; const upd=await q(env,'UPDATE ai_prompt_sections SET section_key=$1,title=$2,content=$3,enabled=$4,priority=$5,updated_at=NOW() WHERE id=$6 RETURNING *',[v.section_key,v.title,v.content||'',!!v.enabled,v.priority??100,promptId]); await snapshotPrompt(env, upd.rows[0], `restored from version ${versionId}`); await audit(env,'restore','ai_prompt_sections',promptId,`Prompt restored from version ${versionId}`); return promptOut(upd.rows[0]);}
async function updateAiSettings(env, p) { const { rows } = await q(env, `UPDATE ai_model_settings SET provider=$1, model=$2, api_base=$3, enabled=$4, temperature=$5, max_tokens=$6, require_approved_context=$7, memory_enabled=$8, memory_max_messages=$9, memory_ttl_days=$10, updated_at=NOW() WHERE id=(SELECT id FROM ai_model_settings ORDER BY id ASC LIMIT 1) RETURNING *`, [p.provider || 'deepseek', p.model || 'deepseek-chat', p.api_base || 'https://api.deepseek.com', !!p.enabled, Number(p.temperature ?? 0.2), Number(p.max_tokens ?? 700), !!p.require_approved_context, !!p.memory_enabled, Number(p.memory_max_messages ?? 12), Number(p.memory_ttl_days ?? 30)]); await audit(env,'update','ai_model_settings','1','AI settings updated'); return aiSettingOut(rows[0], env); }

function parseBlocks(value) { try { const v = JSON.parse(value || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
function safeResponseUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('/') || /^https?:\/\//i.test(url)) return url.slice(0, 1200);
  return '';
}
function responseText(value, max = 2000) {
  return cleanAssistantText(String(value || '')).slice(0, max);
}
export function normalizeResponseBlocks(value) {
  let source = value;
  if (typeof value === 'string') {
    try { source = JSON.parse(value || '[]'); }
    catch { source = []; }
  }
  if (!Array.isArray(source)) return [];
  const blocks = [];
  for (const raw of source.slice(0, 16)) {
    if (!raw || typeof raw !== 'object') continue;
    const type = String(raw.type || 'paragraph').toLowerCase().replace(/[^a-z_-]/g, '');
    const text = responseText(raw.text || raw.content || raw.title || raw.label);
    if (type === 'divider') {
      blocks.push({ type: 'divider' });
      continue;
    }
    if (type === 'heading' && text) {
      blocks.push({ type: 'heading', text, level: Number(raw.level) === 3 ? 3 : 2 });
      continue;
    }
    if (type === 'steps' || type === 'step' || type === 'list') {
      const items = (Array.isArray(raw.items) ? raw.items : [raw.text || raw.content])
        .map((item) => responseText(typeof item === 'object' ? item?.text || item?.title : item, 500))
        .filter(Boolean)
        .slice(0, 10);
      if (items.length) blocks.push({ type: 'steps', title: responseText(raw.title, 160), items });
      continue;
    }
    if (['warning','error','success','notice','info'].includes(type) && text) {
      blocks.push({ type: type === 'info' ? 'notice' : type, text });
      continue;
    }
    if (type === 'button' || type === 'link') {
      const url = safeResponseUrl(raw.url || raw.href);
      const label = responseText(raw.label || raw.text || raw.title, 160);
      if (url && label) blocks.push({ type: 'link', label, url });
      continue;
    }
    if (text) blocks.push({ type: 'paragraph', text });
  }
  return blocks.slice(0, 12);
}
export function responseBlocksFromText(value) {
  const text = cleanAssistantText(value);
  if (!text) return [];
  const blocks = [];
  for (const section of text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    const lines = section.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const numbered = lines.map((line) => line.match(/^\d+[.)]\s+(.+)$/)).filter(Boolean);
    const bullets = lines.map((line) => line.match(/^[•*-]\s+(.+)$/)).filter(Boolean);
    if (numbered.length === lines.length || bullets.length === lines.length) {
      const matches = numbered.length ? numbered : bullets;
      blocks.push({ type: 'steps', title: '', items: matches.map((match) => responseText(match[1], 500)).slice(0, 10) });
      continue;
    }
    const clean = responseText(section);
    if (/^(important|warning|caution)\s*[:：]/i.test(clean)) blocks.push({ type: 'warning', text: clean.replace(/^[^:：]+[:：]\s*/, '') });
    else if (/^(note|please note)\s*[:：]/i.test(clean)) blocks.push({ type: 'notice', text: clean.replace(/^[^:：]+[:：]\s*/, '') });
    else blocks.push({ type: 'paragraph', text: clean });
  }
  return normalizeResponseBlocks(blocks);
}
function finalizeChatResponse(payload = {}) {
  const preferred = payload.response_blocks
    || [];
  const approved = normalizeResponseBlocks(preferred);
  return {
    ...payload,
    response_format: 'structured-v1',
    response_blocks: approved.length ? approved : responseBlocksFromText(payload.reply || ''),
    resolution_state: payload.resolution_state || 'open',
  };
}
function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') return '';
    if (b.type === 'heading') return b.text || '';
    if (b.type === 'paragraph') return b.text || '';
    if (b.type === 'step') return `${b.title || ''}
${b.text || ''}`.trim();
    if (b.type === 'note' || b.type === 'warning') return b.text || '';
    if (b.type === 'image') return b.caption || b.alt || b.url || '';
    if (b.type === 'button') return `${b.label || ''} ${b.url || ''}`.trim();
    return '';
  }).filter(Boolean).join('\n\n');
}
function normalizeGuidePayload(p) {
  const blocksEn = Array.isArray(p.blocks_en) ? p.blocks_en : (Array.isArray(p.blocks) ? p.blocks : parseBlocks(p.body_blocks_json || p.blocks_json));
  const blocksHi = Array.isArray(p.blocks_hi) ? p.blocks_hi : parseBlocks(p.body_blocks_json_hi || p.blocks_json_hi);
  const bodyFromBlocksEn = blocksToText(blocksEn);
  const bodyFromBlocksHi = blocksToText(blocksHi);
  const imageUrlsEn = Array.isArray(p.image_urls_en) ? p.image_urls_en : (Array.isArray(p.image_urls) ? p.image_urls : splitUrls(p.image_urls || p.images || p.image_url || p.cover || p.cover_image_url));
  const imageUrlsHi = Array.isArray(p.image_urls_hi) ? p.image_urls_hi : splitUrls(p.image_urls_hi || p.images_hi || p.cover_image_url_hi || p.cover_hi);
  const coverEn = p.cover_image_url || p.cover || imageUrlsEn[0] || '';
  const coverHi = p.cover_image_url_hi || p.cover_hi || imageUrlsHi[0] || '';
  return {
    title: p.title || p.title_en || 'Untitled guide',
    slug: p.slug || slugify(p.title || p.title_en || 'guide'),
    summary: p.summary || p.summary_en || '',
    body: p.body || p.body_en || p.body_html || bodyFromBlocksEn || '',
    image_urls: joinUrls(imageUrlsEn),
    image_urls_hi: joinUrls(imageUrlsHi),
    keywords: Array.isArray(p.keywords) ? p.keywords.join(', ') : (p.keywords || ''),
    language: p.language || 'en',
    priority: Number(p.priority ?? p.sort_order ?? 100),
    status: p.status || 'published',
    title_hi: p.title_hi || '',
    summary_hi: p.summary_hi || '',
    body_hi: p.body_hi || bodyFromBlocksHi || '',
    body_html: p.body_html || p.rich_text_html || '',
    body_html_hi: p.body_html_hi || p.rich_text_html_hi || '',
    body_blocks_json: blocksEn.length ? JSON.stringify(blocksEn) : (p.body_blocks_json || ''),
    body_blocks_json_hi: blocksHi.length ? JSON.stringify(blocksHi) : (p.body_blocks_json_hi || ''),
    cover_image_url: coverEn,
    cover_image_url_hi: coverHi,
  };
}

async function deleteById(env, table, id) { const res = await q(env, `DELETE FROM ${table} WHERE id=$1`, [id]); await audit(env,'delete',table,id,`Deleted ${res.rowCount || 0} item(s)`); return { ok: true, deleted: res.rowCount || 0 }; }
async function batchDeleteByIds(env, table, ids = []) {
  const clean = (Array.isArray(ids) ? ids : []).map((x) => Number(x)).filter((x) => Number.isFinite(x) && x > 0);
  if (!clean.length) return { ok: true, deleted: 0 };
  const placeholders = clean.map((_, i) => `$${i+1}`).join(',');
  const res = await q(env, `DELETE FROM ${table} WHERE id IN (${placeholders})`, clean);
  await audit(env,'batch_delete',table,clean.join(','),`Batch deleted ${clean.length} item(s)`);
  return { ok: true, deleted: clean.length };
}
async function deleteAllRows(env, table) {
  const before = Number((await q(env, `SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0]?.count || 0);
  await q(env, `DELETE FROM ${table}`);
  await audit(env,'delete_all',table,'all',`Deleted all ${before} row(s)`);
  return { ok: true, deleted: before };
}
async function cleanupDuplicateQuickReplies(env) {
  const { rows } = await q(env, `WITH ranked AS (SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(trim(coalesce(text,''))), lower(trim(coalesce(query,''))) ORDER BY id ASC) rn FROM chat_quick_replies) DELETE FROM chat_quick_replies q USING ranked r WHERE q.id=r.id AND r.rn > 1 RETURNING q.id`);
  await audit(env,'cleanup_duplicates','chat_quick_replies','duplicates',`Removed ${rows.length} duplicate quick replies`);
  return { ok: true, deleted: rows.length };
}

async function audit(env, action, type, id, details='') { try { await q(env, `INSERT INTO admin_audit_logs(actor_email,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5)`, ['admin', action, type, String(id ?? ''), details]); } catch (_) {} }
async function listAuditLogs(env){ const {rows}=await q(env,'SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 150'); return rows.map(r=>({id:r.id,actor_email:r.actor_email,action:r.action,entity_type:r.entity_type,entity_id:r.entity_id,details:r.details,created_at:String(r.created_at)})); }


async function readJson(request) {
  const raw = await request.text();
  if (!raw || !raw.trim()) return {};
  const text = raw.trim();
  try { return JSON.parse(text); } catch (jsonErr) {
    // Accept form bodies and malformed PowerShell/curl bodies with email/password fields.
    try {
      const params = new URLSearchParams(text);
      if ([...params.keys()].length) return Object.fromEntries(params.entries());
    } catch (_) {}
    const repaired = {};
    const email = text.match(/(?:^|[,{\s])email\s*[:=]\s*["']?([^,"'}\s]+)["']?/i);
    const password = text.match(/(?:^|[,{\s])password\s*[:=]\s*["']?([^,"'}]+?)["']?\s*(?:[,}]|$)/i);
    if (email) repaired.email = email[1];
    if (password) repaired.password = password[1].trim();
    if (Object.keys(repaired).length) return repaired;
    const err = new Error(`Invalid JSON body: ${jsonErr.message}`);
    err.status = 400;
    throw err;
  }
}


function adminUserOut(row) { return { id: row.id, name: row.name || row.email?.split('@')[0] || 'Admin', email: row.email, role: row.role || 'admin', status: row.is_active === false ? 'inactive' : 'active', is_active: row.is_active !== false, twofa_enabled: row.twofa_enabled === true, session_version: Number(row.session_version || 0), lastLogin: row.last_login_at ? String(row.last_login_at) : '', created_at: row.created_at ? String(row.created_at) : '', updated_at: row.updated_at ? String(row.updated_at) : '' }; }

// v0.6.2c: PBKDF2 100k caused runtime instability in Cloudflare Workers for some accounts.
// New/changed admin passwords now use a fast salted SHA-256 format. Old PBKDF2 hashes are verified only
// when the iteration count is low enough to be Worker-safe; default owner recovery upgrades to this format.
async function hashPassword(password) {
  const value = String(password || '');
  if (value.length < 12) bad('Password must be at least 12 characters', 400);
  const salt = randomBytes(16);
  const derived = await scryptAsync(value, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}
function hasUnsupportedPasswordHash(hash) {
  const parts = String(hash || '').split('$');
  return parts[0] === 'pbkdf2_sha256' && Number(parts[1] || 0) > PBKDF2_ITERATIONS;
}

async function ensureAdminAuthReady(env) {
  // Minimal auth bootstrap used by /auth/login. This avoids full CMS seed failures blocking admin login.
  await q(env, `CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY,email VARCHAR(255) UNIQUE,password_hash VARCHAR(255),role VARCHAR(50) DEFAULT 'owner',is_active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW())`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name VARCHAR(160) DEFAULT 'Owner'`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'owner'`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS twofa_enabled BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS twofa_secret TEXT`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 0`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
  await q(env, `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`);
  await q(env, `CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_lower_email ON admin_users (lower(email)) WHERE email IS NOT NULL`);
  await q(env, `CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY,actor_email VARCHAR(255),action VARCHAR(120) NOT NULL,entity_type VARCHAR(120),entity_id VARCHAR(120),details TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`);
  await q(env, `CREATE TABLE IF NOT EXISTS admin_sessions (id SERIAL PRIMARY KEY,admin_email VARCHAR(255),session_version INTEGER DEFAULT 0,user_agent TEXT,ip TEXT,created_at TIMESTAMPTZ DEFAULT NOW(),last_seen_at TIMESTAMPTZ DEFAULT NOW(),revoked_at TIMESTAMPTZ)`);
  await q(env, `CREATE TABLE IF NOT EXISTS system_migrations (migration_key VARCHAR(120) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW(), notes TEXT)`);
  await q(env, `UPDATE admin_users SET name=COALESCE(name, 'Owner'), role=COALESCE(role, 'owner'), is_active=COALESCE(is_active, TRUE), updated_at=COALESCE(updated_at, NOW())`);
}

async function ensureOwnerAdmin(env, forceDefaultPassword = false) {
  const email = String(env.ADMIN_EMAIL || OWNER_EMAIL).trim().toLowerCase();
  const adminPassword = String(env.ADMIN_PASSWORD || '');
  if (!adminPassword) throw new Error('Missing required ADMIN_PASSWORD');
  const passwordHash = await hashPassword(adminPassword);
  await ensureAdminAuthReady(env);

  // v0.6.6: there must be exactly one business owner email by default.
  // Existing owner rows are migrated to the configured ADMIN_EMAIL.
  const existingOwner = (await q(env, "SELECT * FROM admin_users WHERE role='owner' ORDER BY id ASC LIMIT 1")).rows[0];
  if (existingOwner && String(existingOwner.email || '').trim().toLowerCase() !== email) {
    const conflict = (await q(env, 'SELECT * FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [email])).rows[0];
    if (conflict && conflict.id !== existingOwner.id) {
      await q(env, "UPDATE admin_users SET role='admin', updated_at=NOW() WHERE id=$1", [conflict.id]);
    }
    await q(env, `UPDATE admin_users SET name=$1,email=$2,password_hash=$3,role='owner',is_active=TRUE,session_version=COALESCE(session_version,0)+1,updated_at=NOW() WHERE id=$4`, ['Owner', email, passwordHash, existingOwner.id]);
    await audit(env, 'owner_email_migrated', 'admin_users', existingOwner.id, `Owner email migrated to ${email}`);
  }

  const owner = (await q(env, 'SELECT * FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [email])).rows[0];
  if (owner) {
    const needsPasswordRecovery = forceDefaultPassword || String(env.RESET_OWNER_PASSWORD_ON_DEPLOY || '').toLowerCase() === 'true' || !owner.password_hash || hasUnsupportedPasswordHash(owner.password_hash);
    await q(env, `UPDATE admin_users SET name=COALESCE(NULLIF(name,''),'Owner'),role='owner',is_active=TRUE,password_hash=CASE WHEN $1::boolean THEN $2 ELSE password_hash END,session_version=CASE WHEN $1::boolean THEN COALESCE(session_version,0)+1 ELSE COALESCE(session_version,0) END,updated_at=NOW() WHERE id=$3`, [needsPasswordRecovery, passwordHash, owner.id]);
    if (needsPasswordRecovery) await audit(env, 'owner_password_recovery', 'admin_users', owner.id, 'Owner runtime-safe password hash refreshed');
    return;
  }

  await q(env, `INSERT INTO admin_users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,'owner',TRUE)`, ['Owner', email, passwordHash]);
  await audit(env, 'owner_created', 'admin_users', email, `Owner account created for ${email}`);
}
async function listAdminUsers(env) { const { rows } = await q(env, "SELECT * FROM admin_users ORDER BY CASE WHEN role='owner' THEN 0 ELSE 1 END, id ASC"); return rows.map(adminUserOut); }
async function createAdminUser(env, p = {}) { if (!p.email) bad('Email is required'); const password = String(p.password || p.new_password || ''); if (password.length < 12) bad('Password must be at least 12 characters'); const passwordHash = await hashPassword(password); const { rows } = await q(env, `INSERT INTO admin_users(name,email,password_hash,role,is_active) VALUES($1,$2,$3,$4,$5) RETURNING *`, [p.name || p.email.split('@')[0], String(p.email).trim().toLowerCase(), passwordHash, p.role === 'owner' ? 'admin' : (p.role || 'admin'), p.status !== 'inactive' && p.is_active !== false]); await audit(env, 'create_admin', 'admin_users', rows[0].id, `Created admin ${rows[0].email}`); return adminUserOut(rows[0]); }
async function updateAdminUser(env, id, p = {}) { const existing = (await q(env, 'SELECT * FROM admin_users WHERE id=$1', [id])).rows[0]; if (!existing) bad('Admin user not found', 404); const nextRole = existing.role === 'owner' ? 'owner' : (p.role || existing.role || 'admin'); const { rows } = await q(env, `UPDATE admin_users SET name=$1,email=$2,role=$3,is_active=$4,updated_at=NOW() WHERE id=$5 RETURNING *`, [p.name || existing.name || 'Admin', String(p.email || existing.email).trim().toLowerCase(), nextRole, p.status ? p.status !== 'inactive' : p.is_active !== false, id]); await audit(env, 'update_admin', 'admin_users', id, `Updated admin ${rows[0].email}`); return adminUserOut(rows[0]); }
async function changeAdminPassword(env, id, p = {}) { const password = p.password || p.new_password; if (!password || String(password).length < 12) bad('Password must be at least 12 characters'); const passwordHash = await hashPassword(password); await q(env, 'UPDATE admin_users SET password_hash=$1, session_version=COALESCE(session_version,0)+1, updated_at=NOW() WHERE id=$2', [passwordHash, id]); await audit(env, 'change_password', 'admin_users', id, 'Password changed'); return { ok: true }; }
async function deleteAdminUser(env, id) { const row = (await q(env, 'SELECT * FROM admin_users WHERE id=$1', [id])).rows[0]; if (!row) return { ok: true, deleted: 0 }; if (row.role === 'owner') bad('Owner account cannot be deleted', 400); await q(env, 'DELETE FROM admin_users WHERE id=$1', [id]); await audit(env, 'delete_admin', 'admin_users', id, `Deleted admin ${row.email}`); return { ok: true, deleted: 1 }; }


async function login(request, env) {
  const p = await readJson(request);
  const email = String(p.email || '').trim().toLowerCase();
  const password = String(p.password || '');
  if (!email || !password) return json({ detail: 'Email and password are required' }, 400, env);

  const { rows } = await q(env, 'SELECT * FROM admin_users WHERE lower(email)=lower($1) AND is_active=TRUE LIMIT 1', [email]);
  const user = rows[0] || null;
  const ok = !!user?.password_hash && await verifyPassword(password, user.password_hash);
  if (!ok) {
    try { await audit(env, 'login_failed', 'admin_users', email, 'Invalid login attempt'); } catch (_) {}
    return json({ detail: 'Invalid email or password' }, 401, env);
  }
  if (user.twofa_enabled === true && !await verifyTotp(user.twofa_secret, p.twofa_code || p.otp || p.code)) {
    return json({ twofa_required: true, detail: '2FA code required' }, 202, env);
  }
  if (String(user.password_hash || '').startsWith('pbkdf2_sha256$') || String(user.password_hash || '').startsWith('sha256_salted$')) {
    await q(env, 'UPDATE admin_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [await hashPassword(password), user.id]);
  }
  const updated = await q(env, 'UPDATE admin_users SET last_login_at=NOW(), updated_at=NOW(), session_version=COALESCE(session_version,0)+1 WHERE id=$1 RETURNING *', [user.id]);
  const nextUser = updated.rows[0] || user;
  await audit(env, 'login_success', 'admin_users', nextUser.id || nextUser.email, `Admin login ${nextUser.email}`);
  const token = await createToken(env, nextUser.email, nextUser.role || 'admin', Number(nextUser.session_version || 0));
  return json({ access_token: token, token_type: 'bearer', user: adminUserOut(nextUser) }, 200, env);
}
async function requireAdmin(request, env) { const auth = request.headers.get('Authorization') || ''; const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''; if (!token) bad('Missing token', 401); return await readToken(env, token); }
function b64UrlEncode(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); }
function b64UrlDecode(str) { str = str.replace(/-/g, '+').replace(/_/g, '/'); str += '='.repeat((4 - str.length % 4) % 4); return Uint8Array.from(atob(str), c => c.charCodeAt(0)); }
async function hmac(env, data) { if (!env.JWT_SECRET || String(env.JWT_SECRET).length < 32) bad('Server authentication is not configured', 503); const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))); }
async function createToken(env, email, role, sessionVersion = 0) { const payload = { email, role, sv: Number(sessionVersion || 0), exp: Math.floor(Date.now()/1000) + 60*60*12 }; const p = b64UrlEncode(new TextEncoder().encode(JSON.stringify(payload))); const sig = b64UrlEncode(await hmac(env, p)); return `${p}.${sig}`; }
async function readToken(env, token) {
  const [p, sig] = token.split('.');
  if (!p || !sig) bad('Invalid token', 401);
  const expected = b64UrlEncode(await hmac(env, p));
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(sig);
  if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) bad('Invalid token', 401);
  let payload;
  try { payload = JSON.parse(new TextDecoder().decode(b64UrlDecode(p))); } catch { bad('Invalid token', 401); }
  if (!payload?.email || payload.exp < Math.floor(Date.now()/1000)) bad('Expired token', 401);
  const row = (await q(env, 'SELECT email, role, is_active, session_version, twofa_enabled FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [payload.email])).rows[0];
  if (!row || row.is_active === false) bad('Admin session is no longer valid', 401);
  if (Number(row.session_version || 0) !== Number(payload.sv || 0)) bad('Admin session has been revoked', 401);
  return { ...payload, email: row.email, role: row.role || payload.role, twofa_enabled: row.twofa_enabled === true };
}
function requireOwner(admin) { if (!admin || admin.role !== 'owner') bad('Owner permission required', 403); }
async function verifyPassword(password, hash) {
  try {
    const [alg, iter, saltB64, digestB64] = String(hash || '').split('$');
    if (alg === 'scrypt') {
      const expected = Buffer.from(digestB64, 'base64url');
      const derived = Buffer.from(await scryptAsync(String(password || ''), Buffer.from(saltB64, 'base64url'), expected.length, { N: Number(iter || 16384), r: 8, p: 1 }));
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    }
    if (alg === 'sha256_salted') {
      const material = `${saltB64}:${String(password || '')}:${'bdg-help-center-admin'}`;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material)));
      const expected = b64UrlDecode(digestB64);
      return digest.length === expected.length && digest.every((b, i) => b === expected[i]);
    }
    if (alg !== 'pbkdf2_sha256') return false;
    const iterations = Number(iter);
    if (!Number.isFinite(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
    const salt = b64UrlDecode(saltB64);
    const expected = b64UrlDecode(digestB64);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password || '')), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.length * 8);
    const given = new Uint8Array(bits);
    return given.length === expected.length && given.every((b, i) => b === expected[i]);
  } catch { return false; }
}
export async function uploadToR2(request, env, prefix) {
  if (!env.GUIDE_IMAGES) bad('Image storage is not configured', 503, 'UPLOAD_STORAGE_NOT_CONFIGURED');
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') bad('Image file is required', 400, 'UPLOAD_FILE_REQUIRED');

  const ext = safeExt(file.name || 'image.png');
  const contentType = String(file.type || '').toLowerCase();
  const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
  if (!allowedTypes.has(contentType)) {
    bad('Only PNG, JPG, JPEG, WebP, and GIF images are allowed', 415, 'UPLOAD_TYPE_NOT_ALLOWED');
  }
  const expectedTypes = ext === '.png'
    ? new Set(['image/png'])
    : ['.jpg', '.jpeg'].includes(ext)
      ? new Set(['image/jpeg'])
      : ext === '.webp'
        ? new Set(['image/webp'])
        : new Set(['image/gif']);
  if (!expectedTypes.has(contentType)) {
    bad('Image filename extension does not match its content type', 400, 'UPLOAD_TYPE_MISMATCH');
  }

  const maxBytes = Math.min(Number(env.MAX_REQUEST_BYTES || 20 * 1024 * 1024), 10 * 1024 * 1024);
  if (!Number.isFinite(file.size) || file.size < 1) bad('Image file is empty', 400, 'UPLOAD_FILE_EMPTY');
  if (file.size > maxBytes) bad(`Image exceeds the ${Math.floor(maxBytes / 1024 / 1024)} MB upload limit`, 413, 'UPLOAD_FILE_TOO_LARGE');

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) bad('Image upload body is incomplete', 400, 'UPLOAD_BODY_INCOMPLETE');
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  try {
    await env.GUIDE_IMAGES.put(key, bytes, {
      httpMetadata: { contentType },
      contentLength: bytes.byteLength,
    });
  } catch (cause) {
    const error = new Error('R2 image upload failed');
    error.status = 502;
    error.code = 'UPLOAD_STORAGE_WRITE_FAILED';
    error.publicMessage = 'Image storage is temporarily unavailable';
    error.cause = cause;
    throw error;
  }
  const origin = new URL(request.url).origin;
  return json({ ok: true, filename: key, url: `${origin}/uploads/${key}`, content_type: contentType, size_bytes: bytes.byteLength }, 200, env);
}
function safeExt(name) {
  const ext = (name.match(/\.[a-z0-9]+$/i)?.[0] || '.png').toLowerCase();
  if (!['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)) {
    bad('Only PNG, JPG, JPEG, WebP, and GIF images are allowed', 415, 'UPLOAD_EXTENSION_NOT_ALLOWED');
  }
  return ext;
}
async function serveUpload(request, env, path) { const key = decodeURIComponent(path.replace('/uploads/', '')); const obj = await env.GUIDE_IMAGES.get(key); if (!obj) return new Response('Not found', { status: 404, headers: corsHeaders(env) }); return new Response(obj.body, { headers: { ...corsHeaders(env), 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' } }); }


function normalizeForMatch(text) { return String(text || '').toLowerCase().replace(/[""]/g,'"').replace(/['']/g,"'").replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g,' ').trim(); }
function keywordList(value) { return String(value || '').split(/[,\n|]+/).map(x => normalizeForMatch(x)).filter(Boolean); }
export function isGreetingOnly(message) {
  const msg = normalizeForMatch(message);
  return /^(hi|hello|hey|hiya|good morning|good afternoon|good evening|namaste|salam|mingalaba|မင်္ဂလာပါ|你好|您好|嗨)$/.test(msg);
}
function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
export function imageUrlsFromHtml(value) {
  const urls = [];
  const source = String(value || '');
  const pattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(source)) && urls.length < 20) {
    const url = String(match[1] || '').trim();
    if (url.startsWith('/') || /^https?:\/\//i.test(url)) urls.push(url);
  }
  return [...new Set(urls)];
}
export function scoreAiContent(message, row) {
  if (isGreetingOnly(message)) return { score: 0, reason: 'greeting bypass' };
  const msg = normalizeForMatch(message);
  if (!msg) return { score: 0, reason: 'empty message' };
  if (containsAnyPhrase(message, row.negative_examples || '')) return { score: -100, reason: 'negative example matched' };
  let score = 0;
  let reason = 'no strong signal';
  const positives = keywordList(row.positive_examples || '');
  const keywords = keywordList(row.keywords || '');
  for (const phrase of positives) {
    if (msg === phrase) { score = Math.max(score, 100); reason = 'exact positive example'; }
    else if (phrase.includes(' ') && msg.includes(phrase)) { score = Math.max(score, 94); reason = 'positive phrase matched'; }
  }
  let keywordHits = 0;
  for (const phrase of keywords) {
    if (msg === phrase) { score = Math.max(score, phrase.includes(' ') ? 98 : 60); reason = phrase.includes(' ') ? 'exact keyword phrase' : 'one broad keyword'; keywordHits += 1; }
    else if (phrase.includes(' ') && msg.includes(phrase)) { score = Math.max(score, 91); reason = 'keyword phrase matched'; keywordHits += 1; }
    else if (!phrase.includes(' ') && msg.split(' ').includes(phrase)) keywordHits += 1;
  }
  if (keywordHits >= 3) { score = Math.max(score, 92); reason = 'three keyword signals'; }
  else if (keywordHits === 2) { score = Math.max(score, 87); reason = 'two keyword signals'; }
  else if (keywordHits === 1) { score = Math.max(score, 58); reason = 'one keyword signal'; }
  const identity = normalizeForMatch(`${row.title || ''} ${row.intent_key || ''}`);
  const identityTokens = identity.split(' ').filter(token => token.length >= 4 && !STOPWORDS.has(token));
  const identityHits = identityTokens.filter(token => msg.split(' ').includes(token)).length;
  if (identityHits >= 2) { score = Math.max(score, 89); reason = 'title intent matched'; }
  if (isAmbiguousCustomerMessage(message)) { score = Math.min(score, 55); reason = 'ambiguous message'; }
  score += Math.min(4, Math.floor(Math.max(0, 120 - Number(row.priority || 100)) / 10));
  return { score: Math.max(-100, Math.min(100, score)), reason };
}
async function findAiContentMatch(env, message, language = 'en') {
  if (isGreetingOnly(message)) return { selected: null, second: null, gap: 0, candidates: [], greeting_bypass: true };
  const locale = String(language || 'en').toLowerCase().slice(0, 20);
  const { rows } = await q(env, `SELECT * FROM ai_content_items WHERE status='published' AND deleted_at IS NULL AND (locale=$1 OR locale='all' OR locale='') ORDER BY priority ASC,id DESC`, [locale]);
  const candidates = rows.map(row => ({ row, ...scoreAiContent(message, row) })).filter(item => item.score > 0).sort((a,b) => b.score - a.score || Number(a.row.priority || 100) - Number(b.row.priority || 100));
  const best = candidates[0] || null;
  const second = candidates[1] || null;
  const gap = best ? best.score - (second?.score || 0) : 0;
  const threshold = Number(best?.row?.confidence_threshold || 86);
  const selected = best && best.score >= threshold && (!second || gap >= 12) ? best : null;
  return { selected, second, gap, candidates, greeting_bypass: false };
}

function containsAnyPhrase(message, phrases) {
  const msg = normalizeForMatch(message);
  return keywordList(phrases).some((phrase) => phrase && msg.includes(phrase));
}
function isAmbiguousCustomerMessage(message) {
  const msg = normalizeForMatch(message);
  const words = msg.split(' ').filter(Boolean).filter(w => !STOPWORDS.has(w));
  const vague = ['account','number','id','bank','upi','wallet','withdrawal','deposit','problem','issue','help','not working','failed'];
  if (words.length <= 2 && vague.some(v => msg.includes(v))) return true;
  if (/^(my|mera|मेरी|मेरा)?\s*(account|id|number|bank|upi|wallet)\s*(number|id)?$/i.test(msg)) return true;
  return false;
}
async function ensureChatSession(env, sessionId) {
  let clean = String(sessionId || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 100);
  if (!clean) clean = `guest-${crypto.randomUUID()}`;
  const inserted = await q(env, `INSERT INTO chat_sessions(session_id, memory_summary, message_count) VALUES($1, '', 0) ON CONFLICT(session_id) DO UPDATE SET updated_at=NOW() RETURNING *`, [clean]);
  return inserted.rows[0];
}
async function buildPrompt(env, approvedContext, memorySummary, uploadedImages) { const prompts = await listPrompts(env); const sectionText = prompts.filter(p => p.enabled).map(p => `## ${p.title}\n${p.content}`).join('\n\n'); const memoryText = memorySummary || 'No prior memory for this customer session.'; const imageNote = uploadedImages?.length ? 'Customer uploaded images are present. Follow Image / Receipt Rules strictly.' : 'No customer image uploaded in this message.'; return `${sectionText}\n\n## Single Selected AI Content\n${approvedContext || 'No AI Content item was selected. Use the global prompt only and answer the actual message naturally. Do not guess a business topic.'}\n\n## Customer Memory\n${memoryText}\n\n## Image Context\n${imageNote}\n\n## Final Instruction\nThe global AI Prompt Manager is always primary. At most one AI Content item may support this answer. A greeting is never evidence of a business topic. Never mention routing, confidence, content IDs, or internal rules. Never invent an approved answer. Do not use a hardcoded business fallback. Return plain text with short paragraphs or numbered steps; do not return HTML, scripts, CSS, raw colors, or markdown stars.`.trim(); }
async function callDeepSeek(env, settings, systemPrompt, userMessage) {
  if (!settings.enabled || !env.DEEPSEEK_API_KEY) return { reply: null, error: !settings.enabled ? 'AI model disabled' : 'Missing DEEPSEEK_API_KEY', error_type: 'configuration', attempts: 0 };
  const apiBase = (settings.api_base || 'https://api.deepseek.com').replace(/\/$/, '');
  // Two bounded attempts must complete before the 20-second public chat budget.
  const timeoutMs = Math.max(3000, Math.min(Number(env.DEEPSEEK_TIMEOUT_MS || 8000), 9000));
  let last = { reply: null, error: 'DeepSeek request failed', error_type: 'provider', attempts: 0 };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.model || 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], temperature: Number(settings.temperature ?? 0.2), max_tokens: Number(settings.max_tokens ?? 700), stream: false })
      });
      const text = await res.text();
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        last = { reply: null, error: `DeepSeek HTTP ${res.status}: ${text.slice(0, 220)}`, error_type: res.status === 429 ? 'rate_limit' : 'provider', attempts: attempt };
        if (retryable && attempt < 2) continue;
        return last;
      }
      let data;
      try { data = JSON.parse(text); }
      catch { return { reply: null, error: 'DeepSeek returned non-JSON response', error_type: 'invalid_response', attempts: attempt }; }
      const reply = data?.choices?.[0]?.message?.content;
      return reply ? { reply, error: null, error_type: null, attempts: attempt } : { reply: null, error: 'DeepSeek returned an empty response', error_type: 'invalid_response', attempts: attempt };
    } catch (err) {
      const timedOut = err?.name === 'AbortError';
      last = { reply: null, error: timedOut ? `DeepSeek request timed out after ${timeoutMs}ms` : (err?.message || 'DeepSeek request failed'), error_type: timedOut ? 'timeout' : 'network', attempts: attempt };
      if (attempt < 2) continue;
    } finally { clearTimeout(timeout); }
  }
  return last;
}

function isExplicitResolutionConfirmation(message) {
  const msg = normalizeForMatch(message);
  return /^(it is fixed|its fixed|issue solved|problem solved|already solved|resolved|resolved now|working now|it works now|received now|deposit arrived|deposit arrived now)$/i.test(msg);
}
async function finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, logMeta = {}) {
  let memorySummary = session.memory_summary;
  if (settings.memory_enabled && !adminTest) memorySummary = await updateMemory(env, session, message, reply, uploaded, settings.memory_max_messages || 12);
  if (!adminTest) {
    const responseBlocks = normalizeResponseBlocks(logMeta.response_blocks);
    const finalBlocks = responseBlocks.length ? responseBlocks : responseBlocksFromText(reply);
    await q(env, 'INSERT INTO chat_logs(session_id, customer_message, assistant_reply, matched_sources, matched_images, uploaded_images, used_deepseek, model, provider_status, error_type, error_detail, latency_ms, request_id, intent_id, confidence, attachment_decision,response_blocks_json,response_format,resolution_state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)', [session.session_id, message, reply, logMeta.sources || '', logMeta.images || '', joinUrls(uploaded), !!logMeta.usedDeepseek, logMeta.model || 'conversation-state-local', logMeta.provider_status || (logMeta.usedDeepseek ? 'success' : 'fallback'), logMeta.error_type || '', logMeta.error_detail || '', Number(logMeta.latency_ms || 0), logMeta.request_id || '', logMeta.intent_id || '', logMeta.confidence == null ? null : Number(logMeta.confidence), logMeta.attachment_decision || 'none', JSON.stringify(finalBlocks), 'structured-v1', logMeta.resolution_state || 'open']);
  }
  return memorySummary;
}

async function updateMemory(env, session, userMessage, assistantReply, uploadedImages, maxMessages = 12) { await q(env, 'INSERT INTO chat_memory_messages(session_id, role, content, image_urls) VALUES($1,$2,$3,$4),($1,$5,$6,$7)', [session.session_id, 'user', userMessage, joinUrls(uploadedImages), 'assistant', assistantReply, '']); await q(env, 'UPDATE chat_sessions SET message_count=message_count+1, updated_at=NOW() WHERE session_id=$1', [session.session_id]); const recent = (await q(env, 'SELECT * FROM chat_memory_messages WHERE session_id=$1 ORDER BY id DESC LIMIT $2', [session.session_id, Math.max(4, maxMessages)])).rows.reverse(); const summary = 'Recent session memory:\n' + recent.map(m => `${m.role}: ${firstSentences(m.content, 160)}${splitUrls(m.image_urls).length ? ' [image uploaded]' : ''}`).join('\n'); await q(env, 'UPDATE chat_sessions SET memory_summary=$2, updated_at=NOW() WHERE session_id=$1', [session.session_id, summary]); return summary; }
function aiContentPromptContext(row) {
  if (!row) return '';
  return [
    `Content title: ${row.title}`,
    `Intent: ${row.intent_key}`,
    row.required_fields ? `Required information to ask for when relevant:\n${row.required_fields}` : '',
    row.faq_content ? `Approved FAQ:\n${row.faq_content}` : '',
    row.knowledge_content ? `Approved knowledge:\n${row.knowledge_content}` : '',
    row.example_answers ? `Example answers (adapt naturally; do not copy blindly):\n${row.example_answers}` : '',
    row.ai_instruction ? `Item-specific instruction:\n${row.ai_instruction}` : '',
    row.rich_html ? `Formatted visual knowledge text:\n${stripHtml(row.rich_html)}` : '',
  ].filter(Boolean).join('\n\n');
}
function technicalUnavailableText(lang) {
  return lang === 'hi'
    ? 'AI सहायता अभी अस्थायी रूप से उपलब्ध नहीं है। कृपया कुछ देर बाद फिर प्रयास करें।'
    : 'AI support is temporarily unavailable. Please try again in a moment.';
}
async function runAiChat(env, payload, adminTest) {
  const turnStarted = Date.now();
  const turnRequestId = crypto.randomUUID();
  const message = String(payload.message || '').trim();
  if (!message) bad('Message is required');
  const uploaded = Array.isArray(payload.image_urls) ? payload.image_urls : [];
  const lang = String(payload.language || payload.lang || 'en').toLowerCase().startsWith('hi') ? 'hi' : 'en';
  const settings = aiSettingOut(await getAiSettings(env), env);
  const session = await ensureChatSession(env, payload.session_id);

  if (isExplicitResolutionConfirmation(message)) {
    const reply = lang === 'hi'
      ? 'अच्छा लगा कि समस्या हल हो गई। यदि आपको किसी और चीज़ में सहायता चाहिए, तो नया सवाल भेजें।'
      : 'I am glad the issue is solved. If you need help with anything else, send a new question.';
    const responseBlocks = [{ type: 'success', text: reply }];
    if (!adminTest) await q(env, `UPDATE chat_sessions SET resolution_state='confirmed_by_user', resolved_at=NOW(), pending_smart_slug=NULL, pending_smart_status=NULL, last_smart_slug=NULL, updated_at=NOW() WHERE session_id=$1`, [session.session_id]);
    const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, {
      model: 'explicit-resolution-confirmation',
      response_blocks: responseBlocks,
      resolution_state: 'confirmed_by_user',
      request_id: turnRequestId,
      latency_ms: Date.now() - turnStarted,
    });
    return {
      reply,
      response_blocks: responseBlocks,
      resolution_state: 'confirmed_by_user',
      content_images: [],
      session_id: session.session_id,
      request_id: turnRequestId,
      language: lang,
      memory_summary: memorySummary,
      used_deepseek: false,
      model: 'explicit-resolution-confirmation',
    };
  }

  const contentMatch = await findAiContentMatch(env, message, lang);
  const selected = contentMatch.selected;
  const systemPrompt = (await buildPrompt(
    env,
    aiContentPromptContext(selected?.row),
    session.memory_summary,
    uploaded,
  )) + `\n\n## Response language\nReply in ${lang === 'hi' ? 'Hindi' : 'English'} unless the customer clearly uses another language.`;

  const shouldCall = settings.enabled && !!env.DEEPSEEK_API_KEY;
  const provider = shouldCall
    ? await callDeepSeek(env, settings, systemPrompt, message)
    : { reply: null, error: settings.enabled ? 'Missing DEEPSEEK_API_KEY' : 'AI model disabled', error_type: 'configuration', attempts: 0 };
  const usedDeepSeek = !!provider.reply;
  const reply = cleanAssistantText(provider.reply || technicalUnavailableText(lang));
  const contentImages = usedDeepSeek && selected?.row?.image_delivery === 'after_answer'
    ? [...new Set([...splitUrls(selected.row.image_urls), ...imageUrlsFromHtml(selected.row.rich_html)])]
    : [];
  const responseBlocks = responseBlocksFromText(reply);
  const sourceLabel = selected ? `AI Content: ${selected.row.title}` : 'Global AI Prompt Manager only';
  const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, {
    sources: sourceLabel,
    images: contentImages.join('\n'),
    usedDeepseek: usedDeepSeek,
    provider_status: usedDeepSeek ? 'success' : 'error',
    error_type: usedDeepSeek ? '' : (provider.error_type || 'provider'),
    error_detail: usedDeepSeek ? '' : (provider.error || ''),
    latency_ms: Date.now() - turnStarted,
    request_id: turnRequestId,
    intent_id: selected?.row?.intent_key || '',
    confidence: selected?.score ?? null,
    attachment_decision: contentImages.length ? 'attached:single-selected-content' : (selected ? 'blocked:no-content-image' : 'blocked:no-content-selected'),
    response_blocks: responseBlocks,
    model: usedDeepSeek ? settings.model : 'technical-unavailable',
  });

  if (!adminTest && !selected && !isGreetingOnly(message) && !uploaded.length) {
    await q(env, 'INSERT INTO unmatched_questions(session_id, customer_message, language, suggested_intent) VALUES($1,$2,$3,$4)', [session.session_id, message, lang, 'no-high-confidence-ai-content']);
  }

  return {
    reply,
    response_blocks: responseBlocks,
    content_images: contentImages,
    session_id: session.session_id,
    request_id: turnRequestId,
    language: lang,
    memory_summary: memorySummary,
    used_deepseek: usedDeepSeek,
    model: usedDeepSeek ? settings.model : 'technical-unavailable',
    technical_failure: !usedDeepSeek,
    provider_error: usedDeepSeek ? null : (provider.error || 'AI provider unavailable'),
    diagnostics: adminTest ? {
      engine: 'prompt-first-single-content-router',
      greeting_bypass: contentMatch.greeting_bypass,
      selected_content: selected ? aiContentOut(selected.row, selected.score, selected.reason) : null,
      second_best: contentMatch.second ? aiContentOut(contentMatch.second.row, contentMatch.second.score, contentMatch.second.reason) : null,
      confidence_gap: contentMatch.gap,
      prompt_sections_used: (await listPrompts(env)).filter(section => section.enabled).length,
      images_are_routing_input: false,
    } : undefined,
  };
}

function randomBase32Secret(length = 20) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes).map(b => alphabet[b % alphabet.length]).join('');
}
function base32ToBytes(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(secret || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) { const v = alphabet.indexOf(ch); if (v >= 0) bits += v.toString(2).padStart(5,'0'); }
  const out = [];
  for (let i=0;i+8<=bits.length;i+=8) out.push(parseInt(bits.slice(i,i+8),2));
  return new Uint8Array(out);
}
async function totpCode(secret, stepOffset = 0) {
  const counter = Math.floor(Date.now() / 30000) + stepOffset;
  const msg = new ArrayBuffer(8); const view = new DataView(msg); view.setUint32(4, counter);
  const key = await crypto.subtle.importKey('raw', base32ToBytes(secret), { name:'HMAC', hash:'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const offset = sig[sig.length - 1] & 0xf;
  const bin = ((sig[offset] & 0x7f) << 24) | ((sig[offset+1] & 0xff) << 16) | ((sig[offset+2] & 0xff) << 8) | (sig[offset+3] & 0xff);
  return String(bin % 1000000).padStart(6, '0');
}
async function verifyTotp(secret, code) {
  const clean = String(code || '').replace(/\s+/g,'');
  if (!secret || !/^\d{6}$/.test(clean)) return false;
  for (const off of [-1,0,1]) if (await totpCode(secret, off) === clean) return true;
  return false;
}
async function setupOwn2fa(env, admin) {
  const secret = randomBase32Secret(20);
  await q(env, 'UPDATE admin_users SET twofa_secret=$1, updated_at=NOW() WHERE lower(email)=lower($2)', [secret, admin.email]);
  const issuer = encodeURIComponent(appName(env));
  const account = encodeURIComponent(admin.email);
  await audit(env, '2fa_setup', 'admin_users', admin.email, '2FA setup secret generated');
  return { ok: true, secret, otpauth_url: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` };
}
async function enableOwn2fa(env, admin, p = {}) {
  const row = (await q(env, 'SELECT * FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [admin.email])).rows[0];
  if (!row?.twofa_secret) bad('Please generate 2FA setup first', 400);
  if (!await verifyTotp(row.twofa_secret, p.code || p.twofa_code || p.otp)) bad('Invalid 2FA code', 400);
  await q(env, 'UPDATE admin_users SET twofa_enabled=TRUE, updated_at=NOW() WHERE id=$1', [row.id]);
  await audit(env, '2fa_enabled', 'admin_users', row.id, '2FA enabled');
  return { ok: true };
}
async function disableOwn2fa(env, admin, p = {}) {
  const row = (await q(env, 'SELECT * FROM admin_users WHERE lower(email)=lower($1) LIMIT 1', [admin.email])).rows[0];
  if (!row) bad('Admin not found', 404);
  if (row.twofa_enabled && !await verifyTotp(row.twofa_secret, p.code || p.twofa_code || p.otp)) bad('Invalid 2FA code', 400);
  await q(env, 'UPDATE admin_users SET twofa_enabled=FALSE, twofa_secret=NULL, updated_at=NOW() WHERE id=$1', [row.id]);
  await audit(env, '2fa_disabled', 'admin_users', row.id, '2FA disabled');
  return { ok: true };
}
async function changeOwnPassword(env, admin, p = {}) {
  const password = p.password || p.new_password;
  if (!password || String(password).length < 12) bad('Password must be at least 12 characters');
  await q(env, 'UPDATE admin_users SET password_hash=$1, session_version=COALESCE(session_version,0)+1, updated_at=NOW() WHERE lower(email)=lower($2)', [await hashPassword(password), admin.email]);
  await audit(env, 'change_own_password', 'admin_users', admin.email, 'Own password changed and old sessions revoked');
  return { ok: true };
}
async function forceLogoutAdmin(env, id) {
  await q(env, 'UPDATE admin_users SET session_version=COALESCE(session_version,0)+1, updated_at=NOW() WHERE id=$1', [id]);
  await audit(env, 'force_logout', 'admin_users', id, 'Owner forced admin logout');
  return { ok: true };
}
async function resetAdmin2fa(env, id) {
  await q(env, 'UPDATE admin_users SET twofa_enabled=FALSE, twofa_secret=NULL, updated_at=NOW() WHERE id=$1', [id]);
  await audit(env, 'reset_2fa', 'admin_users', id, 'Owner reset admin 2FA');
  return { ok: true };
}
async function listAdminSessions(env, admin) {
  requireOwner(admin);
  const { rows } = await q(env, 'SELECT id,email,name,role,is_active,twofa_enabled,last_login_at,session_version,updated_at FROM admin_users ORDER BY last_login_at DESC NULLS LAST, id ASC');
  return rows.map(r => ({ id:r.id, email:r.email, name:r.name, role:r.role, active:r.is_active !== false, twofa_enabled:r.twofa_enabled === true, last_login_at:r.last_login_at ? String(r.last_login_at) : '', session_version:Number(r.session_version||0), updated_at:r.updated_at ? String(r.updated_at) : '' }));
}


async function adminFoundationDiagnostics(env) {
  const checks = [];
  const tests = [
    ['owner_account', `SELECT id,email,role,is_active,twofa_enabled FROM admin_users WHERE role='owner' LIMIT 1`],
    ['admin_users_table', `SELECT COUNT(*)::int AS count FROM admin_users`],
    ['prompts_api_table', `SELECT COUNT(*)::int AS count FROM ai_prompt_sections`],
    ['categories_table', `SELECT COUNT(*)::int AS count FROM categories`],
    ['guides_table', `SELECT COUNT(*)::int AS count FROM guides`],
    ['chat_quick_replies_table', `SELECT COUNT(*)::int AS count FROM chat_quick_replies`],
    ['ai_content_table', `SELECT COUNT(*)::int AS count FROM ai_content_items`],
    ['settings_table', `SELECT COUNT(*)::int AS count FROM theme_settings`],
    ['audit_table', `SELECT COUNT(*)::int AS count FROM admin_audit_logs`],
    ['system_migrations_table', `SELECT COUNT(*)::int AS count FROM system_migrations`]
  ];
  for (const [name, sql] of tests) {
    try { const res = await q(env, sql); checks.push({ name, ok: true, rows: res.rows?.length || 0, sample: res.rows?.[0] || null }); }
    catch (err) { checks.push({ name, ok: false, error: err?.message || String(err) }); }
  }
  return { ok: checks.every(x => x.ok), version: VERSION, owner_email: String(env.ADMIN_EMAIL || OWNER_EMAIL).trim().toLowerCase(), checks, timestamp: new Date().toISOString() };
}

async function aiDiagnostics(env) { const settings = await getAiSettings(env); const counts = {}; for (const [key, table] of Object.entries({ categories:'categories', guides:'guides', faqs:'faqs', knowledge:'knowledge_items', prompts:'ai_prompt_sections', prompt_versions:'ai_prompt_versions', ai_content:'ai_content_items', sessions:'chat_sessions', logs:'chat_logs', unmatched:'unmatched_questions', content_blocks:'site_content_blocks', popular_help:'popular_help_cards', nav:'navigation_items', audit:'admin_audit_logs' })) { try { counts[key] = Number((await q(env, `SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0]?.count || 0); } catch (err) { counts[key] = `error: ${err.message}`; } } return { ok: true, version: VERSION, routing_engine: 'prompt-first-single-content-router', images_are_routing_input: false, guide_attachments: 'removed', deepseek_key_present: !!env.DEEPSEEK_API_KEY, deepseek_api_base: settings?.api_base || env.DEEPSEEK_API_BASE || 'https://api.deepseek.com', model: settings?.model || env.DEEPSEEK_MODEL || 'deepseek-chat', ai_enabled_in_db: !!settings?.enabled, require_approved_context: !!settings?.require_approved_context, memory_enabled: !!settings?.memory_enabled, counts }; }
async function listSessions(env) { const { rows } = await q(env, 'SELECT * FROM chat_sessions ORDER BY id DESC LIMIT 100'); return rows.map(x => ({ id: x.id, session_id: x.session_id, memory_summary: x.memory_summary, message_count: x.message_count, created_at: String(x.created_at), updated_at: String(x.updated_at) })); }
async function clearSession(env, sessionId) { await q(env, 'UPDATE chat_sessions SET memory_summary=$2, message_count=0, updated_at=NOW() WHERE session_id=$1', [sessionId, '']); await q(env, 'DELETE FROM chat_memory_messages WHERE session_id=$1', [sessionId]); return { ok: true }; }

async function adminApiDiagnostics(env) {
  const checks = [];
  async function check(name, endpoint, run) {
    const started = Date.now();
    try {
      const result = await run();
      checks.push({ name, endpoint, ok: true, status: 'working', ms: Date.now() - started, detail: result });
    } catch (err) {
      checks.push({ name, endpoint, ok: false, status: 'failed', ms: Date.now() - started, error: err?.message || String(err) });
    }
  }
  await check('GET settings', '/settings', async () => Boolean(await getTheme(env)));
  await check('PUT settings backend', '/admin/settings', async () => 'ready');
  await check('GET guides', '/admin/guides', async () => (await listAdminGuides(env)).length);
  await check('DELETE guide backend', '/admin/guides/:id', async () => 'ready');
  await check('GET AI Content', '/admin/ai-content', async () => (await listAiContent(env, true)).length);
  await check('DELETE AI Content backend', '/admin/ai-content/:id', async () => 'ready');
  await check('GET quick replies', '/admin/chat-quick-replies', async () => (await listQuickReplies(env, true)).length);
  await check('Batch quick reply delete', '/admin/chat-quick-replies/batch-delete', async () => 'ready');
  await check('Duplicate cleaner', '/admin/chat-quick-replies/cleanup-duplicates', async () => 'ready');
  await check('R2 upload binding', '/admin/uploads', async () => !!env.GUIDE_IMAGES);
  return { ok: checks.every(c => c.ok), version: VERSION, checks };
}

async function systemHealth(env) {
  const checks = [];
  const check = async (name, run, configured = true) => {
    if (!configured) { checks.push({ name, status: 'not_enabled', ok: true }); return; }
    const started = Date.now();
    try { const detail = await run(); checks.push({ name, status: 'healthy', ok: true, latency_ms: Date.now() - started, detail }); }
    catch (err) { checks.push({ name, status: 'unavailable', ok: false, latency_ms: Date.now() - started, error: err?.message || String(err) }); }
  };
  await check('database', async () => Number((await q(env, 'SELECT 1 AS ok')).rows[0]?.ok) === 1);
  await check('r2', async () => { await env.GUIDE_IMAGES.health(); return true; }, !!env.GUIDE_IMAGES);
  const settings = aiSettingOut(await getAiSettings(env), env);
  if (settings.enabled && env.DEEPSEEK_API_KEY) checks.push({ name: 'deepseek', status: 'configured', ok: true, model: settings.model });
  else checks.push({ name: 'deepseek', status: 'not_enabled', ok: true });
  const failed = checks.filter(x => !x.ok);
  return { ok: !failed.length, status: failed.length ? 'degraded' : 'healthy', version: VERSION, checks, timestamp: new Date().toISOString() };
}

async function listChatLogs(env) { const { rows } = await q(env, 'SELECT * FROM chat_logs ORDER BY created_at DESC, id DESC LIMIT 300'); return rows.map(x => ({ id: x.id, session_id: x.session_id, customer_message: x.customer_message || '', assistant_reply: x.assistant_reply || '', matched_sources: splitUrls(x.matched_sources), matched_images: splitUrls(x.matched_images), uploaded_images: splitUrls(x.uploaded_images), used_deepseek: !!x.used_deepseek, provider_status: x.provider_status || (x.used_deepseek ? 'success' : 'fallback'), error_type: x.error_type || '', error_detail: x.error_detail || '', latency_ms: Number(x.latency_ms || 0), request_id: x.request_id || '', intent_id: x.intent_id || '', confidence: x.confidence == null ? null : Number(x.confidence), attachment_decision: x.attachment_decision || '', response_blocks: normalizeResponseBlocks(x.response_blocks_json || ''), response_format: x.response_format || 'text', resolution_state: x.resolution_state || 'open', model: x.model, created_at: String(x.created_at) })); }
async function listUnmatchedQuestions(env) { const { rows } = await q(env, 'SELECT * FROM unmatched_questions ORDER BY id DESC LIMIT 300'); return rows.map(x => ({ id: x.id, session_id: x.session_id, customer_message: x.customer_message, language: x.language || 'en', suggested_intent: x.suggested_intent || '', created_at: String(x.created_at) })); }


export async function runMigrations(env) {
  if (!env.DATABASE_URL && !env.HYPERDRIVE?.connectionString) throw new Error('DATABASE_URL is required for migrations');
  if (!env.ADMIN_PASSWORD) throw new Error('ADMIN_PASSWORD is required for migrations');
  if (!env.JWT_SECRET || String(env.JWT_SECRET).length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  const pool = getPool(env);
  const client = await pool.connect();
  const migrationEnv = { ...env, __DB_CLIENT: client };
  try {
    await client.query('SELECT pg_advisory_lock($1)', [701070]);
    bootstrapped = false;
    await ensureBootstrap(migrationEnv);
    await client.query(`INSERT INTO system_migrations(migration_key, notes) VALUES('v0.7.0a_render_neon_backend', 'Render Node backend using Neon pooled runtime and direct migration connections') ON CONFLICT(migration_key) DO NOTHING`);
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [701070]); } catch (_) {}
    client.release();
  }
  return { ok: true, version: VERSION };
}

export async function readiness(env) {
  const started = Date.now();
  const result = await q(env, `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='system_migrations') AS migrated`);
  const migrated = result.rows[0]?.migrated === true;
  if (!migrated) throw new Error('Database migrations have not been applied');
  return { ok: true, service: appName(env), version: VERSION, database: 'ok', database_provider: String(env.DATABASE_PROVIDER || 'neon').toLowerCase(), connection_mode: env.DATABASE_CONNECTION_MODE || 'pooled-runtime', migration_table: 'ok', latency_ms: Date.now() - started };
}
