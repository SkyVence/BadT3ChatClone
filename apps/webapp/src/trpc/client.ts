import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/api/root";
import { createTRPCClient, createWSClient, httpBatchLink, httpSubscriptionLink } from "@trpc/client";

const wsClient = createWSClient({
    url: `ws://localhost:3001`,
});

export const api = createTRPCReact<AppRouter>();
export const trpc = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "/api/trpc",
        }),
    ],
});
export const subscriptionClient = createTRPCClient<AppRouter>({
    links: [
        httpSubscriptionLink({
            url: "/api/trpc",
        }),
    ],
});