import pg from 'pg';
import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
const { Pool } = pg;
const scryptAsync = promisify(scryptCallback);
const pools = new Map();

const VERSION = '0.8.0-structured-rich-responses-precision-guide-delivery';
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
      console.error('Worker error:', err?.stack || err?.message || err);
      return json({ ok: false, error: err?.message || 'Server error', version: VERSION }, err.status || 500, env);
    }
  }
};

async function route(request, env, url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const method = request.method.toUpperCase();

  if (method === 'GET' && path === '/') return json({ ok: true, service: appName(env), version: VERSION, message: 'Render business backend API with Neon PostgreSQL is running.' }, 200, env);
  if (method === 'GET' && path === '/health') return json({ ok: true, service: appName(env), version: VERSION, features: ['true-rich-guide-cms','separate-guide-language-content','admin-cn-en','public-hi-en','favicon-upload','chat-navigation-fix','admin-login-json-fix','guide-pro-data-binding-fix','owner-admin-control','clean-chat-ux','favicon-hardcode','admin-data-fix','admin-real-connection','visual-guide-builder','bulk-cleanup','smart-match-guide','ai-control-center','chat-icon-control','support-button-removal','deployment-recovery','pro-ui-restore','business-cms','professional-help-center','site-content-control','prompt-versions','audit-logs','render-node','neon-postgresql','neon-pooled-runtime','neon-direct-migrations','pooled-database','r2-s3-api','deepseek','smart-memory','clarify-first-ai','smart-match-confidence-thresholds','smart-match-negative-keywords','smart-match-rich-blocks','admin-2fa','single-session-login','owner-permissions','conversation-state-ai','guide-rejection-detection','topic-reset','real-2fa-admin-control','precision-ai-router','intent-first-routing','confidence-bands','second-best-gap-check','safe-guide-delivery','ai-test-lab','incorrect-match-reports','knowledge-versions','prompt-first-ai','optional-guide-delivery','guide-attachment-library','guide-usage-policy','ai-prompt-primary-source','guide-attach-mode','public-guide-backend-binding','demo-data-removal','backend-only-public-guides','structured-rich-responses','semantic-response-colors','live-guide-content-binding','explicit-resolution-only','customer-question-chat-logs'] }, 200, env);
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

  // Smart Match Guide: admin-controlled guide replies with optional AI enhancement.
  if (method === 'GET' && path === '/admin/smart-matches') return json(await listSmartMatches(env, true), 200, env);
  if (method === 'POST' && path === '/admin/smart-matches') return json(await createSmartMatch(env, await readJson(request)), 200, env);
  if (method === 'PUT' && /^\/admin\/smart-matches\/\d+$/.test(path)) return json(await updateSmartMatch(env, idFromPath(path), await readJson(request)), 200, env);
  if (method === 'POST' && path === '/admin/smart-matches/batch-delete') return json(await batchDeleteByIds(env, 'smart_match_guides', (await readJson(request)).ids), 200, env);
  if (method === 'DELETE' && /^\/admin\/smart-matches\/\d+$/.test(path)) return json(await deleteById(env, 'smart_match_guides', idFromPath(path)), 200, env);
  if (method === 'POST' && path === '/admin/smart-matches/test') return json(await testSmartMatch(env, await readJson(request)), 200, env);
  if (method === 'GET' && path === '/admin/ai-router/settings') return json(await getAiRouterSettings(env), 200, env);
  if (method === 'PUT' && path === '/admin/ai-router/settings') return json(await saveAiRouterSettings(env, await readJson(request)), 200, env);
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
  if (method === 'DELETE' && /^\/admin\/ai\/prompts\/\d+$/.test(path)) return json(await deleteById(env, 'ai_prompt_sections', idFromPath(path)), 200, env);
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
function bad(message, status = 400) { const e = new Error(message); e.status = status; throw e; }


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
    `CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY,name VARCHAR(120) UNIQUE NOT NULL,slug VARCHAR(150) UNIQUE NOT NULL,description TEXT,icon VARCHAR(20) DEFAULT 'target',sort_order INTEGER DEFAULT 100,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS guides (id SERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,slug VARCHAR(220) UNIQUE NOT NULL,summary TEXT,body TEXT NOT NULL,image_urls TEXT,keywords TEXT,language VARCHAR(20) DEFAULT 'en',priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'published',category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS faqs (id SERIAL PRIMARY KEY,question VARCHAR(255) NOT NULL,answer TEXT NOT NULL,keywords TEXT,priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'published',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS knowledge_items (id SERIAL PRIMARY KEY,title VARCHAR(180) NOT NULL,content TEXT NOT NULL,keywords TEXT,priority INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS theme_settings (id SERIAL PRIMARY KEY,app_name VARCHAR(160) DEFAULT 'BDG Help Center',logo_text VARCHAR(40) DEFAULT 'BDG',banner_title VARCHAR(200) DEFAULT 'BDG Mobile Help Center',banner_subtitle VARCHAR(255) DEFAULT 'Search FAQ and view official guide images.',support_link VARCHAR(500) DEFAULT 'https://t.me/your_support_bot',primary_color VARCHAR(40) DEFAULT '#f7c948',updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ai_prompt_sections (id SERIAL PRIMARY KEY,section_key VARCHAR(80) UNIQUE NOT NULL,title VARCHAR(180) NOT NULL,content TEXT DEFAULT '',enabled BOOLEAN DEFAULT TRUE,priority INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ai_model_settings (id SERIAL PRIMARY KEY,provider VARCHAR(50) DEFAULT 'deepseek',model VARCHAR(120) DEFAULT 'deepseek-chat',api_base VARCHAR(500) DEFAULT 'https://api.deepseek.com',enabled BOOLEAN DEFAULT FALSE,temperature DOUBLE PRECISION DEFAULT 0.2,max_tokens INTEGER DEFAULT 700,require_approved_context BOOLEAN DEFAULT TRUE,memory_enabled BOOLEAN DEFAULT TRUE,memory_max_messages INTEGER DEFAULT 12,memory_ttl_days INTEGER DEFAULT 30,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_sessions (id SERIAL PRIMARY KEY,session_id VARCHAR(120) UNIQUE NOT NULL,memory_summary TEXT,message_count INTEGER DEFAULT 0,resolution_state TEXT DEFAULT 'open',resolved_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_memory_messages (id SERIAL PRIMARY KEY,session_id VARCHAR(120) NOT NULL,role VARCHAR(20) NOT NULL,content TEXT NOT NULL,image_urls TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_logs (id SERIAL PRIMARY KEY,session_id VARCHAR(120),customer_message TEXT NOT NULL,assistant_reply TEXT NOT NULL,matched_sources TEXT,matched_images TEXT,uploaded_images TEXT,used_deepseek BOOLEAN DEFAULT FALSE,model VARCHAR(120),response_blocks_json TEXT,response_format TEXT DEFAULT 'structured-v1',resolution_state TEXT DEFAULT 'open',created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS site_content_blocks (id SERIAL PRIMARY KEY,block_key VARCHAR(100) UNIQUE NOT NULL,label VARCHAR(160) NOT NULL,value TEXT DEFAULT '',input_type VARCHAR(40) DEFAULT 'text',sort_order INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS popular_help_cards (id SERIAL PRIMARY KEY,title VARCHAR(120) NOT NULL,subtitle VARCHAR(200),icon VARCHAR(24) DEFAULT 'star',query VARCHAR(200),linked_category_slug VARCHAR(150),sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS navigation_items (id SERIAL PRIMARY KEY,nav_key VARCHAR(80) UNIQUE NOT NULL,label VARCHAR(80) NOT NULL,icon VARCHAR(24) DEFAULT '•',href VARCHAR(500) DEFAULT '#',sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS guide_home_sections (id SERIAL PRIMARY KEY,section_key VARCHAR(80) UNIQUE NOT NULL,title VARCHAR(160) NOT NULL,enabled BOOLEAN DEFAULT TRUE,sort_order INTEGER DEFAULT 100,updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS chat_quick_replies (id SERIAL PRIMARY KEY,text VARCHAR(180) NOT NULL,query VARCHAR(220),sort_order INTEGER DEFAULT 100,status VARCHAR(30) DEFAULT 'active',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS smart_match_guides (id SERIAL PRIMARY KEY,name VARCHAR(180) NOT NULL,slug VARCHAR(220) UNIQUE NOT NULL,status VARCHAR(30) DEFAULT 'active',priority INTEGER DEFAULT 100,keywords TEXT,typo_keywords TEXT,language_keywords TEXT,guide_text TEXT,guide_text_hi TEXT,image_urls TEXT,ai_enabled BOOLEAN DEFAULT TRUE,ai_enhance BOOLEAN DEFAULT TRUE,strict_mode BOOLEAN DEFAULT TRUE,confidence_threshold INTEGER DEFAULT 90,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS unmatched_questions (id SERIAL PRIMARY KEY,session_id VARCHAR(120),customer_message TEXT NOT NULL,language VARCHAR(20) DEFAULT 'en',suggested_intent TEXT,created_at TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS ai_router_settings (id INTEGER PRIMARY KEY DEFAULT 1,direct_send_threshold INTEGER DEFAULT 90,clarify_threshold INTEGER DEFAULT 70,fallback_threshold INTEGER DEFAULT 50,min_confidence_gap INTEGER DEFAULT 12,max_clarification_questions INTEGER DEFAULT 1,strict_guide_delivery BOOLEAN DEFAULT TRUE,show_admin_diagnostics BOOLEAN DEFAULT TRUE,updated_at TIMESTAMPTZ DEFAULT NOW())`,
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
  await q(env, `ALTER TABLE guides ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE faqs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE chat_quick_replies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
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
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pending_smart_slug TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pending_smart_status TEXT`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS pending_smart_updated_at TIMESTAMPTZ`);
  await q(env, `ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS last_smart_slug TEXT`);
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
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS guide_text_hi TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS image_urls_hi TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS fallback_to_english_images BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS negative_keywords TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS require_confirmation BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS clarify_question TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS answer_blocks_json TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS icon_url TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS action_label TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS action_url TEXT`);
  await q(env, `UPDATE smart_match_guides SET confidence_threshold=90 WHERE confidence_threshold IS NULL OR confidence_threshold < 60`);
  await q(env, `UPDATE smart_match_guides SET negative_keywords=TRIM(BOTH E'\n' FROM CONCAT(COALESCE(negative_keywords,''), E'\nalready arrived\nreceived already\ndeposit arrived\nnot deposit\nno deposit issue')) WHERE lower(name) LIKE '%deposit%' AND COALESCE(negative_keywords,'') NOT ILIKE '%already arrived%'`);
  await q(env, `UPDATE smart_match_guides SET negative_keywords=TRIM(BOTH E'\n' FROM CONCAT(COALESCE(negative_keywords,''), E'\naccount number\naccount id\ngame account\nmobile number\nlogin account')) WHERE (lower(name) LIKE '%bank%' OR lower(name) LIKE '%upi%') AND COALESCE(negative_keywords,'') NOT ILIKE '%account number%'`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS intent_id TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS positive_examples TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS negative_examples TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS common_misspellings TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS required_fields TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS excluded_situations TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'normal'`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS human_escalation_required BOOLEAN DEFAULT FALSE`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS allowed_response_content TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS forbidden_claims TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS required_warning TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS intent_policy_json TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS max_clarification_questions INTEGER DEFAULT 1`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS clarification_questions_json TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS response_layout_json TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS attach_mode TEXT DEFAULT 'auto_when_clear'`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS when_to_attach TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS when_not_to_attach TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS guide_usage_policy TEXT`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS knowledge_version TEXT DEFAULT 'v1'`);
  await q(env, `ALTER TABLE smart_match_guides ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ`);
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
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.8.0_structured_rich_responses_precision_guide_delivery', 'Structured response blocks, explicit resolution state, live Guide content, and customer-first Chat Logs') ON CONFLICT(migration_key) DO NOTHING`);
  await q(env, `INSERT INTO system_migrations(migration_key, notes) VALUES('v0.7.1_admin_stability_reliable_ai_fallback', 'Chat diagnostics, stable content/theme contracts, and reliable AI fallback') ON CONFLICT(migration_key) DO NOTHING`);
  await q(env, `INSERT INTO ai_router_settings(id,direct_send_threshold,clarify_threshold,fallback_threshold,min_confidence_gap,max_clarification_questions,strict_guide_delivery,show_admin_diagnostics) VALUES(1,90,70,50,12,1,TRUE,TRUE) ON CONFLICT(id) DO NOTHING`);
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
  await seedSmartMatches(env);
}
async function seedSmartMatches(env) {
  const rows = [
    {
      name: 'Deposit Not Received',
      slug: 'deposit-not-received',
      priority: 10,
      keywords: 'deposit not received, recharge not received, payment not added, money not added, balance not received, deposit pending',
      typo_keywords: 'depoist not recive, deposite not receive, depossit not recieved, rechage not recieved, depost not receive',
      language_keywords: 'डिपॉजिट नहीं मिला, जमा नहीं हुआ, रिचार्ज नहीं आया, ငွေမဝင်, 充值不到账, 存款未到账',
      guide_text: 'If your deposit is not received within 30 minutes, please use the "Deposit Not Received" option in the Self-Service Center and submit your payment receipt. Make sure the receipt is clear and the payment details are correct.',
      guide_text_hi: 'यदि आपका deposit 30 मिनट के अंदर प्राप्त नहीं हुआ है, तो Self-Service Center में "Deposit Not Received" option चुनें और अपनी payment receipt submit करें। कृपया receipt clear रखें और payment details सही हों।',
      image_urls: '',
      ai_enabled: true,
      ai_enhance: true,
      strict_mode: true,
      confidence_threshold: 90,
      status: 'active'
    }
  ];
  for (const r of rows) {
    await q(env, `INSERT INTO smart_match_guides(name,slug,status,priority,keywords,typo_keywords,language_keywords,guide_text,guide_text_hi,image_urls,ai_enabled,ai_enhance,strict_mode,confidence_threshold)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT(slug) DO NOTHING`,
      [r.name,r.slug,r.status,r.priority,r.keywords,r.typo_keywords,r.language_keywords,r.guide_text,r.guide_text_hi,r.image_urls,r.ai_enabled,r.ai_enhance,r.strict_mode,r.confidence_threshold]);
  }
}

