# Error Handling and Toast System

This guide explains the comprehensive error handling and toast notification system implemented in the application.

## Overview

The error handling system consists of several layers:

1. **Centralized Error Definitions** (`/lib/errors.ts`)
2. **Toast Utility System** (`/lib/toast.ts`)
3. **Server-side tRPC Error Handling** (`/server/api/trpc.ts`)
4. **Client-side Error Handling Hooks** (`/hooks/use-trpc-error-handler.ts`)

## 1. Error Definitions (`/lib/errors.ts`)

### Error Codes

All errors use standardized error codes:

```typescript
// Authentication errors
UNAUTHORIZED, FORBIDDEN, SESSION_EXPIRED

// API Key errors  
API_KEY_NOT_FOUND, API_KEY_INVALID, API_KEY_EXPIRED, API_KEY_QUOTA_EXCEEDED

// Database errors
NOT_FOUND, ALREADY_EXISTS, DATABASE_ERROR

// Validation errors
INVALID_INPUT, MISSING_REQUIRED_FIELD

// Network/Stream errors
NETWORK_ERROR, STREAM_ERROR, TIMEOUT

// General errors
INTERNAL_ERROR, RATE_LIMITED, SERVICE_UNAVAILABLE
```

### Usage

```typescript
import { createAppError, getErrorMessage } from '@/lib/errors';

// Create a standardized error
const error = createAppError('API_KEY_NOT_FOUND', 'Custom details', 'Cause info');

// Extract message from any error type
const message = getErrorMessage(someError);
```

## 2. Toast System (`/lib/toast.ts`)

### Basic Toast Utilities

```typescript
import { toastUtils } from '@/lib/toast';

// Success toast
toastUtils.success("Operation completed!");

// Error toast (handles any error type)
toastUtils.error(error, { 
  title: "Custom Title",
  description: "Custom description" 
});

// Warning toast
toastUtils.warning("Be careful!");

// Info toast
toastUtils.info("Here's some information");

// Loading toast
const toastId = toastUtils.loading("Processing...");
// Later dismiss it
toastUtils.dismiss(toastId);
```

### Promise Toast

```typescript
import { toastUtils } from '@/lib/toast';

toastUtils.promise(
  someAsyncOperation(),
  {
    loading: "Saving...",
    success: "Saved successfully!",
    error: "Failed to save"
  }
);
```

### Predefined Toast Messages

```typescript
import { toastMessages } from '@/lib/toast';

// Authentication
toastMessages.signInSuccess();
toastMessages.sessionExpired();

// API Keys
toastMessages.apiKeyAdded('OpenAI');
toastMessages.apiKeyInvalid('Anthropic');
toastMessages.apiKeyNotFound();

// Chat/Messages
toastMessages.messageStreamError();
toastMessages.threadCreated();

// Network
toastMessages.networkError();
toastMessages.rateLimited();
```

## 3. Server-side Error Handling

### tRPC Error Utilities

```typescript
import { createTRPCError, validateOwnership, handleDatabaseError } from '@/server/api/trpc';

// Create standardized tRPC errors
throw createTRPCError('NOT_FOUND', 'User not found');
throw createTRPCError('API_KEY_INVALID', 'Invalid OpenAI API key');

// Validate ownership
validateOwnership(resource.userId, currentUserId, 'conversation');

// Handle database errors consistently
try {
  await db.query.users.findFirst({ where: eq(users.id, userId) });
} catch (error) {
  handleDatabaseError(error, 'fetch user');
}
```

### Router Example

```typescript
export const exampleRouter = router({
  createItem: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Validate input
        const name = validateRequired(input.name, 'name');
        
        // Check for existing item
        const existing = await db.query.items.findFirst({
          where: eq(items.name, name)
        });
        
        if (existing) {
          throw createTRPCError('ALREADY_EXISTS', 'Item with this name already exists');
        }
        
        // Create item
        const [newItem] = await db.insert(items).values({
          name,
          userId: ctx.session.user.id,
        }).returning();
        
        return newItem;
      } catch (error) {
        if (!(error as any).code) {
          handleDatabaseError(error, 'create item');
        }
        throw error;
      }
    }),
});
```

## 4. Client-side Error Handling

### Basic Error Handler Hook

