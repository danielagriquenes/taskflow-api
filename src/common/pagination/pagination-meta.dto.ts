import { ApiProperty } from '@nestjs/swagger';
import { type PaginationMeta } from './pagination';

export class PaginationMetaDto implements PaginationMeta {
  @ApiProperty({ description: 'Total records matching the filters.', example: 42 })
  total!: number;

  @ApiProperty({ description: 'Current page (1-based).', example: 1 })
  page!: number;

  @ApiProperty({ description: 'Page size used for this response.', example: 10 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages (0 when empty).', example: 5 })
  totalPages!: number;
}
