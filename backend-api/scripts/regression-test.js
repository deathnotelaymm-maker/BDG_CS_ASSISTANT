import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) =>
  checks.push({ name, ok: Boolean(condition) });

const core = read("backend-api/src/core.js");
const adminApi = read("admin-pro/src/lib/api.ts");
const chatLogs = read("admin-pro/src/routes/_admin.chat-logs.tsx");
const theme = read("admin-pro/src/routes/_admin.theme-settings.tsx");
const migration = read(
  "backend-api/migrations/002_v0.7.1_admin_stability_reliable_fallback.sql",
);
const migration080 = read(
  "backend-api/migrations/003_v0.8.0_structured_rich_responses_precision_guide_delivery.sql",
);
const migration090 = read(
  "backend-api/migrations/004_v0.9.0_prompt_first_ai_content_studio.sql",
);
const migration010 = read("backend-api/migrations/005_v0.10.0_ai_knowledge_orchestrator_visual_guide_studio.sql");
const migration011 = read("backend-api/migrations/006_v0.11.0_advanced_ai_knowledge_import_multi_platform_router.sql");
const migration100 = read("backend-api/migrations/007_v1.0.0_tenant_core_platform_control_center.sql");
const migration101 = read("backend-api/migrations/008_v1.0.1_automatic_platform_access_links.sql");
const migration110 = read("backend-api/migrations/009_v1.1.0_tenant_data_isolation_platform_scoped_admin.sql");
const migration120a = read("backend-api/migrations/011_v1.2.0a_safe_bootstrap_deduplication_repair.sql");
const migration120a2 = read("backend-api/migrations/012_v1.2.0a2_scoped_backfill_conflict_repair.sql");
const migration120a4 = read("backend-api/migrations/013_v1.2.0a4_safe_active_platform_bootstrap_repair.sql");
const migration121 = read("backend-api/migrations/014_v1.2.1_platform_context_no_fallback_repair.sql");
const migration130 = read("backend-api/migrations/015_v1.3.0_chat_start_module_experience_studio.sql");
const actionButtons = read("admin-pro/src/routes/_admin.action-buttons.tsx");
const guideStudio = read("admin-pro/src/routes/_admin.guide-images.tsx");
const promptHistory = read("admin-pro/src/routes/_admin.prompt-history.tsx");
const siteContent = read("admin-pro/src/routes/_admin.site-content.tsx");
const adminLayout = read("admin-pro/src/components/AdminLayout.tsx");
const aiContentStudio = read("admin-pro/src/routes/_admin.ai-content-studio.tsx");
const promptManager = read("admin-pro/src/routes/_admin.ai-prompt-manager.tsx");
const categoryAdmin = read("admin-pro/src/routes/_admin.categories.tsx");
const chatApp = read("chat-pro/src/App.tsx");
const chatLightbox = read("chat-pro/src/components/ImageLightbox.tsx");
const guideLightbox = read("guide-pro/src/components/public/GuideImageLightbox.tsx");
const faqAdmin = read("admin-pro/src/routes/_admin.faq.tsx");
const diagnosticsAdmin = read("admin-pro/src/routes/_admin.ai-diagnostics.tsx");
const importAdmin = read("admin-pro/src/routes/_admin.ai-knowledge-import.tsx");
const platformControlCenter = read("admin-pro/src/routes/_admin.platform-control-center.tsx");
const adminRouter = read("admin-pro/src/router.tsx");
const chatApi = read("chat-pro/src/lib/api.ts");
const knowledgeImportModule = read("backend-api/src/knowledge-import.js");
const guideApi = read("guide-pro/src/lib/api.ts");
const guideLayout = read("guide-pro/src/components/public/PublicLayout.tsx");
const guideIndex = read("guide-pro/src/routes/_public.index.tsx");
const guideList = read("guide-pro/src/routes/_public.guides.tsx");
const guideDetail = read("guide-pro/src/routes/_public.guides.$slug.tsx");
const guideFaq = read("guide-pro/src/routes/_public.faq.tsx");
const chatConfig = read("chat-pro/src/lib/chat-config.ts");
const server = read("backend-api/src/server.js");
const deployScript = read("DEPLOY-V0.10.1-PRODUCTION-WINDOWS.ps1");
const verifyScript = read("VERIFY-V0.10.1-WINDOWS.ps1");

