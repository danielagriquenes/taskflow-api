import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, type Task } from '../generated/prisma/client';
import { TaskStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TasksService } from './tasks.service';

const TASK_ID = '3f2b8c1e-6d4a-4e2f-9b7a-1c5d8e9f0a12';

const buildTask = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  title: 'Prepare sprint review',
  description: null,
  status: TaskStatus.PENDING,
  assignee: 'ana.garcia',
  dueDate: new Date('2026-12-31T17:00:00.000Z'),
  createdAt: new Date('2026-11-14T10:00:00.000Z'),
  updatedAt: new Date('2026-11-14T10:00:00.000Z'),
  ...overrides,
});

const prismaError = (code: string): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('Prisma error', { code, clientVersion: 'test' });

/** Uses the DTO's own defaults (page=1, limit=10), as the ValidationPipe would. */
const buildQuery = (overrides: Partial<ListTasksQueryDto> = {}): ListTasksQueryDto =>
  Object.assign(new ListTasksQueryDto(), overrides);

describe('TasksService', () => {
  let service: TasksService;
  const prisma = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // Resolves the array of queries just like an interactive-less Prisma transaction.
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(TasksService);
  });

  describe('create', () => {
    it('persists the validated DTO and returns the created task', async () => {
      const dto: CreateTaskDto = {
        title: 'Prepare sprint review',
        assignee: 'ana.garcia',
        dueDate: new Date('2026-12-31T17:00:00.000Z'),
      };
      const created = buildTask();
      prisma.task.create.mockResolvedValue(created);

      await expect(service.create(dto)).resolves.toBe(created);
      expect(prisma.task.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('findAll', () => {
    it('combines filters, applies offset pagination and returns metadata', async () => {
      const tasks = [buildTask()];
      prisma.task.findMany.mockResolvedValue(tasks);
      prisma.task.count.mockResolvedValue(25);

      const result = await service.findAll(
        buildQuery({ status: TaskStatus.IN_PROGRESS, assignee: 'ana.garcia', page: 2, limit: 10 }),
      );

      const where = { status: TaskStatus.IN_PROGRESS, assignee: 'ana.garcia' };
      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 10,
        take: 10,
      });
      expect(prisma.task.count).toHaveBeenCalledWith({ where });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: tasks,
        meta: { total: 25, page: 2, limit: 10, totalPages: 3 },
      });
    });

    it('leaves filters undefined when none are provided and reports zero pages when empty', async () => {
      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(buildQuery());

      expect(prisma.task.count).toHaveBeenCalledWith({
        where: { status: undefined, assignee: undefined },
      });
      expect(result.meta).toEqual({ total: 0, page: 1, limit: 10, totalPages: 0 });
    });
  });

  describe('findOne', () => {
    it('returns the task when it exists', async () => {
      const task = buildTask();
      prisma.task.findUnique.mockResolvedValue(task);

      await expect(service.findOne(TASK_ID)).resolves.toBe(task);
      expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: TASK_ID } });
    });

    it('throws NotFoundException when the task does not exist', async () => {
      prisma.task.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TASK_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      const updated = buildTask({ status: TaskStatus.COMPLETED });
      prisma.task.update.mockResolvedValue(updated);

      await expect(service.update(TASK_ID, { status: TaskStatus.COMPLETED })).resolves.toBe(
        updated,
      );
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: TASK_ID },
        data: { status: TaskStatus.COMPLETED },
      });
    });

    it('maps Prisma P2025 (record not found) to NotFoundException', async () => {
      prisma.task.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.update(TASK_ID, { title: 'New' })).rejects.toThrow(
        new NotFoundException(`Task with id "${TASK_ID}" was not found`),
      );
    });

    it('rethrows unexpected database errors unchanged', async () => {
      const error = prismaError('P1001');
      prisma.task.update.mockRejectedValue(error);

      await expect(service.update(TASK_ID, { title: 'New' })).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('deletes the task', async () => {
      prisma.task.delete.mockResolvedValue(buildTask());

      await expect(service.remove(TASK_ID)).resolves.toBeUndefined();
      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: TASK_ID } });
    });

    it('maps Prisma P2025 (record not found) to NotFoundException', async () => {
      prisma.task.delete.mockRejectedValue(prismaError('P2025'));

      await expect(service.remove(TASK_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
