/**
 * OpenAPI (Swagger) documentation for the tasks endpoints.
 *
 * Kept apart from `TasksController` so the controller stays focused on HTTP
 * routing. Each `Api*Task` decorator bundles everything Swagger UI shows for
 * one operation: summary, behaviour notes, selectable request examples and
 * example responses for every status code the endpoint can return.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { TaskStatus } from '../generated/prisma/enums';
import { CreateTaskDto } from './dto/create-task.dto';
import { PaginatedTasksResponseDto, TaskResponseDto } from './dto/task-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

const EXAMPLE_ID = '0b7e2a5c-1f4d-4c8e-9a3b-000000000006';
const EXAMPLE_TIMESTAMP = '2026-11-14T10:00:00.000Z';

const EXAMPLE_TASK = {
  id: EXAMPLE_ID,
  title: 'Preparar la demo para el cliente',
  description: 'Guion, datos de ejemplo y entorno de demostración estable.',
  status: TaskStatus.PENDING,
  assignee: 'carmen.lopez',
  dueDate: '2026-11-27T09:00:00.000Z',
  createdAt: EXAMPLE_TIMESTAMP,
  updatedAt: EXAMPLE_TIMESTAMP,
};

/** Builds an `ErrorResponseDto` example exactly as `AllExceptionsFilter` returns it. */
const errorExample = (
  statusCode: number,
  error: string,
  message: string | string[],
  path: string,
): ErrorResponseDto => ({ statusCode, error, message, path, timestamp: EXAMPLE_TIMESTAMP });

const TASK_PATH = `/api/v1/tasks/${EXAMPLE_ID}`;

const INVALID_UUID_EXAMPLE = {
  summary: 'Invalid UUID in the path',
  value: errorExample(
    400,
    'Bad Request',
    'Validation failed (uuid is expected)',
    '/api/v1/tasks/123',
  ),
};

const NOT_FOUND_EXAMPLE = errorExample(
  404,
  'Not Found',
  `Task with id "${EXAMPLE_ID}" was not found`,
  TASK_PATH,
);

/** 500 is documented on every operation: internals are never exposed. */
const ApiInternalError = (): MethodDecorator =>
  ApiInternalServerErrorResponse({
    description:
      'Unexpected server error. The response is always generic; details are only logged server-side.',
    type: ErrorResponseDto,
    example: errorExample(
      500,
      'Internal Server Error',
      'An unexpected error occurred',
      '/api/v1/tasks',
    ),
  });

/** `:id` path parameter plus its 400 (malformed UUID) and 404 (unknown task) responses. */
const ApiTaskIdParam = (): MethodDecorator =>
  applyDecorators(
    ApiParam({
      name: 'id',
      format: 'uuid',
      description: 'Task identifier (UUID).',
      example: EXAMPLE_ID,
    }),
    ApiNotFoundResponse({
      description: 'No task exists with this id.',
      type: ErrorResponseDto,
      example: NOT_FOUND_EXAMPLE,
    }),
  );

