import { type ArgumentsHost, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { type HttpAdapterHost } from '@nestjs/core';
import { type ErrorResponseDto } from '../dto/error-response.dto';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const reply = jest.fn();
  const httpAdapterHost = {
    httpAdapter: { reply, getRequestUrl: (): string => '/api/v1/tasks' },
  } as unknown as HttpAdapterHost;
  const host = {
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => ({}) }),
  } as unknown as ArgumentsHost;

  const filter = new AllExceptionsFilter(httpAdapterHost);

  const lastBody = (): ErrorResponseDto => {
    const [, body] = reply.mock.lastCall as [unknown, ErrorResponseDto, number];
    return body;
  };

  let logError: jest.SpyInstance;

  beforeEach(() => {
    reply.mockClear();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps status and validation messages of HttpExceptions', () => {
    filter.catch(new BadRequestException(['title should not be empty']), host);

    expect(reply).toHaveBeenCalledWith({}, expect.any(Object), 400);
    expect(lastBody()).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: ['title should not be empty'],
      path: '/api/v1/tasks',
    });
    expect(Date.parse(lastBody().timestamp)).not.toBeNaN();
  });

  it('returns 404 with the exception message', () => {
    filter.catch(new NotFoundException('Task with id "x" was not found'), host);

    expect(lastBody()).toMatchObject({
      statusCode: 404,
      message: 'Task with id "x" was not found',
    });
  });

  it('hides internal details of unexpected errors behind a generic 500 and logs them', () => {
    const internal = new Error('connect ECONNREFUSED postgres://user:secret@db:5432');

    filter.catch(internal, host);

    expect(reply).toHaveBeenCalledWith({}, expect.any(Object), 500);
    expect(lastBody()).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(lastBody())).not.toContain('secret');
    expect(logError).toHaveBeenCalledWith(internal.message, internal.stack);
  });

  it('does not log client errors as server errors', () => {
    filter.catch(new BadRequestException('bad input'), host);

    expect(logError).not.toHaveBeenCalled();
  });
});