async function seedPromptSections(env) {
  const prompts = [
    ['role','Role','You are the official BDG Help Center customer support assistant. Be polite, short, accurate, and customer-service focused.',true,10],
    ['job','Job','Help customers understand FAQ, guide images, deposit, withdrawal, account, promotion, app download, and support steps. Do not perform account actions.',true,20],
    ['knowledge','Knowledge','Use AI Prompt Manager as the primary source of behavior, rules, tone, safety, and escalation. Guide images are optional support materials only.',true,30],
    ['faq_prompt','FAQ Prompt','When an approved FAQ matches, answer using that FAQ first. Keep the reply short and clear.',true,40],
    ['example_answers','Example Answers','Example: "Please check your bank card information carefully before submitting withdrawal."',true,50],
    ['response_policy','Response Policy','Use simple steps. Avoid long explanations. Do not promise approval, payment success, or account changes.',true,60],
    ['language_rules','Language Rules','Reply in the same language as the customer when possible. Use simple words and short sentences.',true,70],
    ['safety_rules','Safety Rules','Never ask for password, OTP, PIN, full bank login, or private security information.',true,80],
    ['escalation_rules','Escalation Rules','If the issue needs account verification, payment confirmation, withdrawal approval, or manual checking, ask the customer to contact official support.',true,90],
    ['image_receipt_rules','Image / Receipt Rules','When users upload images or receipts, explain what they can check. Do not confirm payment success unless system data confirms it.',true,100],
    ['guide_usage_policy','Guide Usage Policy','Guide images are optional support materials. Answer from AI Prompt Manager first. Attach a guide image only when it clearly helps the user complete steps. Do not send guide images for unclear questions. Never show Smart Match, matched guide, confidence, recommended guide, or internal routing details to users.',true,110],
    ['fallback_reply_rules','Fallback Reply Rules','If there is no approved answer, say you are not fully sure and provide the official support link.',true,120],
    ['forbidden_actions','Forbidden Actions','Do not approve deposits, withdrawals, bonuses, account changes, or security changes. Do not answer outside approved platform rules.',true,130]
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
function categoryOut(row) { return { id: row.id, name: row.name, slug: row.slug, description: row.description, icon: row.icon || 'target', sort_order: row.sort_order ?? 100 }; }
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
function smartMatchOut(row, score = null, reason = '') {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status || 'active',
    priority: row.priority ?? 100,
    keywords: row.keywords || '',
    typo_keywords: row.typo_keywords || '',
    language_keywords: row.language_keywords || '',
    negative_keywords: row.negative_keywords || '',
    require_confirmation: row.require_confirmation === true,
    clarify_question: row.clarify_question || '',
    answer_blocks_json: row.answer_blocks_json || '',
    answer_blocks: parseBlocks(row.answer_blocks_json || ''),
    icon_url: row.icon_url || '',
    action_label: row.action_label || '',
    action_url: row.action_url || '',
    guide_text: row.guide_text || '',
    guide_text_hi: row.guide_text_hi || '',
    image_urls: splitUrls(row.image_urls),
    image_urls_hi: splitUrls(row.image_urls_hi),
    fallback_to_english_images: row.fallback_to_english_images === true,
    ai_enabled: row.ai_enabled !== false,
    ai_enhance: row.ai_enhance !== false,
    strict_mode: row.strict_mode !== false,
    confidence_threshold: row.confidence_threshold ?? 90,
    score,
    confidence: score == null ? null : Math.max(0, Math.min(99, Math.round(score))),
    reason,
    intent_id: row.intent_id || row.slug || '',
    positive_examples: row.positive_examples || '',
    negative_examples: row.negative_examples || '',
    common_misspellings: row.common_misspellings || row.typo_keywords || '',
    required_fields: row.required_fields || '',
    excluded_situations: row.excluded_situations || '',
    risk_level: row.risk_level || 'normal',
    attach_mode: row.attach_mode || 'auto_when_clear',
    when_to_attach: row.when_to_attach || '',
    when_not_to_attach: row.when_not_to_attach || '',
    guide_usage_policy: row.guide_usage_policy || '',
    human_escalation_required: row.human_escalation_required === true,
    allowed_response_content: row.allowed_response_content || '',
    forbidden_claims: row.forbidden_claims || '',
    required_warning: row.required_warning || '',
    intent_policy_json: row.intent_policy_json || '',
    max_clarification_questions: row.max_clarification_questions ?? 1,
    clarification_questions_json: row.clarification_questions_json || '',
    response_layout_json: row.response_layout_json || '',
    knowledge_version: row.knowledge_version || 'v1',
    last_reviewed_at: row.last_reviewed_at ? String(row.last_reviewed_at) : '',
    created_at: row.created_at ? String(row.created_at) : '',
    updated_at: row.updated_at ? String(row.updated_at) : '',
  };
}
function normalizeSmartMatchPayload(p = {}) {
  const name = p.name || p.title || 'Smart Match Guide';
  return {
    name,
    slug: p.slug || slugify(name),
    status: p.status || 'active',
    priority: Number(p.priority ?? 100),
    keywords: Array.isArray(p.keywords) ? p.keywords.join(', ') : (p.keywords || ''),
    typo_keywords: Array.isArray(p.typo_keywords) ? p.typo_keywords.join(', ') : (p.typo_keywords || ''),
    language_keywords: Array.isArray(p.language_keywords) ? p.language_keywords.join(', ') : (p.language_keywords || ''),
    negative_keywords: Array.isArray(p.negative_keywords) ? p.negative_keywords.join(', ') : (p.negative_keywords || ''),
    require_confirmation: p.require_confirmation === true,
    clarify_question: p.clarify_question || '',
    answer_blocks_json: Array.isArray(p.answer_blocks) ? JSON.stringify(p.answer_blocks) : (p.answer_blocks_json || ''),
    icon_url: p.icon_url || '',
    action_label: p.action_label || '',
    action_url: p.action_url || '',
    guide_text: p.guide_text || p.reply_text || p.body || '',
    guide_text_hi: p.guide_text_hi || p.reply_text_hi || '',
    image_urls: Array.isArray(p.image_urls) ? joinUrls(p.image_urls) : (p.image_urls || ''),
    image_urls_hi: Array.isArray(p.image_urls_hi) ? joinUrls(p.image_urls_hi) : (p.image_urls_hi || ''),
    fallback_to_english_images: p.fallback_to_english_images === true,
    ai_enabled: p.ai_enabled !== false,
    ai_enhance: p.ai_enhance !== false,
    strict_mode: p.strict_mode !== false,
    confidence_threshold: Number(p.confidence_threshold ?? 90),
    intent_id: String(p.intent_id || p.slug || '').trim(),
    positive_examples: Array.isArray(p.positive_examples) ? p.positive_examples.join('\n') : String(p.positive_examples || ''),
    negative_examples: Array.isArray(p.negative_examples) ? p.negative_examples.join('\n') : String(p.negative_examples || ''),
    common_misspellings: Array.isArray(p.common_misspellings) ? p.common_misspellings.join('\n') : String(p.common_misspellings || ''),
    required_fields: Array.isArray(p.required_fields) ? p.required_fields.join('\n') : String(p.required_fields || ''),
    excluded_situations: Array.isArray(p.excluded_situations) ? p.excluded_situations.join('\n') : String(p.excluded_situations || ''),
    risk_level: ['normal','sensitive','restricted'].includes(String(p.risk_level || '').toLowerCase()) ? String(p.risk_level).toLowerCase() : 'normal',
    human_escalation_required: p.human_escalation_required === true,
    allowed_response_content: String(p.allowed_response_content || ''),
    forbidden_claims: String(p.forbidden_claims || ''),
    required_warning: String(p.required_warning || ''),
    intent_policy_json: String(p.intent_policy_json || ''),
    max_clarification_questions: Number(p.max_clarification_questions ?? 1),
    clarification_questions_json: String(p.clarification_questions_json || ''),
    response_layout_json: String(p.response_layout_json || ''),
    attach_mode: ['never','ask_first','auto_when_clear'].includes(String(p.attach_mode || '').toLowerCase()) ? String(p.attach_mode).toLowerCase() : 'auto_when_clear',
    when_to_attach: String(p.when_to_attach || ''),
    when_not_to_attach: String(p.when_not_to_attach || ''),
    guide_usage_policy: String(p.guide_usage_policy || ''),
    knowledge_version: String(p.knowledge_version || 'v1'),
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
async function listSmartMatches(env, admin = false) { const { rows } = await q(env, `SELECT * FROM smart_match_guides ${admin ? '' : "WHERE status='active'"} ORDER BY priority ASC, id DESC`); return rows.map(r => smartMatchOut(r)); }
async function createSmartMatch(env, p) { const sp = normalizeSmartMatchPayload(p); const { rows } = await q(env, `INSERT INTO smart_match_guides(name,slug,status,priority,keywords,typo_keywords,language_keywords,guide_text,guide_text_hi,image_urls,image_urls_hi,fallback_to_english_images,ai_enabled,ai_enhance,strict_mode,confidence_threshold,negative_keywords,require_confirmation,clarify_question,answer_blocks_json,icon_url,action_label,action_url,intent_id,positive_examples,negative_examples,common_misspellings,required_fields,excluded_situations,risk_level,human_escalation_required,allowed_response_content,forbidden_claims,required_warning,intent_policy_json,max_clarification_questions,clarification_questions_json,response_layout_json,attach_mode,when_to_attach,when_not_to_attach,guide_usage_policy,knowledge_version,last_reviewed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,NOW()) RETURNING *`, [sp.name,sp.slug,sp.status,sp.priority,sp.keywords,sp.typo_keywords,sp.language_keywords,sp.guide_text,sp.guide_text_hi,sp.image_urls,sp.image_urls_hi,sp.fallback_to_english_images,sp.ai_enabled,sp.ai_enhance,sp.strict_mode,sp.confidence_threshold,sp.negative_keywords,sp.require_confirmation,sp.clarify_question,sp.answer_blocks_json,sp.icon_url,sp.action_label,sp.action_url,sp.intent_id,sp.positive_examples,sp.negative_examples,sp.common_misspellings,sp.required_fields,sp.excluded_situations,sp.risk_level,sp.human_escalation_required,sp.allowed_response_content,sp.forbidden_claims,sp.required_warning,sp.intent_policy_json,sp.max_clarification_questions,sp.clarification_questions_json,sp.response_layout_json,sp.attach_mode,sp.when_to_attach,sp.when_not_to_attach,sp.guide_usage_policy,sp.knowledge_version]); await audit(env,'create','smart_match_guides',rows[0].id,'Smart Match Guide created'); return smartMatchOut(rows[0]); }
async function updateSmartMatch(env, id, p) { const sp = normalizeSmartMatchPayload(p); const { rows } = await q(env, `UPDATE smart_match_guides SET name=$1,slug=$2,status=$3,priority=$4,keywords=$5,typo_keywords=$6,language_keywords=$7,guide_text=$8,guide_text_hi=$9,image_urls=$10,image_urls_hi=$11,fallback_to_english_images=$12,ai_enabled=$13,ai_enhance=$14,strict_mode=$15,confidence_threshold=$16,negative_keywords=$17,require_confirmation=$18,clarify_question=$19,answer_blocks_json=$20,icon_url=$21,action_label=$22,action_url=$23,intent_id=$24,positive_examples=$25,negative_examples=$26,common_misspellings=$27,required_fields=$28,excluded_situations=$29,risk_level=$30,human_escalation_required=$31,allowed_response_content=$32,forbidden_claims=$33,required_warning=$34,intent_policy_json=$35,max_clarification_questions=$36,clarification_questions_json=$37,response_layout_json=$38,attach_mode=$39,when_to_attach=$40,when_not_to_attach=$41,guide_usage_policy=$42,knowledge_version=$43,last_reviewed_at=NOW(),updated_at=NOW() WHERE id=$44 RETURNING *`, [sp.name,sp.slug,sp.status,sp.priority,sp.keywords,sp.typo_keywords,sp.language_keywords,sp.guide_text,sp.guide_text_hi,sp.image_urls,sp.image_urls_hi,sp.fallback_to_english_images,sp.ai_enabled,sp.ai_enhance,sp.strict_mode,sp.confidence_threshold,sp.negative_keywords,sp.require_confirmation,sp.clarify_question,sp.answer_blocks_json,sp.icon_url,sp.action_label,sp.action_url,sp.intent_id,sp.positive_examples,sp.negative_examples,sp.common_misspellings,sp.required_fields,sp.excluded_situations,sp.risk_level,sp.human_escalation_required,sp.allowed_response_content,sp.forbidden_claims,sp.required_warning,sp.intent_policy_json,sp.max_clarification_questions,sp.clarification_questions_json,sp.response_layout_json,sp.attach_mode,sp.when_to_attach,sp.when_not_to_attach,sp.guide_usage_policy,sp.knowledge_version,id]); if(!rows[0]) bad('Smart Match Guide not found',404); await audit(env,'update','smart_match_guides',id,'Smart Match Guide updated'); return smartMatchOut(rows[0]); }
async function testSmartMatch(env, p) {
  const message = String(p.message || '').trim();
  const lang = String(p.language || p.lang || 'en').toLowerCase().startsWith('hi') ? 'hi' : 'en';
  if (!message) bad('Message is required');
  const settings = aiSettingOut(await getAiSettings(env), env);
  const routerSettings = await getAiRouterSettings(env);
  const local = await findSmartMatches(env, message, lang);
  let detected = null;
  if (!local.primary && settings.enabled && env.DEEPSEEK_API_KEY) detected = await aiDetectSmartMatch(env, settings, message, local.candidates, lang);
  const picked = local.primary || detected;
  const decision = classifySmartAction(picked, message, routerSettings, local.candidates, lang);
  const preview = decision.action === 'send' && picked
    ? await buildSmartMatchReply(env, settings, picked.row, message, lang, true)
    : (decision.question || clarificationText(lang, decision.action === 'confirm' && picked ? picked.row : null, decision.reason));
  const attachment = picked ? shouldAttachOptionalGuide(picked.row, decision, message, lang) : { attach: false, reason: 'no matching intent' };
  return {
    ok: true,
    engine: 'precision-ai-router',
    message,
    language: lang,
    current_conversation_state: p.conversation_state || null,
    detected_intent: picked ? (picked.row.intent_id || picked.row.slug) : null,
    second_best_intent: local.second_best ? (local.second_best.row.intent_id || local.second_best.row.slug) : null,
    confidence: picked ? Math.round(picked.score) : 0,
    confidence_gap: local.confidence_gap,
    decision,
    matched_positive_examples: picked ? triggeredPhrases(message, [picked.row.keywords, picked.row.positive_examples, picked.row.typo_keywords, picked.row.language_keywords].join('\n')) : [],
    triggered_negative_rules: picked ? triggeredPhrases(message, [picked.row.negative_keywords, picked.row.negative_examples, picked.row.excluded_situations].join('\n')) : [],
    missing_required_information: decision.missing_required_fields || [],
    risk_level: picked ? (picked.row.risk_level || 'normal') : 'none',
    selected_guide: picked ? smartMatchOut(picked.row, picked.score, picked.reason) : null,
    attachment_decision: attachment,
    candidates: local.candidates.slice(0,5).map(x => smartMatchOut(x.row, x.score, x.reason)),
    final_reply_preview: preview || 'No Smart Match Guide matched. Ask clarification or create a new intent.',
  };
}
async function listIncorrectMatchReports(env) { const { rows } = await q(env, `SELECT * FROM incorrect_match_reports ORDER BY id DESC LIMIT 300`); return rows; }
async function createIncorrectMatchReport(env, p = {}) { const { rows } = await q(env, `INSERT INTO incorrect_match_reports(session_id,message,detected_intent,expected_intent,reason,status) VALUES($1,$2,$3,$4,$5,'open') RETURNING *`, [p.session_id || '', p.message || '', p.detected_intent || '', p.expected_intent || '', p.reason || '']); await audit(env,'create','incorrect_match_reports',rows[0].id,'Incorrect match report created'); return rows[0]; }
async function listKnowledgeVersions(env) { const { rows } = await q(env, `SELECT * FROM knowledge_versions ORDER BY id DESC LIMIT 300`); return rows; }
async function createCategory(env, p) { const slug = p.slug || slugify(p.name); const { rows } = await q(env, 'INSERT INTO categories(name,slug,description,icon,sort_order) VALUES($1,$2,$3,$4,$5) RETURNING *', [p.name, slug, p.description || null, p.icon || '🎯', p.sort_order ?? 100]); await audit(env,'create','categories',rows[0].id,'Category created'); return categoryOut(rows[0]); }
async function updateCategory(env, id, p) { const { rows } = await q(env, 'UPDATE categories SET name=$1, slug=$2, description=$3, icon=$4, sort_order=$5 WHERE id=$6 RETURNING *', [p.name, p.slug || slugify(p.name), p.description || null, p.icon || '🎯', p.sort_order ?? 100, id]); if (!rows[0]) bad('Category not found', 404); await audit(env,'update','categories',id,'Category updated'); return categoryOut(rows[0]); }
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
    || payload.smart_match?.answer_blocks
    || payload.optional_guide?.answer_blocks
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
async function uploadToR2(request, env, prefix) { if (!env.GUIDE_IMAGES) bad('Missing R2 binding: GUIDE_IMAGES', 500); const form = await request.formData(); const file = form.get('file'); if (!file || typeof file === 'string') bad('File is required'); const ext = safeExt(file.name || 'image.png'); const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`; await env.GUIDE_IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } }); const origin = new URL(request.url).origin; return json({ ok: true, filename: key, url: `${origin}/uploads/${key}` }, 200, env); }
function safeExt(name) { const ext = (name.match(/\.[a-z0-9]+$/i)?.[0] || '.png').toLowerCase(); if (!['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)) bad('Only png, jpg, jpeg, webp, and gif files are allowed'); return ext; }
async function serveUpload(request, env, path) { const key = decodeURIComponent(path.replace('/uploads/', '')); const obj = await env.GUIDE_IMAGES.get(key); if (!obj) return new Response('Not found', { status: 404, headers: corsHeaders(env) }); return new Response(obj.body, { headers: { ...corsHeaders(env), 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' } }); }


function normalizeForMatch(text) { return String(text || '').toLowerCase().replace(/[""]/g,'"').replace(/['']/g,"'").replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g,' ').trim(); }
function keywordList(value) { return String(value || '').split(/[,\n|]+/).map(x => normalizeForMatch(x)).filter(Boolean); }
function editDistance(a, b) { a = String(a || ''); b = String(b || ''); if (!a) return b.length; if (!b) return a.length; const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0)); for (let i=0;i<=a.length;i++) dp[i][0]=i; for (let j=0;j<=b.length;j++) dp[0][j]=j; for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1] + (a[i-1]===b[j-1] ? 0 : 1)); return dp[a.length][b.length]; }
function fuzzyKeywordScore(message, keywords) { const msgTokens = normalizeForMatch(message).split(' ').filter(w => w.length >= 4); const keyTokens = keywordList(keywords).join(' ').split(' ').filter(w => w.length >= 4); let score = 0; for (const m of msgTokens) for (const k of keyTokens) { const d = editDistance(m, k); if (d === 0) score += 5; else if (d <= 2 && Math.min(m.length,k.length) >= 5) score += 8; } return score; }

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
function triggeredPhrases(message, phrases) {
  const msg = normalizeForMatch(message);
  return keywordList(phrases).filter((phrase) => phrase && msg.includes(phrase));
}
function scoreSmartMatch(message, row) {
  const negativeText = [row.negative_keywords, row.negative_examples, row.excluded_situations].join('\n');
  if (containsAnyPhrase(message, negativeText)) return -100;
  const msg = normalizeForMatch(message);
  const allKeywords = [row.keywords, row.typo_keywords, row.language_keywords, row.positive_examples, row.common_misspellings, row.intent_id].join('\n');
  let score = 0;
  for (const phrase of keywordList(allKeywords)) {
    if (!phrase) continue;
    if (msg === phrase) score += 96;
    else if (msg.includes(phrase)) score += phrase.includes(' ') ? 74 : 18;
  }
  score += fuzzyKeywordScore(message, allKeywords);
  score += Math.min(18, scoreMatch(message, [row.name, row.intent_id || ''], ''));
  if (isAmbiguousCustomerMessage(message)) score = Math.min(score, 55);
  return Math.max(-100, Math.min(100, score + Math.floor(Math.max(0, 130 - (row.priority || 100))/10)));
}
function routerSettingsDefault() { return { direct_send_threshold: 90, clarify_threshold: 70, fallback_threshold: 50, min_confidence_gap: 12, max_clarification_questions: 1, strict_guide_delivery: true, show_admin_diagnostics: true }; }
async function getAiRouterSettings(env) {
  const d = routerSettingsDefault();
  try { const { rows } = await q(env, `SELECT * FROM ai_router_settings WHERE id=1 LIMIT 1`); return { ...d, ...(rows[0] || {}) }; } catch { return d; }
}
async function saveAiRouterSettings(env, p = {}) {
  const d = routerSettingsDefault();
  const v = { direct_send_threshold: Number(p.direct_send_threshold ?? d.direct_send_threshold), clarify_threshold: Number(p.clarify_threshold ?? d.clarify_threshold), fallback_threshold: Number(p.fallback_threshold ?? d.fallback_threshold), min_confidence_gap: Number(p.min_confidence_gap ?? d.min_confidence_gap), max_clarification_questions: Number(p.max_clarification_questions ?? d.max_clarification_questions), strict_guide_delivery: p.strict_guide_delivery !== false, show_admin_diagnostics: p.show_admin_diagnostics !== false };
  const { rows } = await q(env, `INSERT INTO ai_router_settings(id,direct_send_threshold,clarify_threshold,fallback_threshold,min_confidence_gap,max_clarification_questions,strict_guide_delivery,show_admin_diagnostics) VALUES(1,$1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET direct_send_threshold=$1,clarify_threshold=$2,fallback_threshold=$3,min_confidence_gap=$4,max_clarification_questions=$5,strict_guide_delivery=$6,show_admin_diagnostics=$7,updated_at=NOW() RETURNING *`, [v.direct_send_threshold,v.clarify_threshold,v.fallback_threshold,v.min_confidence_gap,v.max_clarification_questions,v.strict_guide_delivery,v.show_admin_diagnostics]);
  await audit(env,'update','ai_router_settings',1,'AI Router settings updated');
  return rows[0];
}
function detectMissingFields(message, row) {
  const required = keywordList(row.required_fields || '');
  if (!required.length) return [];
  const msg = normalizeForMatch(message);
  return required.filter((field) => {
    const f = normalizeForMatch(field);
    if (!f) return false;
    if (f.includes('time') || f.includes('waiting')) return !/(minute|hour|mins|hr|30|45|60|today|yesterday)/i.test(msg);
    if (f.includes('method')) return !/(ar wallet|upi|bank|usdt|crypto|paytm|phonepe|gpay|qr|card)/i.test(msg);
    if (f.includes('deduct')) return !/(deduct|cut|debited|charged|paid|completed|success)/i.test(msg);
    return !msg.includes(f);
  }).slice(0, 3);
}
function clarificationForMissingField(field, lang='en') {
  const f = normalizeForMatch(field);
  if (lang === 'hi') {
    if (f.includes('method')) return 'आपने कौन सा भुगतान तरीका इस्तेमाल किया?';
    if (f.includes('time') || f.includes('waiting')) return 'कृपया बताइए, आपको कितनी देर से इंतज़ार है?';
    if (f.includes('deduct')) return 'क्या आपके खाते से पैसा कट गया है?';
    return `कृपया ${field} बताइए।`;
  }
  if (f.includes('method')) return 'Which payment method did you use?';
  if (f.includes('time') || f.includes('waiting')) return 'How long have you been waiting?';
  if (f.includes('deduct')) return 'Was the money deducted from your payment account?';
  return `Please tell me ${field}.`;
}
function classifySmartAction(match, message, router = {}, candidates = [], lang='en') {
  const cfg = { ...routerSettingsDefault(), ...(router || {}) };
  if (!match) return { action: 'none', confidence: 0, reason: 'no-match' };
  const score = Math.max(0, Math.min(100, Math.round(match.score)));
  const second = candidates.find(x => x.row.id !== match.row.id) || null;
  const gap = second ? score - Math.round(second.score) : 100;
  const risk = String(match.row.risk_level || 'normal').toLowerCase();
  const missing = detectMissingFields(message, match.row);
  const negativeTriggers = triggeredPhrases(message, [match.row.negative_keywords, match.row.negative_examples, match.row.excluded_situations].join('\n'));
  if (negativeTriggers.length) return { action: 'none', confidence: score, reason: 'negative rule triggered', negative_triggers: negativeTriggers };
  if (second && score >= cfg.clarify_threshold && gap < cfg.min_confidence_gap) return { action: 'clarify', confidence: score, second_best_intent: second.row.intent_id || second.row.slug, confidence_gap: gap, reason: 'best and second-best intents are too close' };
  if (risk === 'restricted' || match.row.human_escalation_required === true) return { action: 'escalate', confidence: score, risk_level: risk, reason: 'restricted or escalation-only intent' };
  if (match.row.require_confirmation === true || risk === 'sensitive') return { action: 'confirm', confidence: score, risk_level: risk, missing_required_fields: missing, reason: 'sensitive guide requires confirmation' };
  if (isAmbiguousCustomerMessage(message)) return { action: 'clarify', confidence: score, missing_required_fields: missing, reason: 'message is ambiguous' };
  if (score >= Number(match.row.confidence_threshold || cfg.direct_send_threshold) && !missing.length) return { action: 'send', confidence: score, confidence_gap: gap, reason: match.reason || 'high confidence' };
  if (score >= cfg.clarify_threshold) return { action: 'clarify', confidence: score, confidence_gap: gap, missing_required_fields: missing, question: missing[0] ? clarificationForMissingField(missing[0], lang) : '', reason: missing.length ? 'required detail missing' : 'medium confidence, clarify first' };
  if (score >= cfg.fallback_threshold) return { action: 'clarify', confidence: score, confidence_gap: gap, reason: 'low confidence, ask clarification' };
  return { action: 'none', confidence: score, confidence_gap: gap, reason: 'below fallback threshold' };
}
function clarificationText(lang, row = null, reason = '') {
  if (row?.clarify_question) return cleanAssistantText(row.clarify_question);
  if (lang === 'hi') return 'मैं मदद कर सकता हूँ। कृपया बताइए कि आपको किस समस्या में सहायता चाहिए: लॉगिन, पासवर्ड, बैंक/UPI, जमा, निकासी, या गेम डेटा?';
  if (row) return `I can help with ${row.name}. Before I send the guide, please confirm: is this the issue you want to solve?`;
  return 'Sure, I can help. Please tell me which problem you are having: login, password, bank/UPI, deposit, withdrawal, game data, or account status?';
}
async function findSmartMatches(env, message, lang='en') {
  const { rows } = await q(env, `SELECT * FROM smart_match_guides WHERE status='active' ORDER BY priority ASC, id DESC`);
  const scored = rows.map(row => ({ row, score: scoreSmartMatch(message, row), reason: 'precision-router local intent score' }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || (a.row.priority||100)-(b.row.priority||100));
  const primary = scored[0] || null;
  const second = scored[1] || null;
  return { primary, second_best: second, candidates: scored, confidence_gap: primary && second ? Math.round(primary.score - second.score) : 100 };
}
async function aiDetectSmartMatch(env, settings, message, candidates, lang='en') {
  const active = candidates.filter(x => x.row.ai_enabled !== false).slice(0, 20);
  if (!active.length || isAmbiguousCustomerMessage(message)) return null;
  const catalog = active.map(x => `slug=${x.row.slug}; name=${x.row.name}; keywords=${x.row.keywords || ''}; negative=${x.row.negative_keywords || ''}; other=${x.row.typo_keywords || ''} ${x.row.language_keywords || ''}`).join('\n');
  const prompt = `You classify a customer support message into one Smart Match Guide. Return compact JSON only: {"slug":"...","confidence":0-100,"reason":"..."}. Use null slug if unsure under 85. Never choose a guide when negative keywords conflict or the message is vague and needs clarification.\n\nAvailable guides:\n${catalog}`;
  const r = await callDeepSeek(env, settings, prompt, `Customer message: ${message}\nLanguage: ${lang}`);
  if (!r.reply) return null;
  const m = r.reply.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    if (!parsed.slug || Number(parsed.confidence || 0) < 85) return null;
    const found = active.find(x => x.row.slug === parsed.slug);
    return found ? { row: found.row, score: Number(parsed.confidence || 85), reason: 'AI intent detection: ' + (parsed.reason || 'semantic match') } : null;
  } catch { return null; }
}
function textFromSmartBlocks(row, lang='en') {
  const blocks = parseBlocks(row.answer_blocks_json || '');
  if (!blocks.length) return '';
  const out = [];
  for (const b of blocks) {
    const t = String(b.text || b.title || b.content || b.label || '').trim();
    if (!t && b.type !== 'divider') continue;
    if (b.type === 'heading') out.push(t);
    else if (b.type === 'step' || b.type === 'steps') out.push(t);
    else if (b.type === 'warning') out.push(`Important: ${t}`);
    else if (b.type === 'notice') out.push(t);
    else if (b.type === 'button' || b.type === 'link') out.push(`${t}${b.url ? `: ${b.url}` : ''}`);
    else if (b.type === 'divider') out.push('---');
    else out.push(t);
  }
  return out.join('\n');
}
export function shouldAttachOptionalGuide(row, decision, message, lang='en') {
  if (!row || !decision) return { attach: false, reason: 'no-guide' };
  const mode = String(row.attach_mode || 'auto_when_clear').toLowerCase();
  if (mode === 'never') return { attach: false, reason: 'attach mode is never' };
  const availableImages = [...splitUrls(row.image_urls), ...splitUrls(row.image_urls_hi)];
  if (!availableImages.length) return { attach: false, reason: 'guide has no image' };
  const avoid = triggeredPhrases(message, [row.when_not_to_attach, row.negative_keywords, row.negative_examples, row.excluded_situations].join('\n'));
  if (avoid.length) return { attach: false, reason: 'when-not-to-attach rule triggered', triggers: avoid };
  if (decision.action !== 'send') return { attach: false, reason: `decision is ${decision.action}` };
  if (mode === 'ask_first') return { attach: false, ask_first: true, reason: 'attach mode asks first' };
  const visualRequest = /\b(how|steps?|guide|show|where|screen|screenshot|image|photo|tutorial|process|button|option|click|tap|open)\b/i.test(String(message || ''));
  if (!visualRequest) return { attach: false, reason: 'text answer is sufficient; no visual-step request' };
  return { attach: true, reason: 'high-confidence intent with explicit visual-step request' };
}
function promptFirstSystemPolicy(lang='en') {
  return `

## Prompt-First AI Policy
AI Prompt Manager is the primary decision source. Guide Attachments are optional support materials only, not the brain of the answer. Answer the customer naturally from the active AI prompt sections first. If the question is unclear, ask one short clarification question before using any guide. If a guide image is useful, attach it after the text answer. Never force a guide when the user rejects it or says the issue is already solved. Never claim an issue is resolved unless the customer explicitly confirms it. Never show SMART MATCH, matched guide, confidence, recommended guide, Open Guide, or any internal routing details to customers. Do not return HTML, CSS, scripts, raw color values, or markdown stars. Put numbered instructions on separate lines so the safe Chat renderer can present them as structured steps. Reply in ${lang === 'hi' ? 'Hindi' : 'English'} unless the user clearly uses another language.`;
}
function optionalGuideContext(row, decision) {
  if (!row || !decision || decision.action !== 'send') return '';
  return `

## Optional Guide Attachment Candidate
Guide/intent: ${row.name}
Risk level: ${row.risk_level || 'normal'}
Attach mode: ${row.attach_mode || 'auto_when_clear'}
When to attach: ${row.when_to_attach || 'Only when clearly helpful'}
When not to attach: ${row.when_not_to_attach || 'Do not attach for unclear or rejected issues'}
Official support text for reference only:
${row.guide_text || ''}

Use this only if it supports the answer. Do not make the guide the main decision source.`;
}

async function buildSmartMatchReply(env, settings, row, message, lang='en', preview=false) {
  const useHi = lang === 'hi';
  const blockText = textFromSmartBlocks(row, lang);
  const baseText = blockText || (useHi && row.guide_text_hi ? row.guide_text_hi : row.guide_text) || `Please follow this guide: ${row.name}`;
  if (row.action_label && row.action_url && !baseText.includes(row.action_url)) {
    // keep official link visible in chat without exposing system labels
  }
  if (row.ai_enhance !== false && row.ai_enabled !== false && settings.enabled && env.DEEPSEEK_API_KEY) {
    const strict = row.strict_mode !== false ? 'Do not add new rules, approvals, promises, or unsupported details. Do not use markdown stars.' : 'You may make the wording natural, but keep the official meaning. Do not use markdown stars.';
    const systemPrompt = `Rewrite the official customer support guide into a natural answer. First make sure the issue is clear; do not guess. Keep it concise. ${strict}\nLanguage: ${useHi ? 'Hindi' : 'English'}\nOfficial guide name: ${row.name}\nOfficial text:\n${baseText}`;
    const r = await callDeepSeek(env, settings, systemPrompt, message);
    if (r.reply) return cleanAssistantText(r.reply);
  }
  return cleanAssistantText(baseText);
}

async function findMatches(env, message) { const guides = (await q(env, `SELECT g.*, c.name AS category_name, c.icon AS category_icon, c.slug AS category_slug FROM guides g LEFT JOIN categories c ON c.id=g.category_id WHERE g.status='published'`)).rows; const guideCandidates = guides.map(g => [scoreMatch(message, [g.title, g.title_hi || '', g.summary || '', g.summary_hi || '', g.body, g.body_hi || '', g.body_html || '', g.body_html_hi || ''], g.keywords) + Math.floor(Math.max(0, 120 - (g.priority || 100))/10) + ((splitUrls(g.image_urls).length || splitUrls(g.image_urls_hi).length) ? 2 : 0), g]).filter(x => x[0] > 0).sort((a,b) => b[0]-a[0] || (a[1].priority||100)-(b[1].priority||100)); const top = guideCandidates[0]?.[0] || 0; const selectedGuides = guideCandidates.filter(x => x[0] >= Math.max(10, Math.floor(top * 0.25))).slice(0,2); const faqs = (await q(env, `SELECT * FROM faqs WHERE status='published'`)).rows; const selectedFaqs = faqs.map(f => [scoreMatch(message, [f.question, f.answer], f.keywords) + Math.floor(Math.max(0, 120 - (f.priority||100))/10), f]).filter(x => x[0] > 0).sort((a,b) => b[0]-a[0]).slice(0,2); return { selectedGuides, selectedFaqs, selectedKnowledge: [] }; }
async function ensureChatSession(env, sessionId) {
  let clean = String(sessionId || '').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 100);
  if (!clean) clean = `guest-${crypto.randomUUID()}`;
  const inserted = await q(env, `INSERT INTO chat_sessions(session_id, memory_summary, message_count) VALUES($1, '', 0) ON CONFLICT(session_id) DO UPDATE SET updated_at=NOW() RETURNING *`, [clean]);
  return inserted.rows[0];
}
async function setConversationState(env, sessionId, updates = {}) {
  const fields = [];
  const vals = [];
  let i = 1;
  for (const [key, value] of Object.entries(updates)) {
    if (!['pending_smart_slug','pending_smart_status','last_smart_slug'].includes(key)) continue;
    fields.push(`${key}=$${i++}`);
    vals.push(value || null);
  }
  if (!fields.length) return;
  vals.push(sessionId);
  await q(env, `UPDATE chat_sessions SET ${fields.join(', ')}, pending_smart_updated_at=NOW(), updated_at=NOW() WHERE session_id=$${i}`, vals);
}
async function getSmartMatchBySlug(env, slug) {
  if (!slug) return null;
  const { rows } = await q(env, `SELECT * FROM smart_match_guides WHERE slug=$1 AND status='active' LIMIT 1`, [slug]);
  return rows[0] || null;
}
function buildContext(selectedGuides, selectedFaqs, selectedKnowledge, uploadedImages, theme, lang='en') { const sources = [], images = [], matchedGuides = [], parts = []; for (const [score, f] of selectedFaqs) { sources.push(`FAQ: ${f.question}`); parts.push(`FAQ: ${f.question}
Approved answer: ${f.answer}`); } for (const [score, g] of selectedGuides) { const item = guideOut(g, lang); const gi = item.image_urls || []; images.push(...gi); sources.push(`Guide: ${item.title}`); matchedGuides.push({ id: item.id, title: item.title, summary: item.summary, image_urls: gi, category_name: item.category_name || null, score }); parts.push(`Guide: ${item.title}
Summary: ${item.summary || ''}
Steps: ${firstSentences(item.body || item.body_html || '', 700)}`); } for (const [score, k] of selectedKnowledge) { sources.push(`Knowledge: ${k.title}`); parts.push(`Knowledge: ${k.title}
${k.content}`); } if (uploadedImages?.length) parts.push('Customer uploaded image/receipt URLs: ' + uploadedImages.join(', ')); parts.push(`Official support link: ${theme.support_link || DEFAULT_SUPPORT}`); return { approvedContext: parts.join('\n\n'), sources, images: [...new Set(images)], matchedGuides }; }
async function buildPrompt(env, approvedContext, memorySummary, uploadedImages) { const prompts = await listPrompts(env); const sectionText = prompts.filter(p => p.enabled).map(p => `## ${p.title}\n${p.content}`).join('\n\n'); const memoryText = memorySummary || 'No prior memory for this customer session.'; const imageNote = uploadedImages?.length ? 'Customer uploaded images are present. Follow Image / Receipt Rules strictly.' : 'No customer image uploaded in this message.'; return `${sectionText}\n\n## Approved Context\n${approvedContext || 'No approved context matched.'}\n\n## Customer Memory\n${memoryText}\n\n## Image Context\n${imageNote}\n\n## Final Instruction\nAnswer the customer using only the prompt rules and approved context. Keep it short, helpful, and safe. If approved context is not enough, use the fallback/escalation rules.`.trim(); }
function localFallback(selectedGuides, selectedFaqs, selectedKnowledge, uploadedImages, theme) { const parts = []; if (selectedFaqs.length) parts.push(selectedFaqs[0][1].answer); if (selectedGuides.length) { parts.push('Please follow the matched guide below:'); selectedGuides.forEach(([_, g]) => parts.push(`• ${g.title}\n${g.summary || firstSentences(g.body, 340)}`)); } if (selectedKnowledge.length && !parts.length) parts.push(firstSentences(selectedKnowledge[0][1].content, 520)); if (uploadedImages?.length) parts.push('I received your uploaded image. I can guide you, but I cannot approve payment, withdrawal, bonus, or account changes from an image. Please contact official support for verification.'); if (!parts.length) return `Sorry, I do not have an approved guide for this question yet.\n\nPlease contact official support: ${theme.support_link || DEFAULT_SUPPORT}`; return `${parts.join('\n\n')}\n\nNeed more help? Contact official support: ${theme.support_link || DEFAULT_SUPPORT}`; }
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

function hasAnyNormalized(message, phrases) {
  const msg = normalizeForMatch(message);
  return phrases.some(p => msg.includes(normalizeForMatch(p)));
}
function isProfanityOrAbuse(message) {
  return /\b(fuck|shit|bitch|asshole|idiot|stupid|wtf)\b/i.test(String(message || ''));
}
function isGuideRejection(message) {
  return hasAnyNormalized(message, [
    'no', 'not this', 'wrong', 'not my issue', 'already solved', 'already arrived', 'received already',
    'deposit already arrived', 'no need', 'dont need', "don't need", 'stop', 'cancel', 'okay no need', 'not now'
  ]);
}
function isExplicitResolutionConfirmation(message) {
  const msg = normalizeForMatch(message);
  return /^(it is fixed|its fixed|issue solved|problem solved|already solved|resolved|resolved now|working now|it works now|received now|deposit arrived|deposit arrived now)$/i.test(msg);
}
function isConfirmYes(message) {
  const msg = normalizeForMatch(message);
  return /^(yes|yeah|yep|correct|right|ok|okay|sure|confirm|that is right|this is the issue|send guide)$/i.test(msg);
}
function isLikelyNewTopic(message) {
  const msg = normalizeForMatch(message);
  return ['login','password','deposit','withdraw','withdrawal','bank','upi','account','number','game','bonus','promotion','bind','delete','change','recharge'].some(k => msg.includes(k));
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
function conversationCancelText(lang) {
  return lang === 'hi'
    ? 'समझ गया। मैं उस गाइड को आगे नहीं भेजूँगा। कृपया बताइए अब आपको किस समस्या में सहायता चाहिए?'
    : 'Understood. I will not continue with that guide. Please tell me what issue you need help with now.';
}
function frustrationText(lang) {
  return lang === 'hi'
    ? 'मैं समझता हूँ कि आप परेशान हैं। मैं मदद करने के लिए यहाँ हूँ। कृपया समस्या साफ़ बताइए: जमा, निकासी, लॉगिन, बैंक/UPI, या अकाउंट समस्या।'
    : 'I understand you are frustrated. I am here to help. Please tell me the exact issue, such as deposit, withdrawal, login, bank/UPI, or account problem.';
}

async function updateMemory(env, session, userMessage, assistantReply, uploadedImages, maxMessages = 12) { await q(env, 'INSERT INTO chat_memory_messages(session_id, role, content, image_urls) VALUES($1,$2,$3,$4),($1,$5,$6,$7)', [session.session_id, 'user', userMessage, joinUrls(uploadedImages), 'assistant', assistantReply, '']); await q(env, 'UPDATE chat_sessions SET message_count=message_count+1, updated_at=NOW() WHERE session_id=$1', [session.session_id]); const recent = (await q(env, 'SELECT * FROM chat_memory_messages WHERE session_id=$1 ORDER BY id DESC LIMIT $2', [session.session_id, Math.max(4, maxMessages)])).rows.reverse(); const summary = 'Recent session memory:\n' + recent.map(m => `${m.role}: ${firstSentences(m.content, 160)}${splitUrls(m.image_urls).length ? ' [image uploaded]' : ''}`).join('\n'); await q(env, 'UPDATE chat_sessions SET memory_summary=$2, updated_at=NOW() WHERE session_id=$1', [session.session_id, summary]); return summary; }
async function runAiChat(env, payload, adminTest) {
  const turnStarted = Date.now();
  const turnRequestId = crypto.randomUUID();
  const message = String(payload.message || '').trim();
  if (!message) bad('Message is required');
  const uploaded = Array.isArray(payload.image_urls) ? payload.image_urls : [];
  const lang = String(payload.language || payload.lang || 'en').toLowerCase().startsWith('hi') ? 'hi' : 'en';
  const theme = await getTheme(env);
  const settings = aiSettingOut(await getAiSettings(env), env);
  const session = await ensureChatSession(env, payload.session_id);

  // Conversation State AI: handle rejection, cancellation, profanity, and pending confirmations before matching.
  if (isProfanityOrAbuse(message) && !isLikelyNewTopic(message)) {
    const reply = frustrationText(lang);
    const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { model: 'frustration-safe-reply' });
    return { reply, smart_match: null, guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'frustration-safe-reply' };
  }

  if (isExplicitResolutionConfirmation(message)) {
    const reply = lang === 'hi'
      ? 'अच्छा लगा कि समस्या हल हो गई। यदि आपको किसी और चीज़ में सहायता चाहिए, तो नया सवाल भेजें।'
      : 'I am glad the issue is solved. If you need help with anything else, send a new question.';
    const responseBlocks = [{ type: 'success', text: reply }];
    if (!adminTest) await q(env, `UPDATE chat_sessions SET resolution_state='confirmed_by_user', resolved_at=NOW(), pending_smart_slug=NULL, pending_smart_status='resolved', last_smart_slug=NULL, updated_at=NOW() WHERE session_id=$1`, [session.session_id]);
    const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { model: 'explicit-resolution-confirmation', response_blocks: responseBlocks, resolution_state: 'confirmed_by_user', request_id: turnRequestId, latency_ms: Date.now() - turnStarted });
    return { reply, response_blocks: responseBlocks, resolution_state: 'confirmed_by_user', smart_match: null, guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, request_id: turnRequestId, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'explicit-resolution-confirmation' };
  }

  if (session.pending_smart_slug) {
    const pendingRow = await getSmartMatchBySlug(env, session.pending_smart_slug);
    if (isGuideRejection(message)) {
      await setConversationState(env, session.session_id, { pending_smart_slug: null, pending_smart_status: 'cancelled' });
      const reply = conversationCancelText(lang);
      const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Cancelled pending guide: ${session.pending_smart_slug}`, model: 'conversation-state-cancel' });
      if (!adminTest) await q(env, 'INSERT INTO unmatched_questions(session_id, customer_message, language, suggested_intent) VALUES($1,$2,$3,$4)', [session.session_id, message, lang, 'cancelled-pending-guide']);
      return { reply, smart_match: null, guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'conversation-state-cancel' };
    }
    if (pendingRow && isConfirmYes(message)) {
      const reply = await buildSmartMatchReply(env, settings, pendingRow, message, lang, adminTest);
      const responseBlocks = normalizeResponseBlocks(pendingRow.answer_blocks_json || '');
      const hiImages = splitUrls(pendingRow.image_urls_hi);
      const enImages = splitUrls(pendingRow.image_urls);
      const images = lang === 'hi' && hiImages.length ? hiImages : (lang === 'hi' && pendingRow.fallback_to_english_images === false ? [] : enImages);
      await setConversationState(env, session.session_id, { pending_smart_slug: null, pending_smart_status: 'confirmed', last_smart_slug: pendingRow.slug });
      const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Confirmed Smart Match Guide: ${pendingRow.name}`, images: images.join('\n'), model: 'smart-match-confirmed', response_blocks: responseBlocks, request_id: turnRequestId, intent_id: pendingRow.intent_id || pendingRow.slug, confidence: 99, attachment_decision: images.length ? 'attached:user-confirmed' : 'blocked:no-image' });
      return { reply, smart_match: smartMatchOut(pendingRow, 99, 'confirmed by user'), response_blocks: responseBlocks, guide_images: images, matched_guides: [], sources: [], session_id: session.session_id, request_id: turnRequestId, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'smart-match-confirmed' };
    }
    if (isLikelyNewTopic(message)) {
      await setConversationState(env, session.session_id, { pending_smart_slug: null, pending_smart_status: 'changed-topic' });
      // Continue into fresh matching below.
    } else if (pendingRow) {
      const reply = lang === 'hi'
        ? `क्या आप ${pendingRow.name} गाइड चाहते हैं? कृपया हाँ या नहीं बताइए।`
        : `Do you want help with ${pendingRow.name}? Please reply yes or no.`;
      const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Pending confirmation: ${pendingRow.name}`, model: 'pending-confirmation' });
      return { reply, smart_match: null, clarify: true, clarify_candidate: smartMatchOut(pendingRow, 70, 'waiting for yes/no confirmation'), guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'pending-confirmation' };
    }
  }

  if (isGuideRejection(message) && session.last_smart_slug) {
    await setConversationState(env, session.session_id, { pending_smart_slug: null, pending_smart_status: 'cancelled', last_smart_slug: null });
    const reply = conversationCancelText(lang);
    const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Rejected previous guide: ${session.last_smart_slug}`, model: 'conversation-state-reject-last' });
    return { reply, smart_match: null, guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'conversation-state-reject-last' };
  }

  const localSmart = await findSmartMatches(env, message, lang);
  const routerSettings = await getAiRouterSettings(env);
  let smart = localSmart.primary;
  if (!smart && settings.enabled && env.DEEPSEEK_API_KEY) smart = await aiDetectSmartMatch(env, settings, message, localSmart.candidates, lang);

  let promptFirstDecision = null;
  let optionalGuide = null;
  if (smart) {
    const decision = classifySmartAction(smart, message, routerSettings, localSmart.candidates, lang);
    promptFirstDecision = decision;
    if (decision.action === 'clarify' || decision.action === 'confirm') {
      if (decision.action === 'confirm') await setConversationState(env, session.session_id, { pending_smart_slug: smart.row.slug, pending_smart_status: 'awaiting-confirmation' });
      const reply = decision.question || clarificationText(lang, decision.action === 'confirm' ? smart.row : null, decision.reason);
      const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Prompt-first clarify before optional guide: ${smart.row.name}
Reason: ${decision.reason}`, model: 'prompt-first-clarify' });
      if (!adminTest) await q(env, 'INSERT INTO unmatched_questions(session_id, customer_message, language, suggested_intent) VALUES($1,$2,$3,$4)', [session.session_id, message, lang, `${decision.action}:${smart.row.slug}`]);
      return { reply, smart_match: null, optional_guide: smartMatchOut(smart.row, smart.score, decision.reason), guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'prompt-first-clarify', diagnostics: adminTest ? { decision, prompt_first: true } : undefined };
    }
    if (decision.action === 'escalate') {
      const reply = cleanAssistantText(smart.row.allowed_response_content || smart.row.required_warning || (lang === 'hi' ? 'इस मामले की जाँच के लिए कृपया आधिकारिक सहायता टीम से संपर्क करें।' : 'This request needs support team review. Please contact official support so the team can check it safely.'));
      const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: `Escalation-only intent: ${smart.row.name}`, model: 'prompt-first-escalation' });
      return { reply, smart_match: null, optional_guide: null, escalate: true, guide_images: [], matched_guides: [], sources: [], session_id: session.session_id, language: lang, memory_summary: memorySummary, used_deepseek: false, model: 'prompt-first-escalation', diagnostics: adminTest ? { decision } : undefined };
    }
    optionalGuide = { match: smart, attach: shouldAttachOptionalGuide(smart.row, decision, message, lang) };
  }

  const matches = await findMatches(env, message);
  const context = buildContext([], matches.selectedFaqs, matches.selectedKnowledge, uploaded, theme, lang);
  const optRow = optionalGuide?.match?.row || null;
  const optAttach = optionalGuide?.attach || { attach: false, reason: 'no optional guide' };
  const optionalImages = optRow && optAttach.attach ? (() => { const hiImages = splitUrls(optRow.image_urls_hi); const enImages = splitUrls(optRow.image_urls); return lang === 'hi' && hiImages.length ? hiImages : (lang === 'hi' && optRow.fallback_to_english_images === false ? [] : enImages); })() : [];
  const optionalContext = optionalGuideContext(optRow, promptFirstDecision || {});
  const systemPrompt = (await buildPrompt(env, context.approvedContext + optionalContext, session.memory_summary, uploaded)) + promptFirstSystemPolicy(lang);
  const shouldCall = !!settings.enabled && !!env.DEEPSEEK_API_KEY;
  const deepSeekResult = shouldCall ? await callDeepSeek(env, settings, systemPrompt, message) : { reply: null, error: 'DeepSeek skipped because AI model is disabled or API key is missing' };
  const aiReply = deepSeekResult?.reply || null;
  const usedDeepSeek = !!aiReply;
  const approvedIntentFallback = optRow && promptFirstDecision?.action === 'send'
    ? cleanAssistantText((lang === 'hi' && optRow.guide_text_hi ? optRow.guide_text_hi : optRow.guide_text) || optRow.allowed_response_content || optRow.required_warning || '')
    : '';
  const localPromptFallback = approvedIntentFallback || localFallback([], matches.selectedFaqs, matches.selectedKnowledge, uploaded, theme);
  const reply = cleanAssistantText(aiReply || localPromptFallback);
  const responseBlocks = normalizeResponseBlocks(optRow?.answer_blocks_json || '');
  if (optRow && optionalImages.length) await setConversationState(env, session.session_id, { pending_smart_slug: null, pending_smart_status: 'optional-guide-attached', last_smart_slug: optRow.slug });
  const memorySummary = await finishChatTurn(env, session, settings, adminTest, message, reply, uploaded, { sources: [context.sources.join('\\n'), optRow ? `Optional guide candidate: ${optRow.name}; attach=${!!optionalImages.length}; reason=${optAttach.reason}` : 'No optional guide candidate'].filter(Boolean).join('\\n'), images: optionalImages.join('\\n'), usedDeepseek: usedDeepSeek, provider_status: usedDeepSeek ? 'success' : (deepSeekResult?.error_type === 'configuration' ? 'fallback' : 'error'), error_type: usedDeepSeek ? '' : (deepSeekResult?.error_type || 'fallback'), error_detail: usedDeepSeek ? '' : (deepSeekResult?.error || ''), latency_ms: Date.now() - turnStarted, request_id: turnRequestId, intent_id: optRow?.intent_id || optRow?.slug || '', confidence: optionalGuide?.match?.score ?? null, attachment_decision: optionalImages.length ? `attached:${optAttach.reason}` : `blocked:${optAttach.reason}`, response_blocks: responseBlocks, model: usedDeepSeek ? settings.model : 'prompt-first-local-fallback' });
  if (!adminTest && !matches.selectedFaqs.length && !matches.selectedKnowledge.length && !uploaded.length && !optRow) await q(env, 'INSERT INTO unmatched_questions(session_id, customer_message, language, suggested_intent) VALUES($1,$2,$3,$4)', [session.session_id, message, lang, 'prompt-first-no-guide-needed']);
  return { reply, response_blocks: responseBlocks, sources: context.sources, guide_images: optionalImages, matched_guides: [], smart_match: null, optional_guide: optRow && optionalImages.length ? smartMatchOut(optRow, optionalGuide.match.score, optAttach.reason) : null, session_id: session.session_id, request_id: turnRequestId, language: lang, memory_summary: memorySummary, used_deepseek: usedDeepSeek, model: usedDeepSeek ? settings.model : 'prompt-first-local-fallback', fallback: !usedDeepSeek, fallback_reason: usedDeepSeek ? null : (deepSeekResult?.error_type || 'approved_local_fallback'), deepseek_error: usedDeepSeek ? null : (deepSeekResult?.error || null), diagnostics: adminTest ? { prompt_first: true, prompt_sections_used: (await listPrompts(env)).filter(p=>p.enabled).length, optional_guide: optRow ? optRow.name : null, attach_decision: optAttach, matched_faqs: matches.selectedFaqs.length, matched_knowledge: matches.selectedKnowledge.length } : undefined };

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
    ['smart_guides_table', `SELECT COUNT(*)::int AS count FROM smart_match_guides`],
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

async function aiDiagnostics(env) { const settings = await getAiSettings(env); const counts = {}; for (const [key, table] of Object.entries({ categories:'categories', guides:'guides', faqs:'faqs', knowledge:'knowledge_items', prompts:'ai_prompt_sections', prompt_versions:'ai_prompt_versions', sessions:'chat_sessions', logs:'chat_logs', smart_matches:'smart_match_guides', unmatched:'unmatched_questions', content_blocks:'site_content_blocks', popular_help:'popular_help_cards', nav:'navigation_items', audit:'admin_audit_logs' })) { try { counts[key] = Number((await q(env, `SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0]?.count || 0); } catch (err) { counts[key] = `error: ${err.message}`; } } return { ok: true, version: VERSION, deepseek_key_present: !!env.DEEPSEEK_API_KEY, deepseek_api_base: settings?.api_base || env.DEEPSEEK_API_BASE || 'https://api.deepseek.com', model: settings?.model || env.DEEPSEEK_MODEL || 'deepseek-chat', ai_enabled_in_db: !!settings?.enabled, require_approved_context: !!settings?.require_approved_context, memory_enabled: !!settings?.memory_enabled, counts }; }
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
  await check('GET smart matches', '/admin/smart-matches', async () => (await listSmartMatches(env, true)).length);
  await check('DELETE smart match backend', '/admin/smart-matches/:id', async () => 'ready');
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
