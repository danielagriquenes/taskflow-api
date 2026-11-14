import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Swagger UI path (outside the `/api/v1` prefix). The JSON spec is served at `${SWAGGER_PATH}-json`. */
export const SWAGGER_PATH = 'api/docs';

/** Markdown shown at the top of Swagger UI: conventions shared by every endpoint. */
const API_DESCRIPTION = `
RESTful task management API.

### Conventions
- **Base path:** \`/api/v1\`
- **Dates:** ISO 8601. Inputs accept a date (\`2026-12-31\`, UTC midnight) or a date-time with offset;
  responses are always UTC (\`2026-12-31T17:00:00.000Z\`).
- **Pagination:** \`page\` (default 1) and \`limit\` (default 10, max 100). Lists return \`{ data, meta }\`.
- **Validation:** unknown body properties and unknown query parameters are rejected with \`400\`.
- **Errors:** every error uses the \`ErrorResponseDto\` shape
  (\`statusCode\`, \`error\`, \`message\`, \`path\`, \`timestamp\`). \`500\` responses are generic and never
  expose internal details.

### Status codes
\`200\` OK · \`201\` Created · \`204\` No Content · \`400\` Bad Request · \`404\` Not Found · \`500\` Internal Server Error
`;

/**
 * Builds the OpenAPI document from the controller/DTO decorators and
 * publishes Swagger UI at `/api/docs` and the raw spec at `/api/docs-json`.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TaskFlow API')
    .setDescription(API_DESCRIPTION)
    .setVersion('1.0')
    .addTag('tasks', 'Create, list, filter, paginate, update and delete tasks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'TaskFlow API · Docs',
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    },
  });
}
