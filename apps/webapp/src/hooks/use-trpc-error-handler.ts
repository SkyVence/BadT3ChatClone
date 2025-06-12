import { TRPCClientError } from "@trpc/client";
import { useCallback } from "react";
import { toastUtils, toastMessages } from "@/lib/toast";
import { isAppError, getErrorMessage, ERROR_CODES } from "@/lib/errors";
import type { AppRouter } from "@/server/api/root";

export function useTRPCErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    console.error(`tRPC Error${context ? ` in ${context}` : ''}:`, error);

    // Handle tRPC errors
    if (error instanceof TRPCClientError) {
      const { data, message } = error;
      
      // Handle specific error codes
      if (data?.code) {
        switch (data.code) {
          case 'UNAUTHORIZED':
            toastMessages.sessionExpired();
            return;
          case 'NOT_FOUND':
            toastUtils.error(message || "Resource not found", {
              title: "Not Found"
            });
            return;
          case 'CONFLICT':
            toastUtils.warning(message || "Resource already exists", {
              title: "Already Exists"
            });
            return;
          case 'BAD_REQUEST':
            toastUtils.error(message || "Invalid request", {
              title: "Validation Error"
            });
            return;
          case 'TOO_MANY_REQUESTS':
            toastMessages.rateLimited();
            return;
          case 'SERVICE_UNAVAILABLE':
            toastUtils.error("Service is temporarily unavailable", {
              title: "Service Unavailable",
              description: "Please try again in a few minutes."
            });
            return;
          case 'TIMEOUT':
            toastUtils.error("Request timed out", {
              title: "Timeout",
              description: "The request took too long to complete. Please try again."
            });
            return;
        }
      }

      // Handle HTTP status codes
      if (error.data?.httpStatus) {
        switch (error.data.httpStatus) {
          case 401:
            toastMessages.sessionExpired();
            return;
          case 403:
            toastUtils.error("You don't have permission to perform this action", {
              title: "Access Denied"
            });
            return;
          case 404:
            toastUtils.error("The requested resource was not found", {
              title: "Not Found"
            });
            return;
          case 429:
            toastMessages.rateLimited();
            return;
          case 500:
          case 502:
          case 503:
          case 504:
            toastUtils.error("Server error occurred", {
              title: "Server Error",
              description: "Please try again later."
            });
            return;
        }
      }

      // Fallback for tRPC errors
      toastUtils.error(error, {
        title: "Request Failed"
      });
      return;
    }

    // Handle network errors
    if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toastMessages.networkError();
        return;
      }
      
      if (error.message.includes('timeout')) {
        toastUtils.error("Request timed out", {
          title: "Timeout",
          description: "Please check your connection and try again."
        });
        return;
      }
    }

    // Fallback for unknown errors
    toastUtils.error(error, {
      title: "Unexpected Error",
      description: "Something went wrong. Please try again."
    });
  }, []);

  // Specialized handlers for common operations
  const handleApiKeyError = useCallback((error: unknown, provider?: string) => {
    if (error instanceof TRPCClientError) {
      const message = error.message;
      
      if (message.includes('Invalid') && message.includes('API key')) {
        toastMessages.apiKeyInvalid(provider || 'API');
        return;
      }
      
      if (message.includes('not found')) {
        toastMessages.apiKeyNotFound();
        return;
      }
      
      if (message.includes('quota') || message.includes('limit')) {
        toastUtils.error(`${provider || 'API'} quota exceeded`, {
          title: "Quota Exceeded",
          description: "Please check your API key limits or upgrade your plan."
        });
        return;
      }
      
      if (message.includes('already exists')) {
        toastUtils.warning(`You already have an API key for ${provider || 'this provider'}`, {
          title: "Key Already Exists",
          description: "Please delete the existing key first."
        });
        return;
      }
    }
    
    handleError(error, `API key management for ${provider || 'provider'}`);
  }, [handleError]);

  const handleStreamError = useCallback((error: unknown) => {
    if (error instanceof TRPCClientError) {
      const message = error.message;
      
      if (message.includes('stream') || message.includes('Stream')) {
        toastMessages.messageStreamError();
        return;
      }
      
      if (message.includes('API key')) {
        toastMessages.apiKeyNotFound();
        return;
      }
    }
    
    handleError(error, 'message streaming');
  }, [handleError]);

  const handleThreadError = useCallback((error: unknown, operation: 'create' | 'delete' | 'fetch' = 'fetch') => {
    if (error instanceof TRPCClientError) {
      const message = error.message;
      
      if (message.includes('not found')) {
        toastUtils.error("Conversation not found", {
          title: "Not Found",
          description: "The conversation may have been deleted or you don't have access to it."
        });
        return;
      }
      
      if (message.includes('permission') || message.includes('access')) {
        toastUtils.error("You don't have permission to access this conversation", {
          title: "Access Denied"
        });
        return;
      }
    }
    
    handleError(error, `conversation ${operation}`);
  }, [handleError]);

  return {
    handleError,
    handleApiKeyError,
    handleStreamError,
    handleThreadError,
  };
}

// Hook for handling specific tRPC mutation errors with loading states
export function useTRPCMutationWithToast<TData = unknown, TError = unknown>() {
  const { handleError } = useTRPCErrorHandler();
  
  const executeWithToast = useCallback(async <T>(
    mutationFn: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorContext?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<T | undefined> => {
    const toastId = options?.loadingMessage ? 
      toastUtils.loading(options.loadingMessage) : undefined;
    
    try {
      const result = await mutationFn();
      
      if (toastId) {
        toastUtils.dismiss(toastId);
      }
      
      if (options?.successMessage) {
        toastUtils.success(options.successMessage);
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      if (toastId) {
        toastUtils.dismiss(toastId);
      }
      
      handleError(error, options?.errorContext);
      options?.onError?.(error);
      return undefined;
    }
  }, [handleError]);
  
  return { executeWithToast };
}