import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "@/server/context";
import { createAppError, ERROR_CODES, type ErrorCode } from "@/lib/errors";

export const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
        message: error.message,
        cause: error.cause,
      },
    };
  },
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.session) {
        throw createTRPCError('UNAUTHORIZED', 'Authentication required');
    }
    return next({
        ctx: {
            ...ctx,
            session: ctx.session,
        },
    });
});

// Utility functions for consistent error handling
export function createTRPCError(
  code: ErrorCode,
  message?: string,
  cause?: string
): TRPCError {
  const appError = createAppError(code, message, cause);
  
  // Map our error codes to tRPC error codes
  const trpcCode = mapErrorCodeToTRPCCode(code);
  
  return new TRPCError({
    code: trpcCode,
    message: message || appError.message,
    cause: cause || appError.cause,
  });
}

function mapErrorCodeToTRPCCode(code: ErrorCode): TRPCError['code'] {
  switch (code) {
    case 'UNAUTHORIZED':
    case 'SESSION_EXPIRED':
      return 'UNAUTHORIZED';
    case 'FORBIDDEN':
      return 'FORBIDDEN';
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'ALREADY_EXISTS':
      return 'CONFLICT';
    case 'INVALID_INPUT':
    case 'MISSING_REQUIRED_FIELD':
      return 'BAD_REQUEST';
    case 'RATE_LIMITED':
      return 'TOO_MANY_REQUESTS';
    case 'TIMEOUT':
      return 'TIMEOUT';
    case 'SERVICE_UNAVAILABLE':
      return 'SERVICE_UNAVAILABLE';
    case 'API_KEY_NOT_FOUND':
    case 'API_KEY_INVALID':
    case 'API_KEY_EXPIRED':
    case 'API_KEY_QUOTA_EXCEEDED':
    case 'DATABASE_ERROR':
    case 'NETWORK_ERROR':
    case 'STREAM_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

// Helper functions for common validation scenarios
export function validateRequired<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined || value === '') {
    throw createTRPCError('MISSING_REQUIRED_FIELD', `${fieldName} is required`);
  }
  return value;
}

export function validateOwnership(resourceUserId: string, currentUserId: string, resourceName: string = 'resource') {
  if (resourceUserId !== currentUserId) {
    throw createTRPCError('FORBIDDEN', `You don't have permission to access this ${resourceName}`);
  }
}

export function handleDatabaseError(error: unknown, operation: string): never {
  console.error(`Database error during ${operation}:`, error);
  throw createTRPCError('DATABASE_ERROR', `Failed to ${operation}. Please try again.`);
}

export function handleExternalAPIError(error: unknown, provider: string): never {
  console.error(`External API error with ${provider}:`, error);
  
  // Check for common API error patterns
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as any).message;
    if (message.includes('invalid') && message.includes('key')) {
      throw createTRPCError('API_KEY_INVALID', `Invalid ${provider} API key`);
    }
    if (message.includes('quota') || message.includes('limit')) {
      throw createTRPCError('API_KEY_QUOTA_EXCEEDED', `${provider} API quota exceeded`);
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      throw createTRPCError('API_KEY_INVALID', `${provider} API authentication failed`);
    }
  }
  
  throw createTRPCError('NETWORK_ERROR', `Failed to communicate with ${provider} API`);
}