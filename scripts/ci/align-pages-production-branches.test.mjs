import assert from "node:assert/strict";
import { alignPagesProductionBranches, pagesProjects } from "./align-pages-production-branches.mjs";

const calls = [];
await alignPagesProductionBranches({
  accountId: "account-123",
  apiToken: "test-token",
  apiBase: "https://cloudflare.test/client/v4/",
  fetchFn: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({
      success: true,
      result: { production_branch: "main" },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});

assert.equal(calls.length, pagesProjects.length);
for (const [index, project] of pagesProjects.entries()) {
  const call = calls[index];
  assert.equal(call.url, `https://cloudflare.test/client/v4/accounts/account-123/pages/projects/${project}`);
  assert.equal(call.options.method, "PATCH");
  assert.equal(call.options.headers.Authorization, "Bearer test-token");
  assert.equal(call.options.headers["Content-Type"], "application/json");
  assert.equal(call.options.body, '{"production_branch":"main"}');
}

await assert.rejects(
  () => alignPagesProductionBranches({
    accountId: "account-123",
    apiToken: "test-token",
    projects: ["bdg-chat-pages"],
    fetchFn: async () => new Response(JSON.stringify({
      success: false,
      errors: [{ message: "permission denied" }],
    }), { status: 403, headers: { "Content-Type": "application/json" } }),
  }),
  /Cloudflare Pages branch alignment failed \(HTTP 403\).*Cloudflare Pages > Edit/,
);

console.log("PASS Cloudflare Pages production-branch alignment checks");
