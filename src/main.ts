import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { type EnvironmentVariables } from './config/env.validation';
import { setupSwagger, SWAGGER_PATH } from './swagger';

/**
 * Application entry point.
 *
 * 1. Creates the Nest app (env validation runs here and aborts on bad config).
 * 2. Applies the shared HTTP pipeline (`/api/v1` prefix + validation).
 * 3. Publishes Swagger at `/api/docs`.
 * 4. Enables graceful shutdown so the database pool is closed on SIGTERM/SIGINT.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();

  const config = app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });

  await app.listen(port);
  Logger.log(`TaskFlow API listening on port ${port}`, 'Bootstrap');
  Logger.log(`Swagger UI available at http://localhost:${port}/${SWAGGER_PATH}`, 'Bootstrap');
}

void bootstrap();
