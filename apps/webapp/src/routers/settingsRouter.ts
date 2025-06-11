import { db } from "@/db";
import { userKeys } from "@/db/schema";
import { protectedProcedure, router } from "@/lib/trpc";
import { decrypt, encrypt } from "@/utils/crypto";
import { eq, and } from "drizzle-orm";
import z from "zod";

export const settingsRouter = router({
    getApiKeys: protectedProcedure
        .query(async ({ ctx }) => {
            // Return user's API keys
            const userApiKeys = await db.query.userKeys.findMany({
                where: eq(userKeys.userId, ctx.session.user.id),
                columns: {
                    id: true,
                    provider: true,
                    hashedKey: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });

            return userApiKeys.map((key) => ({
                id: key.id,
                provider: key.provider,
                key: decrypt(key.hashedKey),
                createdAt: key.createdAt?.toLocaleDateString(),
                updatedAt: key.updatedAt?.toLocaleDateString(),
            }));
        }),

    createApiKey: protectedProcedure
        .input(z.object({
            provider: z.enum(["anthropic", "openai", "google"]),
            key: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const encryptedKey = encrypt(input.key);
            const [newApiKey] = await db.insert(userKeys).values({
                userId: ctx.session.user.id,
                provider: input.provider,
                hashedKey: encryptedKey, // In production, this should be hashed
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();

            return newApiKey;
        }),

    deleteApiKey: protectedProcedure
        .input(z.object({
            id: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await db.delete(userKeys)
                .where(
                    and(
                        eq(userKeys.id, input.id),
                        eq(userKeys.userId, ctx.session.user.id)
                    )
                );

            return { success: true };
        }),
});
