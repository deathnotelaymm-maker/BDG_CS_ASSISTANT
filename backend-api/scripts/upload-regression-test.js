import assert from 'node:assert/strict';
import api, { uploadToR2 } from '../src/core.js';
import { createR2Adapter } from '../src/r2-adapter.js';

const version = '1.0.0-tenant-core-platform-control-center';
const env = {
  R2_ACCOUNT_ID: 'test-account',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'test-bucket',
  ALLOWED_ORIGINS: 'https://bdg-admin-pages.pages.dev',
  MAX_REQUEST_BYTES: 20 * 1024 * 1024,
};

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

function pngFile(name = 'test.png') {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], name, { type: 'image/png' });
}

function uploadRequest(path = '/admin/uploads', file = pngFile(), requestId = 'upload-test-request') {
  const form = new FormData();
  form.append('file', file);
  return new Request(`https://api.example.test${path}`, {
    method: 'POST',
    headers: { 'x-request-id': requestId },
    body: form,
  });
}

await test('R2 adapter buffers a web stream and sends exact ContentLength', async () => {
  const commands = [];
  const client = { send: async (command) => { commands.push(command); return {}; } };
  const adapter = createR2Adapter(env, { client });
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.enqueue(new Uint8Array([4, 5]));
      controller.close();
    },
  });
  await adapter.put('guide/test.png', stream, { httpMetadata: { contentType: 'image/png' } });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].constructor.name, 'PutObjectCommand');
  assert.ok(Buffer.isBuffer(commands[0].input.Body));
  assert.deepEqual([...commands[0].input.Body], [1, 2, 3, 4, 5]);
  assert.equal(commands[0].input.ContentLength, 5);
  assert.equal(commands[0].input.ContentType, 'image/png');
});

await test('upload handler sends a byte array and matching length to storage', async () => {
  let stored = null;
  const uploadEnv = {
    ...env,
    GUIDE_IMAGES: {
      async put(key, body, options) { stored = { key, body, options }; },
    },
  };
  const response = await uploadToR2(uploadRequest(), uploadEnv, 'guide');
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.match(payload.url, /^https:\/\/api\.example\.test\/uploads\/guide\//);
  assert.equal(payload.content_type, 'image/png');
  assert.equal(payload.size_bytes, 8);
  assert.ok(stored.body instanceof Uint8Array);
  assert.equal(stored.body.byteLength, 8);
  assert.equal(stored.options.contentLength, 8);
  assert.equal(stored.options.httpMetadata.contentType, 'image/png');
});

await test('upload handler rejects a MIME and extension mismatch before storage', async () => {
  const mismatch = new File([new Uint8Array([1])], 'wrong.jpg', { type: 'image/png' });
  await assert.rejects(
    () => uploadToR2(uploadRequest('/admin/uploads', mismatch), { ...env, GUIDE_IMAGES: { put: async () => {} } }, 'guide'),
    (error) => error.status === 400 && error.code === 'UPLOAD_TYPE_MISMATCH',
  );
});

await test('storage failures return safe diagnostics with the generated request ID', async () => {
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args.join(' '));
  try {
    const requestId = 'render-searchable-request-id';
    const response = await api.fetch(uploadRequest('/chat/uploads', pngFile(), requestId), {
      ...env,
      GUIDE_IMAGES: {
        async put() { throw new TypeError('Invalid x-amz-decoded-content-length'); },
      },
    });
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(payload.error, 'Image storage is temporarily unavailable');
    assert.equal(payload.code, 'UPLOAD_STORAGE_WRITE_FAILED');
    assert.equal(payload.request_id, requestId);
    assert.equal(payload.version, version);
    assert.ok(logs.some((line) => line.includes(requestId)));
    assert.ok(logs.some((line) => line.includes('Invalid x-amz-decoded-content-length')));
  } finally {
    console.error = originalError;
  }
});

console.log(`Upload regression tests passed: ${passed}/4`);
