"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import { createAuthClient } from "better-auth/react";
import type { Session, User } from "better-auth/types";

// Create the auth client
const authClient = createAuthClient();

// Type definitions for the auth context
interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    error: Error | null;
    signIn: typeof authClient.signIn;
    signOut: typeof authClient.signOut;
    signUp: typeof authClient.signUp;
    refetch: () => void;
    authClient: typeof authClient;
    deleteUser: typeof authClient.deleteUser;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component props
interface AuthProviderProps {
    children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
    const {
        data: session,
        isPending: isLoading,
        error,
        refetch,
    } = authClient.useSession();

    const contextValue: AuthContextType = {
        session: session?.session || null,
        user: session?.user || null,
        isLoading,
        error: error || null,
        signIn: authClient.signIn,
        signOut: authClient.signOut,
        signUp: authClient.signUp,
        refetch,
        authClient,
        deleteUser: authClient.deleteUser,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// Custom hook to use the auth context
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }

    return context;
}

// Convenience hooks for specific auth operations
export function useSession() {
    const { session, isLoading, error, refetch } = useAuth();
    return { data: session, isPending: isLoading, error, refetch };
}

export function useUser() {
    const { user, isLoading } = useAuth();
    return { user, isLoading };
}

export function useSignIn() {
    const { signIn } = useAuth();
    return signIn;
}

export function useSignOut() {
    const { signOut } = useAuth();
    return signOut;
}

export function useSignUp() {
    const { signUp } = useAuth();
    return signUp;
}

// Export the auth client for direct usage when needed
export { authClient };
