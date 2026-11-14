import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

/**
 * Every field is optional for PATCH, but `skipNullProperties: false` makes an
 * explicit `null` fail validation for required columns (title, assignee,
 * status, dueDate). `description` keeps its own `@IsOptional()`, so sending
 * `null` clears it.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto, { skipNullProperties: false }) {}