expect(
  "Site Content uses block_key as editable id",
  /id:\s*b\.block_key/.test(adminApi),
);
expect(
  "Chat Logs uses API response fields",
  chatLogs.includes("customer_message") && chatLogs.includes("assistant_reply"),
);
expect("Chat Logs has no create action", !chatLogs.includes("New session"));
expect(
  "Theme includes all persisted chat fields",
  [
    "chat_welcome_title",
    "chat_welcome_subtitle",
    "chat_input_placeholder",
  ].every((x) => theme.includes(x)),
);
expect(
  "Theme backend preserves omitted values",
  core.includes("p.chat_welcome_title ?? current.chat_welcome_title"),
);
expect(
  "DeepSeek retries temporary failures",
  core.includes("attempt <= maxAttempts") && core.includes("res.status === 429 || res.status >= 500"),
);
expect(
  "AI provider failures record technical diagnostics",
  core.includes("provider_status") &&
    core.includes("error_type") &&
    core.includes("attachment_decision"),
);
expect("AI Content test uses AI semantic judgment", core.includes("judgeAiContentWithModel") && core.includes("backend_keyword_scoring: false"));
expect(
  "System health endpoint is authenticated",
  core.includes("path === '/admin/system-health'"),
);
expect(
  "v0.7.1 migration is idempotent",
  migration.includes("IF NOT EXISTS") && migration.includes("ON CONFLICT"),
);
expect(
  "Support Settings removed from Admin navigation",
  !adminLayout.includes("Support Settings"),
);
expect(
  "Fake Admin header indicators removed",
  ["Alerts", "Active users", "System normal"].every(
    (x) => !adminLayout.includes(x),
  ),
);
expect(
  "Chat Logs foregrounds exact customer question",
  chatLogs.includes("User asked") && chatLogs.includes("row.customer_message"),
);
expect(
  "Structured response renderer is enabled",
  chatApp.includes("StructuredResponse") && chatApp.includes("response_blocks"),
);
expect(
  "Guide content bypasses browser cache",
  guideApi.includes('cache: "no-store"'),
);
expect(
  "Guide content bypasses backend cache",
  server.includes("path === '/guide/content'") &&
    server.includes("headers['cache-control'] = 'no-store'"),
);
expect(
  "v0.8.0 migration is idempotent",
  migration080.includes("IF NOT EXISTS") &&
    migration080.includes("ON CONFLICT"),
);
expect(
  "v0.9.0 migration is idempotent",
  migration090.includes("IF NOT EXISTS") &&
    migration090.includes("ON CONFLICT") &&
    migration090.includes("to_regclass('public.smart_match_guides')") &&
    migration090.includes("archived"),
);
expect(
  "Guide Attachments are removed from active Admin and API routes",
  !adminLayout.includes("Guide Attachments") &&
    !core.includes("path === '/admin/smart-matches'") &&
    !adminApi.includes("/admin/smart-matches"),
);
expect(
  "AI Content Studio contains the visual editor and routing safety test",
  aiContentStudio.includes("RichKnowledgeEditor") &&
    aiContentStudio.includes("AI Knowledge Orchestrator") &&
    aiContentStudio.includes("New AI Prompt & Image"),
);
expect(
  "Prompt Manager exposes audited delete",
  promptManager.includes("Delete this prompt section") && core.includes("async function deletePrompt"),
);
expect(
  "Category Admin supports custom icon uploads",
  categoryAdmin.includes("Custom topic icon") && core.includes("icon_url"),
);
expect(
  "Chat runtime has no business fallback path",
  core.includes("technicalUnavailableText") &&
    !core.slice(core.indexOf("async function runAiChat"), core.indexOf("function randomBase32Secret")).includes("localFallback"),
);
expect("Chat decisions are persisted for diagnostics", core.includes("decision_json") && core.includes("desired_outcome"));
expect(
  "Rich response URLs are allowlisted",
  core.includes("safeResponseUrl") && core.includes("/^https?:\\/\\//i"),
);
expect("v0.10.0 migration is idempotent", migration010.includes("IF NOT EXISTS") && migration010.includes("ON CONFLICT"));
expect("AI routing has no backend AI Content scorer", !core.includes("findAiContentMatch") && !core.includes("scoreAiContent"));
expect("English and Hindi visual knowledge are editable", aiContentStudio.includes("Hindi / Indian Visual Knowledge") && aiContentStudio.includes("rich_json_hi"));
expect("Guide uses the visual knowledge editor", guideStudio.includes("Multilingual Visual Guide Studio") && guideStudio.includes("RichKnowledgeEditor"));
expect("Reusable action buttons are configurable", actionButtons.includes("Buttons Configuration") && core.includes("/admin/action-buttons"));
expect("Site Content uses durable deletion", core.includes("site_content_tombstones") && siteContent.includes("durable deletion"));
expect(
  "Site Content bootstrap uses consistent PostgreSQL parameter types",
  core.includes("$1::varchar(100)") &&
    core.includes("block_key=$1::varchar(100)"),
);
expect(
  "Windows deployment avoids the reserved Host variable",
  deployScript.includes("$ApiHost=") && !deployScript.includes("$host="),
);
expect(
  "Live verifier follows dynamically imported JavaScript chunks",
  verifyScript.includes("System.Collections.Queue") &&
    verifyScript.includes("Get-LiveJavaScript") &&
    verifyScript.includes("JavaScript chunks checked"),
);
expect(
  "GitHub release workflow deploys main and verifies the public Pages production URLs",
  read(".github/workflows/bdg-production-release.yml").includes("--branch main") &&
    read("scripts/ci/verify-live-pages.mjs").includes("https://bdg-chat-pages.pages.dev"),
);
expect("Unified version history is visible and restorable", promptHistory.includes("restoreContentVersion") && promptHistory.includes("restorePromptVersion"));
expect("Decimal AI confidence is normalized to integer percent", core.includes("normalizeConfidencePercent") && core.includes("parsed * 100") && core.includes("Math.round(percent)"));
expect("Chat logging cannot destroy a successful AI response", core.includes("event:'chat_log_write_failed'") && core.includes("try {\n      await q(env, 'INSERT INTO chat_logs"));
expect("Admin FAQ exposes the persisted answer", faqAdmin.includes('name: "answer"') && faqAdmin.includes("FAQ answer") && faqAdmin.includes("keywords"));
expect("Chat and Guide provide mobile image viewers", chatLightbox.includes('role="dialog"') && guideLightbox.includes('role="dialog"') && chatApp.includes("onPreview"));
expect("AI Diagnostics exposes recent failures and request IDs", core.includes("recent_errors") && diagnosticsAdmin.includes("Recent AI Errors & Fallbacks") && diagnosticsAdmin.includes("Request ID"));
expect("v0.11.0 import migration is idempotent", migration011.includes("IF NOT EXISTS") && migration011.includes("knowledge_import_batches"));
expect("Excel imports are previewed as drafts", core.includes("previewKnowledgeImport") && core.includes("createKnowledgeImportDrafts") && knowledgeImportModule.includes("status: 'draft'"));
expect("Multi-platform ticket actions are capability guarded", core.includes("support_platforms") && core.includes("buttonAllowedForPlatform") && core.includes("support_mode"));
expect("Admin exposes the import review studio", importAdmin.includes("Create AI Content drafts") && importAdmin.includes("Target support platform") && adminLayout.includes("AI Knowledge Import"));
expect("Chat and diagnostics persist platform routing context", core.includes("platform_key") && chatLogs.includes("Platform:") && diagnosticsAdmin.includes("Knowledge imports"));
expect(
  "Knowledge import previews return supplied preview rows",
  /function knowledgeImportOut\(batch, previewRows = \[\]\)[\s\S]*preview_rows:previewRows/.test(core),
);
expect(
  "v1.0 tenant core migration is additive and idempotent",
  migration100.includes("CREATE TABLE IF NOT EXISTS saas_tenants") &&
    migration100.includes("saas_platform_domains") &&
    migration100.includes("ON CONFLICT(migration_key) DO NOTHING"),
);
expect(
  "Tenant platform APIs enforce server-side role boundaries",
  core.includes("assertTenantManager") &&
    core.includes("assertPlatformManager") &&
    core.includes("/admin/tenant-control-center") &&
    core.includes("saas_platform_memberships"),
);
expect(
  "Existing BDG content is adopted by the protected legacy tenant",
  core.includes("bdg-operations") &&
    core.includes("bdg-help-center") &&
    core.includes("legacy_support_platform_key"),
);
expect(
  "Control Center manages tenants, platforms, domains, features, and members",
  platformControlCenter.includes("Platform Control Center") &&
    platformControlCenter.includes("New client company") &&
    platformControlCenter.includes("Add domain") &&
    platformControlCenter.includes("Add platform member") &&
    platformControlCenter.includes("updatePlatformFeature"),
);
expect(
  "Automatic platform access links use an immutable generated route key",
  migration101.includes("public_route_key") &&
    migration101.includes("v1.0.1_automatic_platform_access_links") &&
    core.includes("platformAccessLinks") &&
    core.includes("reservePublicRouteKey") &&
    core.includes("platform-access") &&
    core.includes("ensurePlatformAccessRoutes"),
);
const routeColumnAlter = core.indexOf("ALTER TABLE saas_platforms ADD COLUMN IF NOT EXISTS public_route_key");
const routeIndexCreate = core.indexOf("CREATE UNIQUE INDEX IF NOT EXISTS idx_saas_platforms_public_route");
expect(
  "The platform route column is added before its index is created",
  routeColumnAlter >= 0 && routeIndexCreate > routeColumnAlter,
);
expect(
  "Generated platform routes resolve in Chat and the three Pages applications",
  chatApi.includes("platformReferenceFromLocation") &&
    chatApi.includes("/chat/content?platform=") &&
    guideApi.includes("getPublicBasePath") &&
    adminRouter.includes("adminPlatformBasepath") &&
    read("admin-pro/public/_redirects").includes("/index.html"),
);
expect(
  "v1.3.0 chat experience migration is idempotent",
  migration130.includes("ON CONFLICT (migration_key) DO NOTHING") &&
    core.includes("ensureChatExperienceStudio") &&
    core.includes("chat_start_enabled") &&
    core.includes("chat_start_animation"),
);
expect(
  "Chat Start Module is tenant-scoped and returned by public content",
  core.includes("start_module: chatExperienceOut(theme, supportName)") &&
    chatApi.includes("start_module") &&
    chatApp.includes("ChatStartModule") &&
    chatApp.includes("setStarted(true)") &&
    chatApp.includes("StartCopy"),
);
expect(
  "Chat experience uses safe presets instead of arbitrary scripts",
  core.includes("CHAT_ANIMATION_PRESETS") &&
    core.includes("CHAT_LAYOUT_MODES") &&
    chatApp.includes("SAFE_ANIMATIONS") &&
    chatApp.includes("safeVisualUrl") &&
    chatApp.includes("safeFontFamily"),
);
expect(
  "Admin Theme Settings exposes start module and layout controls",
  theme.includes("Chat Start Module") &&
    theme.includes("chat_start_image_url") &&
    theme.includes("chat_layout") &&
    theme.includes("chat_bubble_style"),
);
expect(
  "Custom domains cannot be self-verified in the admin workflow",
  core.includes("Do not mark a domain verified manually") &&
    platformControlCenter.includes("Optional custom domain") &&
    !platformControlCenter.includes('{ value: "verified", label: "Verified" }'),
);
expect(
  "v1.1.0 makes natural content keys platform-scoped",
  migration110.includes("idx_categories_platform_slug") &&
    migration110.includes("idx_ai_content_platform_intent") &&
    core.includes("ensureTenantDataIsolation") &&
    core.includes("v1.1.0_tenant_data_isolation_platform_scoped_admin"),
);
expect(
  "Platform-scoped Admin sends a route context header and validates membership",
  adminApi.includes("X-BDG-Platform-Route") &&
    core.includes("resolveAdminPlatformScope") &&
    core.includes("saas_platform_memberships") &&
    core.includes("/admin/platform-context"),
);
expect(
  "Tenant-scoped records include chat, content, audit, and imports",
  core.includes("INSERT INTO chat_logs") &&
    core.includes("tenant_id,platform_id") &&
    core.includes("idx_chat_logs_tenant_platform") &&
    core.includes("idx_import_batches_tenant_platform") &&
    core.includes("admin_audit_logs"),
);
expect(
  "Platform Admin Users are isolated to the active child platform",
  core.includes("/admin/platform-admin-users") &&
    core.includes("listCurrentPlatformAdmins") &&
    core.includes("createCurrentPlatformAdmin") &&
    adminApi.includes("platform-admin-users"),
);
expect(
  "New platforms receive isolated presentation defaults but no shared knowledge",
  core.includes("provisionPlatformWorkspace") &&
    core.includes("guides, FAQ answers, AI content and") &&
    core.includes("await provisionPlatformWorkspace(env, row)"),
);
expect(
  "v1.2.0a deduplicates legacy rows before tenant backfill",
  core.includes("deduplicateLegacyRows(env, platform.id)") &&
    core.includes("ROW_NUMBER() OVER (PARTITION BY") &&
    migration120a.includes("v1.2.0a_safe_bootstrap_deduplication_repair"),
);
expect(
  "v1.2.0a2 removes conflicts with existing scoped rows",
  core.includes("deduplicateLegacyRows(env, platform.id)") &&
    core.includes("scoped.platform_id=$1") &&
    migration120a2.includes("v1.2.0a2_scoped_backfill_conflict_repair"),
);
expect(
  "v1.2.0a4 archives duplicate active platforms before bootstrap",
  core.includes("activePlatforms.slice(1)") &&
    core.includes("status='archived',archived_at=COALESCE") &&
    migration120a4.includes("v1.2.0a4_safe_active_platform_bootstrap_repair"),
);
expect(
  "v1.2.1 repair migration is documented and idempotent",
  migration121.includes("v1.2.1_platform_context_no_fallback_repair") &&
    migration121.includes("ON CONFLICT (migration_key) DO NOTHING"),
);
expect(
  "Public categories always carry platform context",
  guideApi.includes('withLanguage("/categories")') &&
    guideApi.includes("getPublicPlatformKey()"),
);
expect(
  "Public query caches are platform-scoped",
  [guideIndex, guideList, guideDetail, guideFaq].every((source) => source.includes("platformKey") && source.includes("queryKey")),
);
expect(
  "Guide branding is platform-aware with a neutral missing-logo state",
  guideLayout.includes("api.getSettings") &&
    guideLayout.includes("Logo not configured") &&
    guideLayout.includes("data-platform-favicon") &&
    guideLayout.includes("data-platform-default-favicon"),
);
expect(
  "Non-default Guide content uses neutral defaults",
  guideApi.includes("neutralSiteContent") &&
    guideApi.includes("siteContentDefaults") &&
    guideApi.includes("getPublicPlatformKey() === \"default\""),
);
expect(
  "Chat fallback copy is platform-specific and has no inherited quick replies",
  chatApp.includes("getChatConfig(effectiveLanguage, platformKey)") &&
    chatConfig.includes("quickQuestions: []") &&
    chatConfig.includes("platformLabel"),
);
expect(
  "Backend repairs copied presentation rows without deleting owner edits",
  core.includes("ensurePlatformContextNoFallback") &&
    core.includes("exact legacy presentation copies") &&
    core.includes("v1.2.1_platform_context_no_fallback_repair"),
);
expect(
  "Platform-aware public responses bypass shared API caching",
  server.includes("hasPlatformContext") &&
    server.includes("headers['cache-control'] = 'no-store'") &&
    server.includes("url.searchParams.has('platform')"),
);
expect(
  "Health and API errors expose the same release version",
  core.includes("1.7.0-strict-tenant-routing-quick-reply-lifecycle") &&
    server.includes("1.7.0-strict-tenant-routing-quick-reply-lifecycle"),
);
expect(
  "Operations Connector Gateway is platform-scoped and allowlisted",
  core.includes("platform_connectors") &&
    core.includes("game_status") &&
    core.includes("payment_order_status") &&
    core.includes("callPlatformConnector"),
);
expect(
  "Operations Connector admin controls are visible",
  platformControlCenter.includes("Operations Connector") &&
    adminApi.includes("getPlatformConnector") &&
    adminApi.includes("testPlatformConnector"),
);

for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((x) => !x.ok);
console.log(
  `\n${checks.length - failed.length}/${checks.length} regression checks passed`,
);
if (failed.length) process.exitCode = 1;
