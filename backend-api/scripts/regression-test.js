import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const expect = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const core = read("backend-api/src/core.js");
const server = read("backend-api/src/server.js");
const adminLayout = read("admin-pro/src/components/AdminLayout.tsx");

expect("Backend and server expose the v1.14.1 release", core.includes("1.14.1-single-image-step-aware-response-rendering") && server.includes("1.14.1-single-image-step-aware-response-rendering"));
expect("Response image URLs have a canonical comparison key", core.includes("function canonicalResponseImageKey") && core.includes("parsed.hash = ''"));
expect("Response blocks deduplicate identical image URLs", core.includes("const imageKeys = new Set()") && core.includes("imageKeys.has(key)") && core.includes("const deduped = []"));
expect("Responses without steps are limited to one image", core.includes("A response without procedural steps has one canonical visual at most") && core.includes("!stepCount && policyApplied.some((item) => item.type === 'image')"));
expect("Stepped responses enforce one image per step", core.includes("const seenStepIndexes = new Set()") && core.includes("stepIndex >= stepCount || seenStepIndexes.has(stepIndex)") && core.includes("step_index: stepIndex"));
expect("Model image references preserve step indexes", core.includes("type === 'image_ref'") && core.includes("raw.step_index") && core.includes("step_index:Number(raw.step_index)"));
expect("Unapproved direct image URLs are rejected", core.includes("Accept it only when it exactly matches") && core.includes("assets.images.find((candidate) => canonicalResponseImageKey(candidate.url) === requestedUrl)"));
expect("Prompt requires one image when there are no extra steps", core.includes("If there are no extra steps, output no more than one image_ref"));
expect("Prompt requires step-aware image placement", core.includes("at most one image per step") && core.includes("include step_index starting at 0"));
expect("Content images are deduplicated for legacy clients", core.includes("const seenContentImages = new Set()") && core.includes("const legacyContentImages = imageDelivery.image_count ? [] : contentImages"));
expect("Canonical response blocks prevent duplicate legacy rendering", core.includes("response_blocks: responseBlocks") && core.includes("content_images: legacyContentImages"));
expect("Image delivery diagnostics expose single and step-aware modes", core.includes("function responseImageDeliveryPlan") && core.includes("mode: !images.length ? 'none' : stepCount ? 'step_aware' : 'single'") && core.includes("step_images: Object.fromEntries(stepImages)"));
expect("Admin release marker is v1.14.1", adminLayout.includes('const ADMIN_VERSION = "v1.14.1"'));
expect("No database migration is required for this rendering-only release", !fs.existsSync(path.join(root, "backend-api/migrations/029_v1.14.1_single_image_step_aware_response_rendering.sql")));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} v1.14.1 regression checks passed`);
if (failed.length) process.exitCode = 1;
