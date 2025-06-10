import {
    protectedProcedure,
    router,
} from "../lib/trpc";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { userKeys } from "@/db/schema/auth";
import { z } from "zod";
import { encrypt, decrypt } from "@/utils/crypto";
import { aiRouter } from "./ai";
import { threadId } from "node:worker_threads";
import { threadsRoute } from "./threads";

export const appRouter = router({
    getApiKeys: protectedProcedure.query(async ({ ctx }) => {
        const apiKeys = await db.select().from(userKeys).where(eq(userKeys.userId, ctx.session.user.id));
        return apiKeys.map(key => {
            try {
                return {
                    ...key,
                    key: key.hashedKey ? decrypt(key.hashedKey).substring(0, 10) + "••••••••" : "••••••••••"
                };
            } catch (error) {
                console.error("Failed to decrypt API key:", error);
                return {
                    ...key,
                    key: "••••••••••"
                };
            }
        });
    }),
    createApiKey: protectedProcedure.input(z.object({
        provider: z.string(),
        key: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const hashedKey = encrypt(input.key);
        const [apiKey] = await db.insert(userKeys).values({
            userId: ctx.session.user.id,
            provider: input.provider,
            hashedKey: hashedKey,
        }).returning();

        return {
            ...apiKey,
            key: input.key.substring(0, 10) + "••••••••"
        };
    }),
    deleteApiKey: protectedProcedure.input(z.object({
        id: z.string().uuid(),
    })).mutation(async ({ ctx, input }) => {
        await db.delete(userKeys).where(eq(userKeys.id, input.id));
    }),
    ai: aiRouter,
    chat: threadsRoute
});
export type AppRouter = typeof appRouter;
