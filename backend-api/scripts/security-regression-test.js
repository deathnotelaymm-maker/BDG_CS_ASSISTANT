import assert from 'node:assert/strict';
import { isForbiddenNetworkAddress, validatePublicHttpsUrl } from '../src/network-safety.js';
import { sanitizeRichHtml } from '../src/rich-html.js';

const sanitized = sanitizeRichHtml('<p style="position:fixed;color:#fff" onclick="alert(1)">Safe</p><a href="javascript:alert(2)" target="_blank">bad</a><img src="data:text/html,boom" onerror="alert(3)"><script>alert(4)</script>');
assert.match(sanitized, /<p style="color:#fff">Safe<\/p>/);
assert.doesNotMatch(sanitized, /script|onclick|onerror|javascript:|data:text|position:/i);
assert.match(sanitized, /rel="noopener noreferrer"/);

for (const address of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '172.16.0.1', '192.168.1.1', '::1', '::ffff:7f00:1', 'fc00::1', 'fe80::1', '2001:db8::1']) {
  assert.equal(isForbiddenNetworkAddress(address), true, `${address} must be blocked`);
}
assert.equal(isForbiddenNetworkAddress('8.8.8.8'), false);
assert.equal(isForbiddenNetworkAddress('2606:4700:4700::1111'), false);

await assert.rejects(
  validatePublicHttpsUrl('http://public.example.test/path', 'Test connector', async () => [{ address:'8.8.8.8', family:4 }]),
  (error) => error?.code === 'CONNECTOR_HTTPS_REQUIRED',
);
await assert.rejects(
  validatePublicHttpsUrl('https://rebind.example.test/path', 'Test connector', async () => [{ address:'127.0.0.1', family:4 }]),
  (error) => error?.code === 'CONNECTOR_URL_BLOCKED',
);
assert.equal(
  await validatePublicHttpsUrl('https://public.example.test/path#secret', 'Test connector', async () => [{ address:'8.8.8.8', family:4 }]),
  'https://public.example.test/path',
);

console.log('PASS Rich HTML allowlist removes executable markup and unsafe CSS');
console.log('PASS Connector URL guard blocks private, local, mapped, and DNS-rebound targets');
console.log('PASS Public HTTPS connector URLs remain valid and fragments are removed');
