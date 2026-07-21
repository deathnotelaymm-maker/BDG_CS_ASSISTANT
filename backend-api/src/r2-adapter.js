import { Readable } from 'node:stream';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

async function toNodeBody(body) {
  if (body == null) return Buffer.alloc(0);
  if (Buffer.isBuffer(body) || typeof body === 'string' || body instanceof Uint8Array) return body;
  if (body instanceof ReadableStream) return Readable.fromWeb(body);
  return body;
}

export function createR2Adapter(env) {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) return null;
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return {
    async put(key, body, options = {}) {
      await client.send(new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: await toNodeBody(body),
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
