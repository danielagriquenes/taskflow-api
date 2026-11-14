import { HttpStatus, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { type Prisma } from '../src/generated/prisma/client';
import { TaskStatus } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';

/** JSON shape of a task as returned over HTTP (dates are ISO strings). */
interface TaskBody {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface PageBody {
  data: TaskBody[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

const TASKS_URL = '/api/v1/tasks';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';
const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('Tasks API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const api = (): ReturnType<typeof request> => request(app.getHttpServer());

  /** Inserts a task directly through Prisma; `minutesAgo` controls createdAt ordering. */
  const seedTask = async (
    overrides: Partial<Prisma.TaskCreateInput> = {},
    minutesAgo = 0,
  ): Promise<TaskBody> => {
    const task = await prisma.task.create({
      data: {
        title: 'Seeded task',
        assignee: 'ana.garcia',
        dueDate: new Date('2026-12-31T17:00:00.000Z'),
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
        ...overrides,
      },
    });
    return JSON.parse(JSON.stringify(task)) as TaskBody;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.task.deleteMany();
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await app.close();
  });

  describe('POST /api/v1/tasks', () => {
    it('creates a task with defaults and returns 201 with ISO 8601 dates', async () => {
      const res = await api()
        .post(TASKS_URL)
        .send({ title: '  Prepare sprint review ', assignee: 'ana.garcia', dueDate: '2026-12-31' })
        .expect(HttpStatus.CREATED);

      const body = res.body as TaskBody;
      expect(body).toMatchObject({
        title: 'Prepare sprint review',
        description: null,
        status: TaskStatus.PENDING,
        assignee: 'ana.garcia',
        dueDate: '2026-12-31T00:00:00.000Z',
      });
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body.createdAt).toMatch(ISO_8601_UTC);
      expect(body.updatedAt).toMatch(ISO_8601_UTC);
      await expect(prisma.task.count({ where: { id: body.id } })).resolves.toBe(1);
    });

    it('accepts an explicit status and description', async () => {
      const res = await api()
        .post(TASKS_URL)
        .send({
          title: 'Deploy',
          description: 'Release v1.2',
          status: TaskStatus.IN_PROGRESS,
          assignee: 'luis',
          dueDate: '2026-12-01T09:30:00+02:00',
        })
        .expect(HttpStatus.CREATED);

      expect(res.body as TaskBody).toMatchObject({
        description: 'Release v1.2',
        status: TaskStatus.IN_PROGRESS,
        dueDate: '2026-12-01T07:30:00.000Z',
      });
    });

    it('rejects an invalid payload with 400 and persists nothing', async () => {
      const res = await api()
        .post(TASKS_URL)
        .send({ title: '   ', assignee: 42, status: 'DONE', dueDate: '31/12/2026' })
        .expect(HttpStatus.BAD_REQUEST);

      const body = res.body as ErrorBody;
      expect(body).toMatchObject({ statusCode: 400, error: 'Bad Request', path: TASKS_URL });
      expect(body.message).toEqual(
        expect.arrayContaining([
          'title should not be empty',
          'assignee must be a string',
          'status must be one of the following values: PENDING, IN_PROGRESS, COMPLETED',
          'dueDate must be a valid ISO 8601 date string',
        ]),
      );
      await expect(prisma.task.count()).resolves.toBe(0);
    });

    it.each([
      ['missing required fields', {}],
      ['impossible date', { title: 'T', assignee: 'a', dueDate: '2026-02-30' }],
      ['unknown property', { title: 'T', assignee: 'a', dueDate: '2026-12-31', priority: 1 }],
    ])('returns 400 for %s', async (_label, payload) => {
      await api().post(TASKS_URL).send(payload).expect(HttpStatus.BAD_REQUEST);
    });

    it('returns 400 for malformed JSON', async () => {
      await api()
        .post(TASKS_URL)
        .set('Content-Type', 'application/json')
        .send('{"title":')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns the task', async () => {
      const task = await seedTask({ title: 'Find me' });

      const res = await api().get(`${TASKS_URL}/${task.id}`).expect(HttpStatus.OK);

      expect(res.body).toEqual(task);
    });

    it('returns 404 for a non-existent task', async () => {
      const res = await api().get(`${TASKS_URL}/${UNKNOWN_ID}`).expect(HttpStatus.NOT_FOUND);

      expect(res.body as ErrorBody).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: `Task with id "${UNKNOWN_ID}" was not found`,
      });
    });

    it('returns 400 for an invalid UUID', async () => {
      await api().get(`${TASKS_URL}/not-a-uuid`).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/tasks (filters & pagination)', () => {
    beforeEach(async () => {
      await seedTask({ title: 'A', assignee: 'ana', status: TaskStatus.PENDING }, 5);
      await seedTask({ title: 'B', assignee: 'ana', status: TaskStatus.COMPLETED }, 4);
      await seedTask({ title: 'C', assignee: 'luis', status: TaskStatus.PENDING }, 3);
      await seedTask({ title: 'D', assignee: 'luis', status: TaskStatus.IN_PROGRESS }, 2);
      await seedTask({ title: 'E', assignee: 'ana', status: TaskStatus.PENDING }, 1);
    });

    const titles = (body: PageBody): string[] => body.data.map((task) => task.title);

    it('lists all tasks newest first with default pagination metadata', async () => {
      const res = await api().get(TASKS_URL).expect(HttpStatus.OK);

      const body = res.body as PageBody;
      expect(titles(body)).toEqual(['E', 'D', 'C', 'B', 'A']);
      expect(body.meta).toEqual({ total: 5, page: 1, limit: 10, totalPages: 1 });
    });

    it('filters by status', async () => {
      const res = await api()
        .get(TASKS_URL)
        .query({ status: TaskStatus.PENDING })
        .expect(HttpStatus.OK);

      expect(titles(res.body as PageBody)).toEqual(['E', 'C', 'A']);
    });

    it('filters by assignee', async () => {
      const res = await api().get(TASKS_URL).query({ assignee: 'luis' }).expect(HttpStatus.OK);

      expect(titles(res.body as PageBody)).toEqual(['D', 'C']);
    });

    it('combines status and assignee filters', async () => {
      const res = await api()
        .get(TASKS_URL)
        .query({ status: TaskStatus.PENDING, assignee: 'ana' })
        .expect(HttpStatus.OK);

      const body = res.body as PageBody;
      expect(titles(body)).toEqual(['E', 'A']);
      expect(body.meta.total).toBe(2);
    });

    it('paginates without overlapping pages and reports metadata', async () => {
      const page1 = await api().get(TASKS_URL).query({ page: 1, limit: 2 }).expect(HttpStatus.OK);
      const page3 = await api().get(TASKS_URL).query({ page: 3, limit: 2 }).expect(HttpStatus.OK);
      const beyond = await api().get(TASKS_URL).query({ page: 4, limit: 2 }).expect(HttpStatus.OK);

      expect(titles(page1.body as PageBody)).toEqual(['E', 'D']);
      expect((page1.body as PageBody).meta).toEqual({ total: 5, page: 1, limit: 2, totalPages: 3 });
      expect(titles(page3.body as PageBody)).toEqual(['A']);
      expect((beyond.body as PageBody).data).toEqual([]);
    });

    it.each([
      ['page=0', { page: 0 }],
      ['negative page', { page: -1 }],
      ['non-numeric limit', { limit: 'ten' }],
      ['limit above maximum', { limit: 101 }],
      ['invalid status filter', { status: 'DONE' }],
      ['unknown query parameter', { sort: 'title' }],
    ])('returns 400 for %s', async (_label, query) => {
      await api().get(TASKS_URL).query(query).expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates only the provided fields and refreshes updatedAt', async () => {
      const task = await seedTask({ description: 'Initial', createdAt: new Date('2026-01-01') });

      const res = await api()
        .patch(`${TASKS_URL}/${task.id}`)
        .send({ status: TaskStatus.COMPLETED, description: null })
        .expect(HttpStatus.OK);

      const body = res.body as TaskBody;
      expect(body).toMatchObject({
        id: task.id,
        title: task.title,
        assignee: task.assignee,
        dueDate: task.dueDate,
        status: TaskStatus.COMPLETED,
        description: null,
      });
      expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(
        new Date(task.updatedAt).getTime(),
      );
    });

    it('returns 400 for invalid values, including null on required fields', async () => {
      const task = await seedTask();

      await api()
        .patch(`${TASKS_URL}/${task.id}`)
        .send({ status: 'ARCHIVED' })
        .expect(HttpStatus.BAD_REQUEST);
      await api()
        .patch(`${TASKS_URL}/${task.id}`)
        .send({ title: null })
        .expect(HttpStatus.BAD_REQUEST);
      await api()
        .patch(`${TASKS_URL}/${task.id}`)
        .send({ dueDate: 'next friday' })
        .expect(HttpStatus.BAD_REQUEST);

      await expect(prisma.task.findUnique({ where: { id: task.id } })).resolves.toMatchObject({
        title: task.title,
        status: task.status,
      });
    });

    it('returns 404 for a non-existent task', async () => {
      await api()
        .patch(`${TASKS_URL}/${UNKNOWN_ID}`)
        .send({ title: 'Nope' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes the task and returns 204 with an empty body', async () => {
      const task = await seedTask();

      const res = await api().delete(`${TASKS_URL}/${task.id}`).expect(HttpStatus.NO_CONTENT);

      expect(res.text).toBe('');
      await api().get(`${TASKS_URL}/${task.id}`).expect(HttpStatus.NOT_FOUND);
    });

    it('returns 404 for a non-existent task', async () => {
      await api().delete(`${TASKS_URL}/${UNKNOWN_ID}`).expect(HttpStatus.NOT_FOUND);
    });

    it('returns 400 for an invalid UUID', async () => {
      await api().delete(`${TASKS_URL}/123`).expect(HttpStatus.BAD_REQUEST);
    });
  });
});