```typescript
import { useTRPCErrorHandler } from '@/hooks/use-trpc-error-handler';

function MyComponent() {
  const { handleError, handleApiKeyError, handleStreamError } = useTRPCErrorHandler();
  
  const mutation = api.example.create.useMutation({
    onError: (error) => handleError(error, 'creating item'),
    onSuccess: () => toastUtils.success('Item created!'),
  });
  
  // Or use specialized handlers
  const apiKeyMutation = api.settings.createApiKey.useMutation({
    onError: (error) => handleApiKeyError(error, 'OpenAI'),
  });
}
```

### Mutation with Toast Hook

```typescript
import { useTRPCMutationWithToast } from '@/hooks/use-trpc-error-handler';

function MyComponent() {
  const { executeWithToast } = useTRPCMutationWithToast();
  const createMutation = api.example.create.useMutation();
  
  const handleCreate = async (data: CreateData) => {
    await executeWithToast(
      () => createMutation.mutateAsync(data),
      {
        loadingMessage: "Creating item...",
        successMessage: "Item created successfully!",
        errorContext: "create item",
        onSuccess: (result) => {
          // Handle success
          router.push(`/items/${result.id}`);
        }
      }
    );
  };
}
```

## 5. Complete Component Example

```typescript
'use client';
import { api } from '@/trpc/react';
import { useTRPCErrorHandler } from '@/hooks/use-trpc-error-handler';
import { toastMessages, toastUtils } from '@/lib/toast';
import { useState } from 'react';

export function ApiKeyManager() {
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'google'>('openai');
  const [apiKey, setApiKey] = useState('');
  
  const { handleApiKeyError } = useTRPCErrorHandler();
  
  // Queries
  const { data: apiKeys, refetch } = api.settings.getApiKeys.useQuery(undefined, {
    onError: (error) => handleApiKeyError(error),
  });
  
  // Mutations
  const createMutation = api.settings.createApiKey.useMutation({
    onSuccess: (data) => {
      toastMessages.apiKeyAdded(data.provider);
      setApiKey('');
      refetch();
    },
    onError: (error) => handleApiKeyError(error, provider),
  });
  
  const deleteMutation = api.settings.deleteApiKey.useMutation({
    onSuccess: (data) => {
      toastUtils.success(`${data.provider} API key deleted`);
      refetch();
    },
    onError: (error) => handleApiKeyError(error),
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ provider, key: apiKey });
  };
  
  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };
  
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <select 
          value={provider} 
          onChange={(e) => setProvider(e.target.value as any)}
        >
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
          <option value="google">Google</option>
        </select>
        
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter your API key"
        />
        
        <button 
          type="submit" 
          disabled={createMutation.isLoading}
        >
          {createMutation.isLoading ? 'Adding...' : 'Add API Key'}
        </button>
      </form>
      
      <div>
        {apiKeys?.map((key) => (
          <div key={key.id}>
            <span>{key.provider}</span>
            <button 
              onClick={() => handleDelete(key.id)}
              disabled={deleteMutation.isLoading}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 6. Best Practices

### Do's

- ✅ Use predefined error codes and messages
- ✅ Use specialized error handlers for different contexts (API keys, streams, etc.)
- ✅ Include context when handling errors
- ✅ Use the mutation with toast hook for common operations
- ✅ Validate inputs on both client and server
- ✅ Log errors appropriately on the server

### Don'ts

- ❌ Create custom error messages without using the centralized system
- ❌ Show technical error details to users
- ❌ Ignore error handling in mutations and queries
- ❌ Use generic error messages when specific ones are available
- ❌ Handle errors differently across similar components

### Error Handling Checklist

For every tRPC procedure:
- [ ] Input validation with helpful error messages
- [ ] Ownership validation where applicable
- [ ] Proper error codes for different failure scenarios
- [ ] Consistent database error handling
- [ ] Appropriate logging for debugging

For every React component using tRPC:
- [ ] Error handlers on all mutations and queries
- [ ] Loading states with toast notifications
- [ ] Success feedback to users
- [ ] Proper error context for debugging

## 7. Troubleshooting

### Common Issues

1. **Toast not showing**: Make sure `<Toaster />` is included in your app layout
2. **Type errors**: Ensure you're importing the correct types from the error handling system
3. **Inconsistent error messages**: Always use the centralized error definitions
4. **Missing error context**: Always provide context when calling error handlers

### Debugging

- Check the browser console for detailed error logs
- All tRPC errors are logged with context information
- Use the network tab to see the actual HTTP responses
- Check server logs for database and external API errors

This system provides comprehensive, consistent error handling throughout the application while maintaining good user experience through informative toast notifications.