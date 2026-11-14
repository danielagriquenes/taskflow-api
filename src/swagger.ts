import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

/** Publishes the OpenAPI UI at `/api/docs` and the raw spec at `/api/docs-json`. */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription(
      'RESTful task management API. All dates are ISO 8601. Errors share the `ErrorResponseDto` shape.',
    )
    .setVersion('1.0')
    .addTag('tasks', 'Create, list, update and delete tasks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
