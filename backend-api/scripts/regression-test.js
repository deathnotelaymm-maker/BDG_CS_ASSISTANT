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

expect("Backend and server expose the v1.14.2 release", core.includes("1.14.2-domain-provisioning-id-cloudflare-guard-hotfix") && server.includes("1.14.2-domain-provisioning-id-cloudflare-guard-hotfix"));
expect("Domain route IDs are extracted from the numeric path segment", core.includes("function domainIdFromPath") && core.includes("Number.isSafeInteger(id)") && core.includes("DOMAIN_ID_INVALID"));
expect("Provision uses the validated domain ID", core.includes("provisionMappedDomain(env, domainIdFromPath(path), scope)") && !core.includes("provisionMappedDomain(env, idFromParts(path, 3), scope)"));
expect("Sync, verify, and delete use the validated domain ID", ["syncMappedDomain(env, domainIdFromPath(path), scope)", "verifyMappedDomain(env, domainIdFromPath(path), scope)", "deleteMappedDomain(env, domainIdFromPath(path), scope)"].every((item) => core.includes(item)));
expect("Invalid domain IDs return a client error before SQL", core.includes("DOMAIN_ID_INVALID") && core.includes("The domain mapping ID is invalid."));
expect("Cloudflare configuration status is safe and non-secret", core.includes("function cloudflareConfigurationStatus") && core.includes("required_env") && core.includes("missing_env") && !core.includes("api_token: config.api_token"));
expect("Cloudflare provisioning has a clear 503 guard", core.includes("CLOUDFLARE_NOT_CONFIGURED") && core.includes("Missing Render variables") && core.includes("503"));
expect("Domain mapping exposes missing configuration names", core.includes("const cloudflare = { ...cloudflareConfigurationStatus(env)") && core.includes("cloudflare.missing_env.join"));
expect("Render environment validation covers Cloudflare prerequisites", env.includes("CLOUDFLARE_CUSTOM_HOSTNAMES_ENABLED") && env.includes("CLOUDFLARE_API_TOKEN") && env.includes("CLOUDFLARE_ZONE_ID") && env.includes("CLOUDFLARE_SAAS_CNAME_TARGET"));
expect("Admin disables Provision until Cloudflare is configured", domainPage.includes("const cloudflareReady = data?.cloudflare?.configured === true") && domainPage.includes("disabled={!cloudflareReady}"));
expect("Admin displays the exact missing Render variables", domainPage.includes("data?.cloudflare?.missing_env") && domainPage.includes("Set these Render variables before provisioning"));
expect("Admin release marker is v1.14.2", adminLayout.includes('const ADMIN_VERSION = "v1.14.2"'));
expect("v1.14.1 single-image contract remains present", core.includes("const legacyContentImages = imageDelivery.image_count ? [] : contentImages") && core.includes("A response without procedural steps has one canonical visual at most"));
expect("Platform context remains strict with no fallback", core.includes("PLATFORM_CONTEXT_REQUIRED") && core.includes("fallback_applied: false") && !core.includes("publicReference || 'default'"));
expect("No new database migration is required", !fs.existsSync(path.join(root, "backend-api/migrations/029_v1.14.2_domain_provisioning_id_cloudflare_guard.sql")));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} v1.14.2 regression checks passed`);
if (failed.length) process.exitCode = 1;
