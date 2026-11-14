/** Uniform error payload returned by every endpoint. */
export class ErrorResponseDto {
  statusCode!: number;
  error!: string;
  message!: string | string[];
  path!: string;
  timestamp!: string;
}
