import { router } from "@/lib/trpc";
import { chatRouter } from "./chatRouter";
import { settingsRouter } from "./settingsRouter";

export const appRouter = router({
    chat: chatRouter,
    settings: settingsRouter
});
export type AppRouter = typeof appRouter;
