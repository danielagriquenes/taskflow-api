import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { setupSwagger } from '../src/swagger';

interface OpenApiDocument {
  paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
  components: { schemas: Record<string, { required?: string[] }> };
}

/**
 * Guards the published API contract: Swagger must be served, document every
 * operation with its status codes, and never reference a missing schema.
 */
describe('Swagger / OpenAPI (e2e)', () => {
  let app: INestApplication<App>;
  let document: OpenApiDocument;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    setupSwagger(app);
    await app.init();

    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(HttpStatus.OK);
    document = res.body as OpenApiDocument;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves Swagger UI at /api/docs', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs').expect(HttpStatus.OK);
    expect(res.text).toContain('swagger-ui');
  });

  it('documents every task operation with its possible status codes', () => {
    const codes = (path: string, method: string): string[] =>
      Object.keys(document.paths[path][method].responses).sort();

    expect(codes('/api/v1/tasks', 'post')).toEqual(['201', '400', '500']);
    expect(codes('/api/v1/tasks', 'get')).toEqual(['200', '400', '500']);
    expect(codes('/api/v1/tasks/{id}', 'get')).toEqual(['200', '400', '404', '500']);
    expect(codes('/api/v1/tasks/{id}', 'patch')).toEqual(['200', '400', '404', '500']);
    expect(codes('/api/v1/tasks/{id}', 'delete')).toEqual(['204', '400', '404', '500']);
  });

  it('has no dangling schema references and documents required fields', () => {
    const refs = JSON.stringify(document.paths).match(/#\/components\/schemas\/\w+/g) ?? [];
    const missing = [...new Set(refs)]
      .map((ref) => ref.split('/').pop() ?? '')
      .filter((name) => !(name in document.components.schemas));

    expect(missing).toEqual([]);
    expect(document.components.schemas.CreateTaskDto.required?.sort()).toEqual([
      'assignee',
      'dueDate',
      'title',
    ]);
  });
});
