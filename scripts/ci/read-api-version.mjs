import { readFile } from "node:fs/promises";

const declarations = [
  ["backend-api/src/server.js", /const\s+API_VERSION\s*=\s*['\"]([^'\"]+)['\"]/],
  ["backend-api/src/core.js", /const\s+VERSION\s*=\s*['\"]([^'\"]+)['\"]/],
];

const versions = [];
for (const [file, pattern] of declarations) {
  const content = await readFile(file, "utf8");
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Could not read a release version from ${file}.`);
  }
  versions.push({ file, version: match[1] });
}

if (new Set(versions.map((item) => item.version)).size !== 1) {
  throw new Error(
    `Backend version mismatch: ${versions.map((item) => `${item.file}=${item.version}`).join(", ")}. Update both version declarations before publishing.`,
  );
}

process.stdout.write(versions[0].version);
