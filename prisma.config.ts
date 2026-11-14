import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `dotenv/config` never overrides variables that are already set, so an
// explicitly provided DATABASE_URL (e.g. the e2e test database) always wins
// over the value in `.env`.
//
// `process.env` is read directly (instead of Prisma's `env()` helper, which
// throws when the variable is missing) so that `prisma generate` also works
// in environments without a database, such as a fresh `npm install` or CI.
// Commands that need a connection (migrate, studio) still fail clearly.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
