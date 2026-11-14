import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type PaginatedResult } from '../common/pagination/pagination';
import { type Task } from '../generated/prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';
import {
  ApiCreateTask,
  ApiDeleteTask,
  ApiGetTask,
  ApiListTasks,
  ApiUpdateTask,
} from './tasks.swagger';

/**
 * HTTP layer for tasks, mounted at `/api/v1/tasks`.
 *
 * Responsibilities are deliberately limited to HTTP concerns: routing, status
 * codes and wiring the validation pipes. By the time a handler runs, the
 * global `ValidationPipe` has already transformed and validated the DTOs and
 * `ParseUUIDPipe` has validated `:id`, so handlers simply delegate to
 * {@link TasksService}. Errors thrown by the service are formatted by the
 * global `AllExceptionsFilter`.
 *
 * Swagger metadata lives in `tasks.swagger.ts` to keep this class readable.
 */
@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * `POST /tasks` – creates a task.
   * @returns the created task with `201 Created`.
   */
  @Post()
  @ApiCreateTask()
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }

  /**
   * `GET /tasks` – lists tasks, optionally filtered by `status` and/or
   * `assignee`, paginated with `page`/`limit`.
   * @returns `{ data, meta }` with `200 OK`.
   */
  @Get()
  @ApiListTasks()
  findAll(@Query() query: ListTasksQueryDto): Promise<PaginatedResult<Task>> {
    return this.tasksService.findAll(query);
  }

  /**
   * `GET /tasks/:id` – returns a single task.
   * Responds `400` for a malformed UUID and `404` when the task does not exist.
   */
  @Get(':id')
  @ApiGetTask()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  /**
   * `PATCH /tasks/:id` – partially updates a task (only the provided fields).
   * Responds `400` for invalid input and `404` when the task does not exist.
   */
  @Patch(':id')
  @ApiUpdateTask()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    return this.tasksService.update(id, dto);
  }

  /**
   * `DELETE /tasks/:id` – deletes a task.
   * Responds `204 No Content` on success and `404` when the task does not exist.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteTask()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(id);
  }
}
