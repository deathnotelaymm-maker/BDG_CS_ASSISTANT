import api, { closeDatabasePools, runMigrations } from './core.js';
import { databaseDescriptor, getRuntimeEnv, validateRuntimeEnv } from './env.js';

void api; // Ensures the compatibility API module is loaded and syntax checked.
const configuredEnv = getRuntimeEnv();

try {
  validateRuntimeEnv(configuredEnv, { migration: true });
  const env = {
    ...configuredEnv,
    DATABASE_URL: configuredEnv.MIGRATION_DATABASE_URL,
    DATABASE_CONNECTION_MODE: 'direct-migration',
  };
  const result = await runMigrations(env);
  console.log(JSON.stringify({
    level: 'info',
    event: 'migration_complete',
    ...databaseDescriptor(configuredEnv, { migration: true }),
    ...result,
  }));
} catch (error) {
  console.error(JSON.stringify({ level: 'error', event: 'migration_failed', message: error.message, stack: error.stack }));
  process.exitCode = 1;
} finally {
  await closeDatabasePools();
}
