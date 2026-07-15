import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [site, distDirectory, version, gitSha] = process.argv.slice(2);
if (![site, distDirectory, version, gitSha].every(Boolean)) {
  throw new Error("Usage: write-release-marker.mjs <site> <dist-directory> <api-version> <git-sha>");
}

const marker = {
  site,
  api_version: version,
  git_sha: gitSha,
  deployed_at: new Date().toISOString(),
};
const output = resolve(distDirectory, "bdg-release.json");
await mkdir(resolve(distDirectory), { recursive: true });
await writeFile(output, `${JSON.stringify(marker, null, 2)}\n`, "utf8");
console.log(`Wrote ${output}`);
