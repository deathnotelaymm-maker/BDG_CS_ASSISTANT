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
const knowledgeImportModule = read("backend-api/src/knowledge-import.js");
const guideApi = read("guide-pro/src/lib/api.ts");
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
  "GitHub release workflow explicitly deploys Pages main production branch",
  read(".github/workflows/bdg-production-release.yml").includes("--branch main") &&
    read("scripts/ci/verify-live-pages.mjs").includes("https://main.bdg-chat-pages.pages.dev"),
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

for (const check of checks)
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((x) => !x.ok);
console.log(
  `\n${checks.length - failed.length}/${checks.length} regression checks passed`,
);
if (failed.length) process.exitCode = 1;
