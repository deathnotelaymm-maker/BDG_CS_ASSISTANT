import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}
function decode(value) {
  return Buffer.from(String(value || ''), 'base64url').toString('utf8');
}
function secret(env) {
  const value = String(env?.JWT_SECRET || '');
  if (value.length < 32) {
    const error = new Error('Server authentication is not configured');
    error.status = 503;
    error.code = 'AUTH_NOT_CONFIGURED';
    throw error;
  }
  return value;
}

export function createSupportToken(env, claims = {}, ttlSeconds = 60 * 60 * 8) {
  const payload = {
    ...claims,
    iss: 'bdg-support',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + Math.max(60, Number(ttlSeconds || 0)),
  };
  const encoded = b64url(JSON.stringify(payload));
  const signature = createHmac('sha256', secret(env)).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function readSupportToken(env, token, expectedKind = '') {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) throw authError('Invalid support token');
  const expected = createHmac('sha256', secret(env)).update(encoded).digest('base64url');
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw authError('Invalid support token');
  }
  let payload;
  try { payload = JSON.parse(decode(encoded)); } catch { throw authError('Invalid support token'); }
  if (!payload?.kind || Number(payload.exp || 0) < Math.floor(Date.now() / 1000)) throw authError('Expired support token');
  if (expectedKind && payload.kind !== expectedKind) throw authError('Incorrect support token type', 403);
  return payload;
}

function authError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  error.code = 'SUPPORT_AUTH_INVALID';
  return error;
}

export function bearerToken(request) {
  const auth = String(request?.headers?.get?.('Authorization') || '');
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}
