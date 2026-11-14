import {
  applyDecorators,
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
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { type PaginatedResult } from '../common/pagination/pagination';
import { type Task } from '../generated/prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { PaginatedTasksResponseDto, TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

/** Shared Swagger metadata for routes addressing a single task by `:id`. */
const ApiTaskById = (): MethodDecorator =>
  applyDecorators(
    ApiParam({ name: 'id', format: 'uuid', description: 'Task identifier' }),
    ApiNotFoundResponse({ description: 'Task not found', type: ErrorResponseDto }),
  );

@ApiTags('tasks')
@ApiBadRequestResponse({ description: 'Invalid input', type: ErrorResponseDto })
@ApiInternalServerErrorResponse({ description: 'Unexpected error', type: ErrorResponseDto })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiCreatedResponse({ description: 'Task created', type: TaskResponseDto })
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List tasks',
    description: 'Paginated list, newest first. `status` and `assignee` filters can be combined.',
  })
  @ApiOkResponse({ description: 'Page of tasks', type: PaginatedTasksResponseDto })
  findAll(@Query() query: ListTasksQueryDto): Promise<PaginatedResult<Task>> {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiTaskById()
  @ApiOkResponse({ description: 'Task found', type: TaskResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Partially update a task',
    description: 'Only the provided fields are changed.',
  })
  @ApiTaskById()
  @ApiOkResponse({ description: 'Task updated', type: TaskResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiTaskById()
  @ApiNoContentResponse({ description: 'Task deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tasksService.remove(id);
  }
}
