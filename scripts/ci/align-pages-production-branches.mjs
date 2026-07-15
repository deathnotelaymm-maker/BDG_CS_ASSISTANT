import { fileURLToPath } from "node:url";

export const pagesProjects = [
  "bdg-guide-pages",
  "bdg-chat-pages",
  "bdg-admin-pages",
];

const defaultApiBase = "https://api.cloudflare.com/client/v4";

function required(value, name) {
  if (!value?.trim()) {
    throw new Error(`Missing ${name}. The release was stopped before any Pages site was built or uploaded.`);
  }
  return value.trim();
}

function describeCloudflareError(payload, status) {
  const messages = Array.isArray(payload?.errors)
    ? payload.errors.map((error) => error?.message).filter(Boolean)
    : [];
  const detail = messages.length ? ` ${messages.join("; ")}` : "";
  const permissionHint = status === 401 || status === 403
    ? " Check the GitHub secret CLOUDFLARE_API_TOKEN has Account > Cloudflare Pages > Edit for this Cloudflare account."
    : "";
  return `Cloudflare Pages branch alignment failed (HTTP ${status}).${detail}${permissionHint}`;
}

export async function alignPagesProductionBranches({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  fetchFn = fetch,
  apiBase = defaultApiBase,
  projects = pagesProjects,
} = {}) {
  const safeAccountId = required(accountId, "CLOUDFLARE_ACCOUNT_ID");
  const safeApiToken = required(apiToken, "CLOUDFLARE_API_TOKEN");
  const baseUrl = apiBase.replace(/\/$/, "");

  for (const project of projects) {
    const response = await fetchFn(
      `${baseUrl}/accounts/${encodeURIComponent(safeAccountId)}/pages/projects/${encodeURIComponent(project)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${safeApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ production_branch: "main" }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      throw new Error(describeCloudflareError(payload, response.status));
    }
    const branch = payload?.result?.production_branch || "main";
    if (branch !== "main") {
      throw new Error(`Cloudflare did not confirm main as the production branch for ${project}. The release was stopped before any Pages site was uploaded.`);
    }
    console.log(`PASS ${project}: production branch is ${branch}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await alignPagesProductionBranches();
}
