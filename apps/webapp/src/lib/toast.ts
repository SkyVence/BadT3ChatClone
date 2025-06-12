import { toast } from "sonner";
import { getErrorMessage, isAppError, type AppError, type ErrorCode } from "./errors";

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const toastUtils = {
  // Success toasts
  success: (message: string, options?: ToastOptions) => {
    return toast.success(options?.title || message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  // Error toasts - handles both AppError and generic errors
  error: (error: unknown, options?: ToastOptions) => {
    const message = getErrorMessage(error);
    let title = options?.title || "Error";
    let description = options?.description || message;

    // Handle AppError with specific formatting
    if (isAppError(error)) {
      title = options?.title || "Error";
      description = error.details || error.message;
    }

    return toast.error(title, {
      description,
      duration: options?.duration || 5000, // Longer duration for errors
      action: options?.action,
    });
  },

  // Warning toasts
  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(options?.title || message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  // Info toasts
  info: (message: string, options?: ToastOptions) => {
    return toast.info(options?.title || message, {
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    });
  },

  // Loading toasts
  loading: (message: string, options?: Omit<ToastOptions, 'duration'>) => {
    return toast.loading(options?.title || message, {
      description: options?.description,
      action: options?.action,
    });
  },

  // Promise toasts for async operations
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (error) => {
        const errorMessage = getErrorMessage(error);
        return `${messages.error}: ${errorMessage}`;
      },
    });
  },

  // Dismiss specific toast
  dismiss: (toastId?: string | number) => {
    return toast.dismiss(toastId);
  },

  // Dismiss all toasts
  dismissAll: () => {
    return toast.dismiss();
  },
};

// Predefined toast messages for common scenarios
export const toastMessages = {
  // Authentication
  signInSuccess: () => toastUtils.success("Welcome back!", { 
    description: "You have been successfully signed in." 
  }),
  signOutSuccess: () => toastUtils.success("Signed out successfully"),
  sessionExpired: () => toastUtils.warning("Session expired", {
    description: "Please sign in again to continue.",
  }),

  // API Keys
  apiKeyAdded: (provider: string) => toastUtils.success("API key added", {
    description: `Your ${provider} API key has been saved successfully.`,
  }),
  apiKeyDeleted: () => toastUtils.success("API key deleted"),
  apiKeyNotFound: () => toastUtils.error("API key not found", {
    description: "Please add your API key in settings to continue.",
  }),
  apiKeyInvalid: (provider: string) => toastUtils.error("Invalid API key", {
    description: `Please check your ${provider} API key in settings.`,
  }),

  // Chat/Messages
  messageStreamStarted: () => toastUtils.info("Starting response..."),
  messageStreamError: () => toastUtils.error("Stream error", {
    description: "Failed to stream response. Please try again.",
  }),
  threadCreated: () => toastUtils.success("New conversation started"),
  threadDeleted: () => toastUtils.success("Conversation deleted"),

  // Network
  networkError: () => toastUtils.error("Network error", {
    description: "Please check your internet connection and try again.",
  }),
  rateLimited: () => toastUtils.warning("Rate limited", {
    description: "Please wait a moment before trying again.",
  }),

  // Generic
  actionSuccess: (action: string) => toastUtils.success(`${action} successful`),
  actionFailed: (action: string) => toastUtils.error(`${action} failed`),
  copySuccess: () => toastUtils.success("Copied to clipboard"),
  saveSuccess: () => toastUtils.success("Changes saved"),
  deleteConfirmation: (item: string) => toastUtils.warning(`${item} deleted`),
};

export default toastUtils;