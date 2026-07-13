import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

async function toSizedBuffer(body) {
  if (body == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) {
    return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  }
  if (typeof body.arrayBuffer === 'function') {
    return Buffer.from(await body.arrayBuffer());
  }

  let stream = body;
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    stream = Readable.fromWeb(body);
  }
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') {
    throw new TypeError('R2 upload body must be a string, byte array, Blob, or readable stream');
  }

  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createR2Adapter(env, { client: providedClient } = {}) {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) return null;
  const client = providedClient || new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return {
    async put(key, body, options = {}) {
      // R2 rejects SigV4 streaming uploads when the decoded content length is unknown.
      // Buffering is safe here because the HTTP server caps requests before they reach this adapter.
      const sizedBody = await toSizedBuffer(body);
      await client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: sizedBody,
        ContentLength: sizedBody.byteLength,
        ContentType: options.httpMetadata?.contentType || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return { key };
    },
    async get(key) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
        const body = result.Body?.transformToWebStream ? result.Body.transformToWebStream() : result.Body;
        return {
          body,
          httpMetadata: { contentType: result.ContentType || 'application/octet-stream' },
          etag: result.ETag,
        };
      } catch (error) {
        const status = error?.$metadata?.httpStatusCode;
        if (status === 404 || error?.name === 'NoSuchKey' || error?.name === 'NotFound') return null;
        throw error;
      }
    },
    async health() {
      await client.send(new HeadBucketCommand({ Bucket: env.R2_BUCKET_NAME }));
      return true;
    },
  };
}
