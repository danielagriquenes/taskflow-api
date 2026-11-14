import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta, type PaginatedResult, toSkip } from '../common/pagination/pagination';
import { Prisma, type Task } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { type CreateTaskDto } from './dto/create-task.dto';
import { type ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { type UpdateTaskDto } from './dto/update-task.dto';

/** Prisma error code raised when an update/delete target does not exist. */
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTaskDto): Promise<Task> {
    return this.prisma.task.create({ data: dto });
  }

  async findAll(query: ListTasksQueryDto): Promise<PaginatedResult<Task>> {
    const { status, assignee, page, limit } = query;
    // Undefined filters are ignored by Prisma, which makes them combinable.
    const where: Prisma.TaskWhereInput = { status, assignee };

    // Same transaction so `data` and `total` reflect a consistent snapshot.
    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        // `id` breaks ties so pages never overlap or skip records.
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw this.notFound(id);
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    try {
      return await this.prisma.task.update({ where: { id }, data: dto });
    } catch (error: unknown) {
      throw this.mapNotFound(error, id);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.task.delete({ where: { id } });
    } catch (error: unknown) {
      throw this.mapNotFound(error, id);
    }
  }

  /**
   * Single round trip for update/delete: rely on Prisma's P2025 instead of a
   * prior SELECT, which would also be subject to race conditions.
   */
  private mapNotFound(error: unknown, id: string): unknown {
    const isNotFound =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND;
    return isNotFound ? this.notFound(id) : error;
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Task with id "${id}" was not found`);
  }
}
