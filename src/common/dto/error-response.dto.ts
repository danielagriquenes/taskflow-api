import { ApiProperty } from '@nestjs/swagger';

/** Uniform error payload returned by every endpoint. */
export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    description: 'Human-readable message, or the list of validation errors.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: ['title should not be empty', 'dueDate must be a valid ISO 8601 date string'],
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/v1/tasks' })
  path!: string;

  @ApiProperty({ format: 'date-time', example: '2026-11-14T10:00:00.000Z' })
  timestamp!: string;
}