export const ApiCreateTask = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a task',
      description: [
        '`title`, `assignee` and `dueDate` are required. `status` defaults to `PENDING`.',
        '',
        '- Strings are trimmed; blank values are rejected.',
        '- `dueDate` must be strict ISO 8601: a date (`2026-12-31`, stored as UTC midnight) or a date-time with offset.',
        '- Unknown properties are rejected.',
      ].join('\n'),
    }),
    // A `$ref` body does not register the model by itself; ApiExtraModels does.
    ApiExtraModels(CreateTaskDto),
    ApiBody({
      schema: { $ref: getSchemaPath(CreateTaskDto) },
      examples: {
        minimal: {
          summary: 'Required fields only',
          value: {
            title: 'Planificar la sprint 13',
            assignee: 'ana.garcia',
            dueDate: '2026-12-31',
          },
        },
        complete: {
          summary: 'All fields',
          value: {
            title: 'Preparar la demo para el cliente',
            description: 'Guion, datos de ejemplo y entorno de demostración estable.',
            status: TaskStatus.IN_PROGRESS,
            assignee: 'carmen.lopez',
            dueDate: '2026-11-27T10:00:00+01:00',
          },
        },
        invalid: {
          summary: 'Invalid payload (returns 400)',
          value: { title: '   ', assignee: 42, status: 'DONE', dueDate: '31/12/2026' },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'Task created.',
      type: TaskResponseDto,
      example: EXAMPLE_TASK,
    }),
    ApiBadRequestResponse({
      description: 'The body failed validation or is not valid JSON.',
      type: ErrorResponseDto,
      examples: {
        validation: {
          summary: 'Validation errors',
          value: errorExample(
            400,
            'Bad Request',
            [
              'title should not be empty',
              'assignee must be a string',
              'status must be one of the following values: PENDING, IN_PROGRESS, COMPLETED',
              'dueDate must be a valid ISO 8601 date string',
            ],
            '/api/v1/tasks',
          ),
        },
        unknownProperty: {
          summary: 'Unknown property',
          value: errorExample(
            400,
            'Bad Request',
            ['property priority should not exist'],
            '/api/v1/tasks',
          ),
        },
      },
    }),
    ApiInternalError(),
  );

export const ApiListTasks = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({
      summary: 'List tasks (filterable, paginated)',
      description: [
        'Returns tasks newest first (`createdAt` desc, `id` as tie-breaker).',
        '',
        '- `status` and `assignee` are optional and **combinable** (logical AND).',
        '- `page` defaults to 1 and `limit` to 10 (max 100).',
        '- A page beyond the last one returns an empty `data` array with the real `meta`.',
        '- Unknown query parameters are rejected.',
      ].join('\n'),
    }),
    ApiOkResponse({
      description: 'A page of tasks with pagination metadata.',
      type: PaginatedTasksResponseDto,
      example: {
        data: [EXAMPLE_TASK],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid filter or pagination parameter.',
      type: ErrorResponseDto,
      examples: {
        pagination: {
          summary: 'Invalid pagination',
          value: errorExample(
            400,
            'Bad Request',
            ['page must not be less than 1', 'limit must not be greater than 100'],
            '/api/v1/tasks?page=0&limit=500',
          ),
        },
        status: {
          summary: 'Invalid status filter',
          value: errorExample(
            400,
            'Bad Request',
            ['status must be one of the following values: PENDING, IN_PROGRESS, COMPLETED'],
            '/api/v1/tasks?status=DONE',
          ),
        },
      },
    }),
    ApiInternalError(),
  );

export const ApiGetTask = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({ summary: 'Get a task by id' }),
    ApiTaskIdParam(),
    ApiOkResponse({ description: 'The task.', type: TaskResponseDto, example: EXAMPLE_TASK }),
    ApiBadRequestResponse({
      description: 'The id is not a valid UUID.',
      type: ErrorResponseDto,
      examples: { invalidUuid: INVALID_UUID_EXAMPLE },
    }),
    ApiInternalError(),
  );

export const ApiUpdateTask = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({
      summary: 'Partially update a task',
      description: [
        'Only the fields present in the body are changed; `updatedAt` is refreshed automatically.',
        '',
        '- Send `"description": null` to clear the description.',
        '- `null` is rejected for required fields (`title`, `assignee`, `status`, `dueDate`).',
        '- Same validation rules as creation.',
      ].join('\n'),
    }),
    ApiTaskIdParam(),
    ApiExtraModels(UpdateTaskDto),
    ApiBody({
      schema: { $ref: getSchemaPath(UpdateTaskDto) },
      examples: {
        complete: {
          summary: 'Mark as completed',
          value: { status: TaskStatus.COMPLETED },
        },
        reschedule: {
          summary: 'Reassign and reschedule',
          value: { assignee: 'jorge.ruiz', dueDate: '2026-12-15T17:00:00Z' },
        },
        clearDescription: {
          summary: 'Clear the description',
          value: { description: null },
        },
      },
    }),
    ApiOkResponse({
      description: 'The updated task.',
      type: TaskResponseDto,
      example: {
        ...EXAMPLE_TASK,
        status: TaskStatus.COMPLETED,
        updatedAt: '2026-11-15T08:30:00.000Z',
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid UUID or invalid body.',
      type: ErrorResponseDto,
      examples: {
        invalidUuid: INVALID_UUID_EXAMPLE,
        nullRequired: {
          summary: 'null on a required field',
          value: errorExample(
            400,
            'Bad Request',
            [
              'title must be shorter than or equal to 200 characters',
              'title should not be empty',
              'title must be a string',
            ],
            TASK_PATH,
          ),
        },
      },
    }),
    ApiInternalError(),
  );

export const ApiDeleteTask = (): MethodDecorator =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a task',
      description: 'Permanently deletes the task. Returns an empty body.',
    }),
    ApiTaskIdParam(),
    ApiNoContentResponse({ description: 'Task deleted (empty body).' }),
    ApiBadRequestResponse({
      description: 'The id is not a valid UUID.',
      type: ErrorResponseDto,
      examples: { invalidUuid: INVALID_UUID_EXAMPLE },
    }),
    ApiInternalError(),
  );
