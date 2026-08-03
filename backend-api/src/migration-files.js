import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

function migrationChecksum(sql) {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

function transactionBody(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !['BEGIN;', 'COMMIT;'].includes(line.trim().toUpperCase()))
    .join('\n');
}

export async function applySqlMigrationFiles(client, directoryUrl = new URL('../migrations/', import.meta.url)) {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migration_files (
    filename VARCHAR(255) PRIMARY KEY,
    checksum_sha256 CHAR(64) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const filenames = (await readdir(directoryUrl))
    .filter((name) => /^\d{3}_.+\.sql$/i.test(name))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
  const applied = [];
  const skipped = [];

  for (const filename of filenames) {
    const sql = await readFile(new URL(filename, directoryUrl), 'utf8');
    const checksum = migrationChecksum(sql);
    const existing = (await client.query(
      'SELECT checksum_sha256 FROM schema_migration_files WHERE filename=$1',
      [filename],
    )).rows[0];
    if (existing) {
      if (existing.checksum_sha256 !== checksum) {
        throw new Error(`Migration checksum mismatch for ${filename}. Published migration files are immutable.`);
      }
      skipped.push(filename);
      continue;
    }

    await client.query('BEGIN');
    try {
      await client.query(transactionBody(sql));
      await client.query(
        'INSERT INTO schema_migration_files(filename,checksum_sha256) VALUES($1,$2)',
        [filename, checksum],
      );
      await client.query('COMMIT');
      applied.push(filename);
    } catch (error) {
      await client.query('ROLLBACK');
      error.message = `Migration ${filename} failed: ${error.message}`;
      throw error;
    }
  }

  return { applied, skipped, total: filenames.length };
}

