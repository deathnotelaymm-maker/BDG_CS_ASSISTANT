const expectedVersion = process.argv[2];
const apiBaseUrl = (process.env.BDG_API_BASE_URL || "https://bdg-ai-help-api-render.onrender.com").replace(/\/$/, "");

if (!expectedVersion) throw new Error("Expected API version is required.");

const paths = ["/health/live", "/health/ready", "/health/dependencies"];
const timeoutAt = Date.now() + 25 * 60 * 1000;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function health(path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json();
}

while (Date.now() < timeoutAt) {
  try {
    const results = await Promise.all(paths.map((path) => health(path)));
    const ready = results.every((result) => result?.ok === true && result.version === expectedVersion);
    if (ready) {
      console.log(`PASS Render health: ${expectedVersion}`);
      process.exit(0);
    }
    console.log(`Waiting for Render: ${results.map((result) => result?.version || "unavailable").join(", ")}`);
  } catch (error) {
    console.log(`Waiting for Render: ${error.message}`);
  }
  await sleep(15_000);
}

throw new Error(`Render did not report ${expectedVersion} on every health endpoint within 25 minutes. Cloudflare Pages was not changed.`);
