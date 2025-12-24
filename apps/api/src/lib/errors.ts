/**
 * Error Handling
 * 
 * Custom error classes and error handler
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { logger } from './logger.js';

// Custom error codes
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  
  // Business logic errors
  INVALID_STATE: 'INVALID_STATE',
  TRANSFER_NOT_ALLOWED: 'TRANSFER_NOT_ALLOWED',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  
  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Base API error class
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Convenience error classes
export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, ErrorCodes.UNAUTHORIZED, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied') {
    super(message, ErrorCodes.FORBIDDEN, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with ID ${id} not found` : `${resource} not found`,
      ErrorCodes.NOT_FOUND,
      404,
      { resource, id }
    );
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCodes.CONFLICT, 409, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', ErrorCodes.RATE_LIMITED, 429, { retryAfter });
  }
}

/**
 * Format Zod validation errors
 */
function formatZodError(error: ZodError) {
  return {
    code: ErrorCodes.VALIDATION_ERROR,
    message: 'Validation failed',
    validationErrors: error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    })),
  };
}

/**
 * Global error handler
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.id;

  // Handle API errors
  if (error instanceof ApiError) {
    logger.warn({
      err: error,
      requestId,
      code: error.code,
    }, error.message);

    return reply.status(error.statusCode).send({
      success: false,
      error: error.toJSON(),
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    logger.warn({
      err: error,
      requestId,
    }, 'Validation error');

    return reply.status(400).send({
      success: false,
      error: formatZodError(error),
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Fastify errors
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const statusCode = error.statusCode;

    if (statusCode < 500) {
      logger.warn({
        err: error,
        requestId,
      }, error.message);
    } else {
      logger.error({
        err: error,
        requestId,
      }, error.message);
    }

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 429 ? ErrorCodes.RATE_LIMITED : ErrorCodes.INVALID_INPUT,
        message: error.message,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle unknown errors
  logger.error({
    err: error,
    requestId,
  }, 'Unhandled error');

  return reply.status(500).send({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}
