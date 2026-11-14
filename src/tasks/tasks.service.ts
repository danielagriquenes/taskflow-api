import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta, type PaginatedResult, toSkip } from '../common/pagination/pagination';
import { Prisma, type Task } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateTaskDto } from './dto/create-task.dto';
import { type ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { type UpdateTaskDto } from './dto/update-task.dto';

/** Prisma error code raised when an update/delete target does not exist. */
const RECORD_NOT_FOUND = 'P2025';

/**
 * Business logic for tasks.
 *
 * - Receives DTOs that were already validated and normalised by the global
 *   `ValidationPipe` (trimmed strings, `dueDate` as a `Date`), so it does not
 *   re-validate input.
 * - Is the only layer that talks to the database, always through the
 *   injected {@link PrismaService}.
 * - Signals "task not found" with Nest's `NotFoundException`; any other error
 *   is propagated untouched and turned into a generic 500 by
 *   `AllExceptionsFilter`.
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a task. `status` defaults to `PENDING` at the database level;
   * `id`, `createdAt` and `updatedAt` are generated automatically.
   *
   * @param dto validated task data.
   * @returns the persisted task.
   */
  create(dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({ data: dto });
  }

  /**
   * Returns one page of tasks plus pagination metadata.
   *
   * Filters are optional and combined with AND: Prisma ignores `undefined`
   * values in `where`, so omitting a filter simply removes that condition.
   * Results are ordered newest first, with `id` as a tie-breaker so that two
   * tasks created in the same millisecond never appear on two pages (or none).
   * The page and the total count run in a single transaction so `meta.total`
   * is consistent with `data`.
   *
   * @param query validated filters and pagination (`page` >= 1, 1 <= `limit` <= 100).
   * @returns `{ data, meta }`; `data` is empty when `page` is beyond the last page.
   */
  async findAll(query: ListTasksQueryDto): Promise<PaginatedResult<Task>> {
    const { status, assignee, page, limit } = query;
    const where: Prisma.TaskWhereInput = { status, assignee };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Finds a task by its id.
   *
   * @param id task UUID (already validated by `ParseUUIDPipe`).
   * @returns the task.
   * @throws NotFoundException when no task has this id.
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw this.notFound(id);
    }
    return task;
  }

  /**
   * Partially updates a task: only properties present in `dto` are written
   * (`undefined` is ignored by Prisma; `description: null` clears it).
   * `updatedAt` is refreshed automatically by Prisma (`@updatedAt`).
   *
   * @param id task UUID.
   * @param dto validated subset of task fields.
   * @returns the updated task.
   * @throws NotFoundException when no task has this id.
   */
  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    try {
      return await this.prisma.task.update({ where: { id }, data: dto });
    } catch (error: unknown) {
      throw this.mapNotFound(error, id);
    }
  }

  /**
   * Permanently deletes a task.
   *
   * @param id task UUID.
   * @throws NotFoundException when no task has this id.
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id } });
    } catch (error: unknown) {
      throw this.mapNotFound(error, id);
    }
  }

  /**
   * Translates Prisma's "record not found" error (P2025) into a 404.
   *
   * Update/delete therefore need a single round trip instead of a prior
   * SELECT, which would also be subject to race conditions (the task could be
   * deleted between the check and the write). Any other error is returned
   * unchanged so the caller rethrows it.
   */
  private mapNotFound(error: unknown, id: string): unknown {
    const isNotFound =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND;
    return isNotFound ? this.notFound(id) : error;
  }

  /** Builds the 404 used consistently by every "task not found" case. */
  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Task with id "${id}" was not found`);
  }
}
