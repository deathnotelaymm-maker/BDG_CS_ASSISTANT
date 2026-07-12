const base = String(process.env.API_BASE_URL || 'http://localhost:10000').replace(/\/$/, '');
const checks = [
  ['/health/live', 200],
  ['/health/ready', 200],
  ['/categories', 200],
  ['/guides?language=en', 200],
  ['/faqs?language=en', 200],
  ['/chat/content', 200],
];
let failed = 0;
for (const [path, expected] of checks) {
  try {
    const started = Date.now();
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15_000) });
    const text = await response.text();
    const ok = response.status === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${response.status} ${path} ${Date.now() - started}ms ${text.slice(0, 140)}`);
    if (!ok) failed += 1;
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${path}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;
