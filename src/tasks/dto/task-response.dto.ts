import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/pagination/pagination-meta.dto';
import { type Task } from '../../generated/prisma/client';
import { TaskStatus } from '../../generated/prisma/enums';

/** Swagger description of a task as returned by the API (dates serialised as ISO 8601). */
export class TaskResponseDto implements Task {
  @ApiProperty({ format: 'uuid', example: '3f2b8c1e-6d4a-4e2f-9b7a-1c5d8e9f0a12' })
  id!: string;

  @ApiProperty({ example: 'Prepare sprint review' })
  title!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Collect demo notes from every squad and build the slide deck.',
  })
  description!: string | null;

  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus', example: TaskStatus.PENDING })
  status!: TaskStatus;

  @ApiProperty({ example: 'ana.garcia' })
  assignee!: string;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-12-31T17:00:00.000Z' })
  dueDate!: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-14T10:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data!: TaskResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
