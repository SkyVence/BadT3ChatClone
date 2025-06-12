export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // API Key errors
  API_KEY_NOT_FOUND: 'API_KEY_NOT_FOUND',
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  API_KEY_QUOTA_EXCEEDED: 'API_KEY_QUOTA_EXCEEDED',
  
  // Database errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Network/Stream errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  STREAM_ERROR: 'STREAM_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: string;
  cause?: string;
}

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication errors
  UNAUTHORIZED: 'You need to be signed in to perform this action',
  FORBIDDEN: 'You don\'t have permission to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again',
  
  // API Key errors
  API_KEY_NOT_FOUND: 'API key not found. Please add your API key in settings',
  API_KEY_INVALID: 'Invalid API key. Please check your API key in settings',
  API_KEY_EXPIRED: 'Your API key has expired. Please update it in settings',
  API_KEY_QUOTA_EXCEEDED: 'API key quota exceeded. Please upgrade your plan or try again later',
  
  // Database errors
  NOT_FOUND: 'The requested resource was not found',
  ALREADY_EXISTS: 'Resource already exists',
  DATABASE_ERROR: 'Database operation failed. Please try again',
  
  // Validation errors
  INVALID_INPUT: 'Invalid input provided',
  MISSING_REQUIRED_FIELD: 'Required field is missing',
  
  // Network/Stream errors
  NETWORK_ERROR: 'Network error occurred. Please check your connection',
  STREAM_ERROR: 'Streaming error occurred. Please try again',
  TIMEOUT: 'Request timed out. Please try again',
  
  // General errors
  INTERNAL_ERROR: 'An internal error occurred. Please try again',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later',
};

export function createAppError(
  code: ErrorCode,
  details?: string,
  cause?: string
): AppError {
  return {
    code,
    message: ERROR_MESSAGES[code],
    details,
    cause,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const appError = error as AppError;
    return appError.details || appError.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as Error).message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return ERROR_MESSAGES.INTERNAL_ERROR;
}

export function isAppError(error: unknown): error is AppError {
  return error !== null && 
         typeof error === 'object' && 
         'code' in error && 
         'message' in error;
}