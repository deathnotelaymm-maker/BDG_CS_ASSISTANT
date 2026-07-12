const booleanValue = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

function parseDatabaseUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return {
      hostname: url.hostname.toLowerCase(),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
      sslmode: String(url.searchParams.get('sslmode') || '').toLowerCase(),
    };
  } catch {
    return null;
  }
}

function normalizedNeonHost(hostname) {
  return String(hostname || '').replace('-pooler.', '.');
}

export function getRuntimeEnv(source = process.env) {
  return {
    ...source,
    APP_NAME: source.APP_NAME || 'BDG Help Center',
    PORT: Number(source.PORT || 10000),
    NODE_ENV: source.NODE_ENV || 'production',
    DATABASE_PROVIDER: source.DATABASE_PROVIDER || 'neon',
    DATABASE_URL: source.DATABASE_URL || '',
    MIGRATION_DATABASE_URL: source.MIGRATION_DATABASE_URL || '',
    DATABASE_SSL: source.DATABASE_SSL || 'true',
    REQUIRE_NEON_POOLER: booleanValue(source.REQUIRE_NEON_POOLER, true),
    DB_POOL_MAX: source.DB_POOL_MAX || '10',
    DB_POOL_MIN: source.DB_POOL_MIN || '0',
    DB_CONNECT_TIMEOUT_MS: source.DB_CONNECT_TIMEOUT_MS || '10000',
    DB_QUERY_TIMEOUT_MS: source.DB_QUERY_TIMEOUT_MS || '20000',
    DB_IDLE_TIMEOUT_MS: source.DB_IDLE_TIMEOUT_MS || '30000',
    DB_KEEPALIVE_INITIAL_DELAY_MS: source.DB_KEEPALIVE_INITIAL_DELAY_MS || '10000',
    ADMIN_EMAIL: source.ADMIN_EMAIL || '',
    ADMIN_PASSWORD: source.ADMIN_PASSWORD || '',
    JWT_SECRET: source.JWT_SECRET || '',
    ALLOWED_ORIGINS: source.ALLOWED_ORIGINS || '',
    SUPPORT_LINK: source.SUPPORT_LINK || '',
    DEEPSEEK_API_KEY: source.DEEPSEEK_API_KEY || '',
    DEEPSEEK_API_BASE: source.DEEPSEEK_API_BASE || 'https://api.deepseek.com',
    DEEPSEEK_MODEL: source.DEEPSEEK_MODEL || 'deepseek-chat',
    DEEPSEEK_TIMEOUT_MS: source.DEEPSEEK_TIMEOUT_MS || '15000',
    AI_MODE_ENABLED: source.AI_MODE_ENABLED || 'true',
    R2_ACCOUNT_ID: source.R2_ACCOUNT_ID || '',
    R2_ACCESS_KEY_ID: source.R2_ACCESS_KEY_ID || '',
    R2_SECRET_ACCESS_KEY: source.R2_SECRET_ACCESS_KEY || '',
    R2_BUCKET_NAME: source.R2_BUCKET_NAME || 'bdg-ai-guide-images',
    R2_PUBLIC_BASE_URL: source.R2_PUBLIC_BASE_URL || '',
    R2_REQUIRED: booleanValue(source.R2_REQUIRED, true),
    MAX_REQUEST_BYTES: Number(source.MAX_REQUEST_BYTES || 20 * 1024 * 1024),
    RATE_LIMIT_WINDOW_MS: Number(source.RATE_LIMIT_WINDOW_MS || 60_000),
    RATE_LIMIT_CHAT: Number(source.RATE_LIMIT_CHAT || 30),
    RATE_LIMIT_LOGIN: Number(source.RATE_LIMIT_LOGIN || 10),
  };
}

