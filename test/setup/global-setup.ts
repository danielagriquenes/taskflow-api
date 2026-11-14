import { execSync } from 'node:child_process';
import { loadTestEnv } from './test-env';

/**
 * Brings the isolated test database to the latest schema using the real
 * Prisma migrations, exactly as a fresh environment would be provisioned.
 */
export default function globalSetup(): void {
  loadTestEnv();
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
