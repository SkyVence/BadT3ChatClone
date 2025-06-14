"use client";

import { type AppRouter } from "@/server/api/root";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, loggerLink, httpSubscriptionLink, splitLink, httpBatchLink } from "@trpc/react-query";
import { useState } from "react";
import superjson from "superjson";

const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
            },
        },
    });

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
    if (typeof window === "undefined") {
        return createQueryClient();
    }
    return (clientQueryClientSingleton ??= createQueryClient());
}

export const api: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();

export const subscriptionClient = api.createClient({
    links: [
        httpSubscriptionLink({
            url: getBaseUrl() + "/api/trpc",
            transformer: superjson,
        }),
    ],
});

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
    const QueryClient = getQueryClient();

    const [trpcClient] = useState(() =>
        api.createClient({
            links: [
                loggerLink({
                    enabled: (op) =>
                        process.env.NODE_ENV === "development" ||
                        (op.direction === "down" && op.result instanceof Error),
                }),
                splitLink({
                    condition: (op) => op.type === "subscription",
                    true: httpSubscriptionLink({
                        url: getBaseUrl() + "/api/trpc",
                        transformer: superjson,
                    }),
                    false: httpBatchLink({
                        url: getBaseUrl() + "/api/trpc",
                        transformer: superjson,
                    }),
                }),
            ],
        })
    );

    return (
        <QueryClientProvider client={QueryClient} >
            <api.Provider client={trpcClient} queryClient={QueryClient} >
                {children}
            </api.Provider>
        </QueryClientProvider>
    )
}

function getBaseUrl() {
    if (typeof window !== "undefined") return window.location.origin;
    if (process.env.NEXT_PUBLIC_URL) return `https://${process.env.NEXT_PUBLIC_URL}`;
    return `http://localhost:${process.env.PORT ?? 3000}`;
}