export function validateRuntimeEnv(env, { migration = false } = {}) {
  const errors = [];
  const runtime = parseDatabaseUrl(env.DATABASE_URL);
  const direct = parseDatabaseUrl(env.MIGRATION_DATABASE_URL);
  const provider = String(env.DATABASE_PROVIDER || '').toLowerCase();

  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  else if (!runtime) errors.push('DATABASE_URL is not a valid PostgreSQL URL');
  if (migration && !env.MIGRATION_DATABASE_URL) errors.push('MIGRATION_DATABASE_URL is required for Neon schema migrations');
  else if (migration && !direct) errors.push('MIGRATION_DATABASE_URL is not a valid PostgreSQL URL');

  if (provider === 'neon' && runtime) {
    if (!runtime.hostname.endsWith('.neon.tech')) errors.push('DATABASE_URL must use a Neon hostname when DATABASE_PROVIDER=neon');
    if (env.REQUIRE_NEON_POOLER && !runtime.hostname.includes('-pooler.')) {
      errors.push('DATABASE_URL must be the Neon pooled connection string (hostname must contain -pooler)');
    }
    const sslEnabled = String(env.DATABASE_SSL).toLowerCase() === 'true' || ['require','verify-ca','verify-full'].includes(runtime.sslmode);
    if (!sslEnabled) errors.push('Neon runtime connections must require SSL');
  }

  if (provider === 'neon' && migration && direct) {
    if (!direct.hostname.endsWith('.neon.tech')) errors.push('MIGRATION_DATABASE_URL must use a Neon hostname');
    if (direct.hostname.includes('-pooler.')) errors.push('MIGRATION_DATABASE_URL must be the direct non-pooled Neon connection string');
    if (runtime && normalizedNeonHost(runtime.hostname) !== normalizedNeonHost(direct.hostname)) {
      errors.push('DATABASE_URL and MIGRATION_DATABASE_URL must point to the same Neon endpoint');
    }
    if (runtime && runtime.database !== direct.database) errors.push('Runtime and migration URLs must use the same Neon database');
    const sslEnabled = String(env.DATABASE_SSL).toLowerCase() === 'true' || ['require','verify-ca','verify-full'].includes(direct.sslmode);
    if (!sslEnabled) errors.push('Neon migration connections must require SSL');
  }

  if (!env.JWT_SECRET || String(env.JWT_SECRET).length < 32) errors.push('JWT_SECRET must contain at least 32 characters');
  if (!env.ADMIN_EMAIL) errors.push('ADMIN_EMAIL is required');
  if (!env.ADMIN_PASSWORD || String(env.ADMIN_PASSWORD).length < 12) errors.push('ADMIN_PASSWORD must contain at least 12 characters');
  if (!env.ALLOWED_ORIGINS && env.NODE_ENV === 'production') errors.push('ALLOWED_ORIGINS is required in production');
  if (booleanValue(env.AI_MODE_ENABLED, true) && !env.DEEPSEEK_API_KEY) errors.push('DEEPSEEK_API_KEY is required when AI_MODE_ENABLED=true');
  if (env.R2_REQUIRED) {
    if (!env.R2_ACCOUNT_ID) errors.push('R2_ACCOUNT_ID is required');
    if (!env.R2_ACCESS_KEY_ID) errors.push('R2_ACCESS_KEY_ID is required');
    if (!env.R2_SECRET_ACCESS_KEY) errors.push('R2_SECRET_ACCESS_KEY is required');
    if (!env.R2_BUCKET_NAME) errors.push('R2_BUCKET_NAME is required');
  }
  if (migration && !env.ADMIN_PASSWORD) errors.push('ADMIN_PASSWORD is required for owner bootstrap');
  if (errors.length) {
    const error = new Error(`Invalid production configuration:\n- ${errors.join('\n- ')}`);
    error.code = 'CONFIG_INVALID';
    throw error;
  }
}

export function databaseDescriptor(env, { migration = false } = {}) {
  const value = migration ? env.MIGRATION_DATABASE_URL : env.DATABASE_URL;
  const parsed = parseDatabaseUrl(value);
  return {
    provider: String(env.DATABASE_PROVIDER || 'neon').toLowerCase(),
    connection_mode: migration ? 'direct-migration' : (parsed?.hostname.includes('-pooler.') ? 'pooled-runtime' : 'direct-runtime'),
  };
}

export function allowedOrigin(env, requestOrigin) {
  const configured = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (!requestOrigin) return configured[0] || '*';
  const normalized = requestOrigin.replace(/\/$/, '');
  if (configured.includes('*') || configured.includes(normalized)) return requestOrigin;
  return '';
}
