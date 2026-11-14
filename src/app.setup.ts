import { type INestApplication, ValidationPipe } from '@nestjs/common';

export const API_PREFIX = 'api/v1';

/**
 * Cross-cutting HTTP configuration shared by `main.ts` and the e2e tests, so
 * the test suite exercises exactly the same pipeline as production.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
}
