const [expectedVersion, expectedSha] = process.argv.slice(2);
if (![expectedVersion, expectedSha].every(Boolean)) {
  throw new Error("Usage: verify-live-pages.mjs <api-version> <git-sha>");
}

const sites = [
  ["Guide", "https://main.bdg-guide-pages.pages.dev", "guide"],
  ["Chat", "https://main.bdg-chat-pages.pages.dev", "chat"],
  ["Admin", "https://main.bdg-admin-pages.pages.dev", "admin"],
];
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function request(url) {
  const response = await fetch(url, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

for (const [name, url, site] of sites) {
  let lastError = "release marker was not available";
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      const stamp = `${Date.now()}-${attempt}`;
      const marker = await (await request(`${url}/bdg-release.json?v=${stamp}`)).json();
      if (marker.site !== site || marker.api_version !== expectedVersion || marker.git_sha !== expectedSha) {
        throw new Error(`received ${JSON.stringify(marker)}`);
      }
      const html = await (await request(`${url}/?v=${stamp}`)).text();
      console.log(`PASS ${name} live release (${expectedVersion})`);
      lastError = "";
      break;
    } catch (error) {
      lastError = error.message;
      await sleep(10_000);
    }
  }
  if (lastError) throw new Error(`${name} production did not publish the expected release marker: ${lastError}`);
}
