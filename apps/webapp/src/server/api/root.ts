import { router } from "@/server/api/trpc";
import { chatRouter } from "@/server/api/routers/chatRouter";
import { settingsRouter } from "@/server/api/routers/settingsRouter";
import { threadsRouter } from "@/server/api/routers/threadsRouter";
import { streamRouter } from "@/server/api/routers/streamRouter";

export const appRouter = router({
    threads: threadsRouter,
    chat: chatRouter,
    settings: settingsRouter,
    stream: streamRouter
});
export type AppRouter = typeof appRouter;
