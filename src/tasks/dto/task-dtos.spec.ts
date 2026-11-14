import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { TaskStatus } from '../../generated/prisma/enums';
import { CreateTaskDto } from './create-task.dto';
import { ListTasksQueryDto } from './list-tasks-query.dto';
import { UpdateTaskDto } from './update-task.dto';

type DtoClass<T> = new () => T;

/** Mirrors the global ValidationPipe: transform, then validate with whitelist rules. */
async function validateDto<T extends object>(
  cls: DtoClass<T>,
  payload: Record<string, unknown>,
): Promise<{ instance: T; errors: ValidationError[] }> {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  return { instance, errors };
}

const invalidProperties = (errors: ValidationError[]): string[] =>
  errors.map((error) => error.property).sort();

const validTask = {
  title: '  Prepare sprint review  ',
  assignee: ' ana.garcia ',
  dueDate: '2026-12-31T17:00:00Z',
};

describe('CreateTaskDto', () => {
  it('accepts a valid payload, trims strings and converts dueDate to a Date', async () => {
    const { instance, errors } = await validateDto(CreateTaskDto, validTask);

    expect(errors).toHaveLength(0);
    expect(instance.title).toBe('Prepare sprint review');
    expect(instance.assignee).toBe('ana.garcia');
    expect(instance.dueDate).toEqual(new Date('2026-12-31T17:00:00.000Z'));
  });

  it('accepts a date-only ISO 8601 dueDate', async () => {
    const { instance, errors } = await validateDto(CreateTaskDto, {
      ...validTask,
      dueDate: '2026-12-31',
    });

    expect(errors).toHaveLength(0);
    expect(instance.dueDate.toISOString()).toBe('2026-12-31T00:00:00.000Z');
  });

  it('rejects missing and blank required fields', async () => {
    const { errors } = await validateDto(CreateTaskDto, { title: '   ', assignee: '' });

    expect(invalidProperties(errors)).toEqual(['assignee', 'dueDate', 'title']);
  });

  it.each([
    ['non-ISO format', '31/12/2026'],
    ['impossible calendar date', '2026-02-30'],
    ['unix timestamp', 1767200400000],
    ['free text', 'tomorrow'],
  ])('rejects an invalid dueDate (%s)', async (_label, dueDate) => {
    const { errors } = await validateDto(CreateTaskDto, { ...validTask, dueDate });

    expect(invalidProperties(errors)).toEqual(['dueDate']);
  });

  it('rejects wrong field types, unknown status values and unknown properties', async () => {
    const { errors } = await validateDto(CreateTaskDto, {
      ...validTask,
      title: 123,
      status: 'DONE',
      priority: 'high',
    });

    expect(invalidProperties(errors)).toEqual(['priority', 'status', 'title']);
  });

  it('rejects strings longer than the column limits', async () => {
    const { errors } = await validateDto(CreateTaskDto, {
      ...validTask,
      title: 'x'.repeat(201),
      assignee: 'x'.repeat(101),
    });

    expect(invalidProperties(errors)).toEqual(['assignee', 'title']);
  });
});

describe('UpdateTaskDto', () => {
  it('accepts a partial payload', async () => {
    const { errors } = await validateDto(UpdateTaskDto, { status: TaskStatus.COMPLETED });

    expect(errors).toHaveLength(0);
  });

  it('rejects null for required columns but allows clearing the description', async () => {
    const { errors } = await validateDto(UpdateTaskDto, {
      title: null,
      dueDate: null,
      description: null,
    });

    expect(invalidProperties(errors)).toEqual(['dueDate', 'title']);
  });
});

describe('ListTasksQueryDto', () => {
  it('applies default pagination when no query is given', async () => {
    const { instance, errors } = await validateDto(ListTasksQueryDto, {});

    expect(errors).toHaveLength(0);
    expect(instance).toMatchObject({ page: 1, limit: 10 });
  });

  it('converts numeric query strings and accepts combined filters', async () => {
    const { instance, errors } = await validateDto(ListTasksQueryDto, {
      status: 'IN_PROGRESS',
      assignee: 'ana.garcia',
      page: '3',
      limit: '25',
    });

    expect(errors).toHaveLength(0);
    expect(instance).toMatchObject({
      status: TaskStatus.IN_PROGRESS,
      assignee: 'ana.garcia',
      page: 3,
      limit: 25,
    });
  });

  it.each([
    ['page=0', { page: '0' }, 'page'],
    ['page not a number', { page: 'abc' }, 'page'],
    ['decimal limit', { limit: '1.5' }, 'limit'],
    ['limit above maximum', { limit: '101' }, 'limit'],
    ['unknown status', { status: 'DONE' }, 'status'],
  ])('rejects invalid query (%s)', async (_label, query, property) => {
    const { errors } = await validateDto(ListTasksQueryDto, query);

    expect(invalidProperties(errors)).toEqual([property]);
  });
});
