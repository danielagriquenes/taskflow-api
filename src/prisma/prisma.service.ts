import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { type EnvironmentVariables } from '../config/env.validation';
import { PrismaClient } from '../generated/prisma/client';

/**
 * Single, application-wide Prisma client.
 *
 * Database access is isolated behind this injectable so services depend on
 * Nest DI (and can be unit-tested with a mock) instead of a global client.
 * Prisma 7 talks to PostgreSQL through a driver adapter; here it is the
 * `pg`-based `PrismaPg`, configured from the validated `DATABASE_URL`.
 *
 * Usage: inject it and use the generated delegates, e.g. `prisma.task.findMany()`.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
    });
  }

  /** Opens the connection pool when the application boots. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Closes the pool on shutdown (enabled by `app.enableShutdownHooks()` and `app.close()`). */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
