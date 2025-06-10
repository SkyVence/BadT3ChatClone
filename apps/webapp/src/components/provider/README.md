# Better Auth Context

This folder contains the React context implementation for Better Auth library, providing a comprehensive authentication system with session management and easy-to-use hooks.

## Files

- `context.tsx` - Main auth context implementation
- `auth-example.tsx` - Example component showing usage patterns
- `README.md` - This documentation file

## Setup

### 1. Wrap your app with AuthProvider

```tsx
import { AuthProvider } from "./components/provider/context";

function App() {
  return <AuthProvider>{/* Your app components */}</AuthProvider>;
}
```

### 2. Environment Variables

Make sure you have the following environment variable set:

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Your app's base URL
```

## Available Hooks

### `useAuth()`

The main hook that provides access to all authentication functionality:

```tsx
import { useAuth } from "./components/provider/context";

function MyComponent() {
  const {
    session, // Current session data
    user, // Current user data
    isLoading, // Loading state
    error, // Error state
    signIn, // Sign in methods
    signOut, // Sign out method
    signUp, // Sign up methods
    refetch, // Refetch session
    authClient, // Direct access to auth client
  } = useAuth();
}
```

### `useSession()`

Hook for accessing session data:

```tsx
import { useSession } from "./components/provider/context";

function MyComponent() {
  const { data: session, isPending, error, refetch } = useSession();
}
```

### `useUser()`

Hook for accessing user data:

```tsx
import { useUser } from "./components/provider/context";

function MyComponent() {
  const { user, isLoading } = useUser();
}
```

### Individual Action Hooks

For specific authentication actions:

```tsx
import {
  useSignIn,
  useSignOut,
  useSignUp,
} from "./components/provider/context";

function MyComponent() {
  const signIn = useSignIn();
  const signOut = useSignOut();
  const signUp = useSignUp();
}
```

## Usage Examples

### Email/Password Authentication

```tsx
import { useAuth } from './components/provider/context';

function SignInForm() {
  const { signIn, isLoading } = useAuth();

  const handleSubmit = async (email: string, password: string) => {
    await signIn.email({
      email,
      password,
    }, {
      onSuccess: () => {
        // Handle success
      },
      onError: (ctx) => {
        // Handle error
        console.error(ctx.error);
      }
    });
  };

  return (
    // Your form JSX
  );
}
```

### Social Authentication

```tsx
import { useAuth } from "./components/provider/context";

function SocialSignIn() {
  const { signIn } = useAuth();

  const handleGitHubSignIn = async () => {
    await signIn.social({
      provider: "github",
      callbackURL: "/dashboard",
    });
  };

  return <button onClick={handleGitHubSignIn}>Sign in with GitHub</button>;
}
```

### User Profile Display

```tsx
import { useUser, useAuth } from "./components/provider/context";

function UserProfile() {
  const { user, isLoading } = useUser();
  const { signOut } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!user) return <div>Not signed in</div>;

  return (
    <div>
      <h2>Welcome, {user.name || user.email}!</h2>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

### Protected Routes

```tsx
import { useAuth } from "./components/provider/context";

function ProtectedComponent() {
  const { session, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!session) {
    return <div>Please sign in to access this content</div>;
  }

  return <div>Protected content here</div>;
}
```

## Features

- ✅ Email/Password authentication
- ✅ Social authentication (GitHub, Google, etc.)
- ✅ Session management
- ✅ TypeScript support
- ✅ Loading states
- ✅ Error handling
- ✅ Automatic session refetching
- ✅ Convenient hooks for all auth operations
- ✅ Context-based state management

## Integration with Better Auth Server

This context works with the Better Auth server configuration in `src/lib/auth.ts`. Make sure your server is properly configured with the same providers and settings.

## Backward Compatibility

The auth client is also exported from `src/lib/auth-client.ts` for backward compatibility with existing code.
