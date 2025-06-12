import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/server/api/root";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export const api = createTRPCReact<AppRouter>();
export const trpc = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            url: "/api/trpc",
        }),
    ],
}); 