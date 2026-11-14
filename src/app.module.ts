import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';

/**
 * Root module.
 *
 * - `ConfigModule`: loads `.env` and validates it at startup (fail fast).
 * - `PrismaModule`: global, provides the single `PrismaService`.
 * - `TasksModule`: the tasks feature (controller + service).
 * - `APP_FILTER`: registers `AllExceptionsFilter` globally through DI so every
 *   error, including those raised in tests built from this module, shares the
 *   same response format.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    TasksModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
