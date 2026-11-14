import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
} from '../../common/pagination/pagination';
import { trimString } from '../../common/transformers/string.transformers';
import { TaskStatus } from '../../generated/prisma/enums';
import { TASK_ASSIGNEE_MAX_LENGTH } from '../tasks.constants';

/** Query string for `GET /tasks`. All filters are optional and combinable. */
export class ListTasksQueryDto {
  @ApiPropertyOptional({
    description: 'Return only tasks with this status.',
    enum: TaskStatus,
    enumName: 'TaskStatus',
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Return only tasks assigned to this person (exact, case-sensitive match).',
    example: 'ana.garcia',
    maxLength: TASK_ASSIGNEE_MAX_LENGTH,
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(TASK_ASSIGNEE_MAX_LENGTH)
  assignee?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based).',
    type: Number,
    minimum: 1,
    maximum: MAX_PAGE,
    default: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: 'Page size.',
    type: Number,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;
}
