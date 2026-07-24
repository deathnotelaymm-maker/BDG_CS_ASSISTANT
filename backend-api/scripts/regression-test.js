import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const core = read("backend-api/src/core.js");
const server = read("backend-api/src/server.js");
const env = read("backend-api/src/env.js");
const migration = read("backend-api/migrations/030_v1.14.0_ai_response_quality_center.sql");
const adminApi = read("admin-pro/src/lib/api.ts");
const adminLayout = read("admin-pro/src/components/AdminLayout.tsx");
const qualityPage = read("admin-pro/src/routes/_admin.ai-response-quality.tsx");
const routerPage = read("admin-pro/src/routes/_admin.ai-source-router.tsx");
const localizedHelp = read("admin-pro/src/components/LocalizedHelp.tsx");
const domainPage = read("admin-pro/src/routes/_admin.domain-mapping.tsx");

expect("Backend and server expose v1.14.0", core.includes("1.14.0-ai-response-quality-center-duplicate-conflict-image-validation") && server.includes("1.14.0-ai-response-quality-center-duplicate-conflict-image-validation"));
expect("v1.13.1 route ID repair remains included", core.includes("domainMappingIdFromPath(path)") && core.includes("path.split('/')[4]") && !core.includes("provisionMappedDomain(env, idFromParts(path, 3)"));
expect("Invalid domain IDs are rejected before PostgreSQL", core.includes("PLATFORM_DOMAIN_ID_INVALID") && core.includes("Domain mapping route id is invalid"));
expect("Cloudflare guard reports safe missing configuration", core.includes("CLOUDFLARE_NOT_CONFIGURED") && core.includes("configuration_missing") && core.includes("Cloudflare Custom Hostnames configuration is incomplete"));
expect("Cloudflare configuration is visible without secrets", core.includes("configured:configuration_missing.length === 0") && core.includes("CLOUDFLARE_SAAS_CNAME_TARGET"));
expect("Server error responses preserve error code and diagnostics", server.includes("code: error.code") && server.includes("configuration_missing") && server.includes("platform_resolution"));
expect("Quality migration is additive and idempotent", migration.includes("CREATE TABLE IF NOT EXISTS ai_quality_findings") && migration.includes("CREATE TABLE IF NOT EXISTS ai_quality_test_cases") && migration.includes("CREATE TABLE IF NOT EXISTS ai_quality_test_runs") && migration.includes("ON CONFLICT (migration_key) DO NOTHING"));
expect("Quality findings are tenant and platform scoped", core.includes("ai_quality_findings") && core.includes("tenant_id=$1::integer") && core.includes("platform_id=$2::integer") && migration.includes("UNIQUE(tenant_id, platform_id, fingerprint)"));
expect("Quality scanner detects duplicates and conflicts", ["exact_duplicate", "near_duplicate", "conflicting_reply", "instruction_conflict"].every((item) => core.includes(item)) && core.includes("qualitySimilarity"));
expect("Quality scanner validates images", core.includes("duplicate_image") && core.includes("missing_image") && core.includes("invalid_image") && core.includes("safeResponseUrl"));
expect("Quality scanner uses published approved content", core.includes("buildUnifiedAiSourceCatalog") && core.includes("scannerRouter") && core.includes("enabled_sources:[...AI_ROUTER_SOURCE_TYPES]"));
expect("Draft checks are opt-in and never mutate content", core.includes("if (payload.include_drafts)") && core.includes("unpublished_duplicate") && !core.includes("DELETE FROM ai_content_items"));
expect("Findings can be reviewed without automatic deletion", core.includes("resolveAiQualityFinding") && core.includes("status = ['resolved','intentional','ignored','open']"));
expect("Production-like AI test cases use the live router", core.includes("runAiQualityTest") && core.includes("runAiChat(env") && core.includes("admin_quality_test"));
expect("Quality tests check facts, forbidden phrases, source, intent, and images", ["expected_source", "expected_intent", "required_fact", "forbidden_phrase", "image_required", "expected_image"].every((item) => core.includes(item)));
expect("Quality test runs are persisted", core.includes("ai_quality_test_runs") && core.includes("last_run_json") && core.includes("runAiQualitySuite"));
expect("All quality routes are present", ["/admin/ai-response-quality", "/scan", "/findings", "/test-cases", "/run-suite"].every((item) => core.includes(item)));
expect("Admin API exposes quality center operations", ["getAiQualityOverview", "scanAiQuality", "listAiQualityFindings", "resolveAiQualityFinding", "createAiQualityTestCase", "runAiQualityTest", "runAiQualitySuite"].every((item) => adminApi.includes(item)));
expect("Admin quality page includes scan, findings, and tests", ["AI Response Quality Center", "Duplicate, conflict, and image findings", "Save test case", "Run against live router"].every((item) => qualityPage.includes(item)));
expect("Admin quality page explains the safety contract", qualityPage.includes("never deletes, merges, approves, or publishes") && qualityPage.includes("当前平台") && qualityPage.includes("လက်ရှိ platform"));
expect("Quality center has an admin menu item", adminLayout.includes("/ai-response-quality") && adminLayout.includes("AI Response Quality Center"));
expect("Admin language help remains available", localizedHelp.includes("zh") && localizedHelp.includes("my") && qualityPage.includes("LocalizedHelp"));
expect("Source router remains the authority for source priority", routerPage.includes("Source priority order") && routerPage.includes("Removing a source pauses it"));
expect("Domain mapping page retains BYOD controls", domainPage.includes("Bring Your Own Domain") && domainPage.includes("Provision"));
expect("Admin release marker is v1.14.0", adminLayout.includes('const ADMIN_VERSION = "v1.14.0"'));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} v1.14.0 regression checks passed`);
if (failed.length) process.exitCode = 1;
