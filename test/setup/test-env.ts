import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TEST_ENV_FILE = resolve(__dirname, '../../.env.test');
const TEST_DATABASE_SUFFIX = '_test';

/**
 * Loads `.env.test` (overriding any inherited DATABASE_URL) and refuses to
 * continue unless the target database is clearly a test database. The e2e
 * suite deletes data, so it must never reach a development or production DB.
 */
export function loadTestEnv(): void {
  if (existsSync(TEST_ENV_FILE)) {
    config({ path: TEST_ENV_FILE, override: true, quiet: true });
  }
  process.env.NODE_ENV = 'test';
  assertSafeTestDatabase(process.env.DATABASE_URL);
}

function assertSafeTestDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set for e2e tests. Copy .env.test.example to .env.test.');
  }

  const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''));
  if (!databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    throw new Error(
      `Refusing to run e2e tests against database "${databaseName}": ` +
        `its name must end with "${TEST_DATABASE_SUFFIX}".`,
    );
  }
}
