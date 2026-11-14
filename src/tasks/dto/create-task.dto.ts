import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimString, toIsoDate } from '../../common/transformers/string.transformers';
import { TaskStatus } from '../../generated/prisma/enums';
import {
  TASK_ASSIGNEE_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
} from '../tasks.constants';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Short summary of the task. Leading/trailing whitespace is trimmed.',
    example: 'Prepare sprint review',
    minLength: 1,
    maxLength: TASK_TITLE_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TASK_TITLE_MAX_LENGTH)
  title!: string;

  @ApiPropertyOptional({
    description: 'Optional details. Send `null` on update to clear it.',
    example: 'Collect demo notes from every squad and build the slide deck.',
    maxLength: TASK_DESCRIPTION_MAX_LENGTH,
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(TASK_DESCRIPTION_MAX_LENGTH)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Current status. Defaults to PENDING when omitted on creation.',
    enum: TaskStatus,
    enumName: 'TaskStatus',
    example: TaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Person responsible for the task.',
    example: 'ana.garcia',
    minLength: 1,
    maxLength: TASK_ASSIGNEE_MAX_LENGTH,
  })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TASK_ASSIGNEE_MAX_LENGTH)
  assignee!: string;

  @ApiProperty({
    description:
      'Due date in strict ISO 8601 format: a date (`2026-12-31`, interpreted as UTC midnight) or a date-time with offset.',
    type: String,
    format: 'date-time',
    example: '2026-12-31T17:00:00.000Z',
  })
  @Transform(toIsoDate)
  @IsDate({ message: 'dueDate must be a valid ISO 8601 date string' })
  dueDate!: Date;
}
