import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) => checks.push({ name, ok: Boolean(condition) });
const core = read("backend-api/src/core.js");
const server = read("backend-api/src/server.js");
const env = read("backend-api/src/env.js");
const adminLayout = read("admin-pro/src/components/AdminLayout.tsx");
const domainPage = read("admin-pro/src/routes/_admin.domain-mapping.tsx");
const migration = read("backend-api/migrations/028_v1.13.0_bring_your_own_domain_cloudflare_custom_hostnames.sql");

expect("Backend and server expose v1.13.1", core.includes("1.13.1-domain-mapping-route-id-fix-cloudflare-configuration-guard") && server.includes("1.13.1-domain-mapping-route-id-fix-cloudflare-configuration-guard"));
expect("Domain route ID uses the numeric segment", core.includes("domainMappingIdFromPath(path)") && core.includes("path.split('/')[4]"));
expect("All domain lifecycle actions use the repaired ID parser", ["provisionMappedDomain(env, domainMappingIdFromPath(path)", "syncMappedDomain(env, domainMappingIdFromPath(path)", "verifyMappedDomain(env, domainMappingIdFromPath(path)", "deleteMappedDomain(env, domainMappingIdFromPath(path)"].every((item) => core.includes(item)));
expect("Invalid domain IDs are rejected", core.includes("PLATFORM_DOMAIN_ID_INVALID"));
expect("Cloudflare guard is explicit", core.includes("CLOUDFLARE_NOT_CONFIGURED") && core.includes("configuration_missing") && core.includes("CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED=true"));
expect("Domain mapping exposes missing Cloudflare settings", core.includes("configured:configuration_missing.length === 0") && core.includes("configuration_missing"));
expect("Server preserves error code and diagnostics", server.includes("code: error.code") && server.includes("configuration_missing") && server.includes("platform_resolution"));
expect("Cloudflare environment variables remain backend-only", env.includes("CLOUDFLARE_API_TOKEN") && env.includes("CLOUDFLARE_ZONE_ID") && env.includes("CLOUDFLARE_SAAS_CNAME_TARGET"));
expect("Cloudflare migration is additive and idempotent", migration.includes("ADD COLUMN IF NOT EXISTS") && migration.includes("CREATE INDEX IF NOT EXISTS") && migration.includes("ON CONFLICT (migration_key) DO NOTHING"));
expect("Tenant/platform domain isolation remains enforced", core.includes("JOIN saas_platforms p ON p.id=d.platform_id") && core.includes("p.tenant_id=$2::integer") && core.includes("d.platform_id=$3::integer"));
expect("Missing AI platform context remains rejected", core.includes("PLATFORM_CONTEXT_REQUIRED") && core.includes("Platform context is required for AI chat"));
expect("Silent BDG fallback remains disabled", core.includes("const publicReference = publicContext.reference || publicContext.raw_reference || ''") && !core.includes("publicReference || 'default'"));
expect("Admin release marker is v1.13.1", adminLayout.includes('const ADMIN_VERSION = "v1.13.1"'));
expect("Admin domain mapping retains user-facing BYOD controls", domainPage.includes("Bring Your Own Domain") && domainPage.includes("DNS records") && domainPage.includes("Provision"));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} v1.13.1 regression checks passed`);
if (failed.length) process.exitCode = 1;
