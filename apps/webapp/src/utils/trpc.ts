import { QueryCache, QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, httpSubscriptionLink, splitLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import type { AppRouter } from '@/routers';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            toast.error(error.message, {
                action: {
                    label: "retry",
                    onClick: () => {
                        queryClient.invalidateQueries();
                    },
                },
            });
        },
    }),
});

const trpcClient = createTRPCClient<AppRouter>({
    links: [
        splitLink({
            condition: (op) => op.type === 'subscription',
            true: httpSubscriptionLink({
                url: "/api/trpc",
            }),
            false: httpBatchLink({
                url: "/api/trpc",
                fetch(url, options) {
                    return fetch(url, {
                        ...options,
                        credentials: "include",
                    });
                },
            }),
        }),
    ],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({
    client: trpcClient,
    queryClient,
});

