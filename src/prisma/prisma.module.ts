import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module exposing {@link PrismaService}. Declared `@Global()` because
 * database access is infrastructure every feature module needs, so features
 * can inject `PrismaService` without importing this module explicitly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
