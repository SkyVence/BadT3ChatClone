import { db } from "@/db";
import { userKeys } from "@/db/schema";
import {
    protectedProcedure,
    router,
} from "@/server/api/trpc";
import { decrypt, encrypt } from "@/utils/crypto";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import z from "zod";

export const settingsRouter = router({
    getApiKeys: protectedProcedure
        .query(async ({ ctx }) => {
            try {
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

                return userApiKeys.map((key) => {
                    try {
                        const decryptedKey = decrypt(key.hashedKey);
                        return {
                            id: key.id,
                            provider: key.provider,
                            key: decryptedKey,
                            createdAt: key.createdAt?.toLocaleDateString(),
                            updatedAt: key.updatedAt?.toLocaleDateString(),
                        };
                    } catch (error) {
                        console.error(`Failed to decrypt API key for user ${ctx.session.user.id}:`, error);
                        // Return key info without the actual key if decryption fails
                        return {
                            id: key.id,
                            provider: key.provider,
                            key: '***DECRYPTION_ERROR***',
                            createdAt: key.createdAt?.toLocaleDateString(),
                            updatedAt: key.updatedAt?.toLocaleDateString(),
                        };
                    }
                });
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch API keys',
                });
            }
        }),

    createApiKey: protectedProcedure
        .input(z.object({
            provider: z.enum(["anthropic", "openai", "google"], {
                errorMap: () => ({ message: "Provider must be one of: anthropic, openai, google" })
            }),
            key: z.string().min(1, "API key cannot be empty").max(1000, "API key is too long"),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const { provider, key } = input;
                const userId = ctx.session.user.id;

                // Validate API key format based on provider
                if (!validateApiKeyFormat(provider, key)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Invalid ${provider} API key format`,
                    });
                }

                // Check if user already has an API key for this provider
                const existingKey = await db.query.userKeys.findFirst({
                    where: and(
                        eq(userKeys.userId, userId),
                        eq(userKeys.provider, provider)
                    ),
                });

                if (existingKey) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `You already have an API key for ${provider}. Please delete the existing key first.`,
                    });
                }

                // Encrypt the API key
                let encryptedKey: string;
                try {
                    encryptedKey = encrypt(key);
                } catch (error) {
                    console.error('Encryption error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to secure API key',
                    });
                }

                // Insert the new API key
                const [newApiKey] = await db.insert(userKeys).values({
                    userId,
                    provider,
                    hashedKey: encryptedKey,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }).returning();

                if (!newApiKey) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to save API key',
                    });
                }

                return {
                    id: newApiKey.id,
                    provider: newApiKey.provider,
                    createdAt: newApiKey.createdAt?.toLocaleDateString(),
                };
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to create API key',
                    });
                }
                throw error;
            }
        }),

    updateApiKey: protectedProcedure
        .input(z.object({
            id: z.string().uuid("Invalid API key ID format"),
            key: z.string().min(1, "API key cannot be empty").max(1000, "API key is too long"),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const { id, key } = input;
                const userId = ctx.session.user.id;

                // Verify ownership of the API key
                const existingKey = await db.query.userKeys.findFirst({
                    where: eq(userKeys.id, id),
                });

                if (!existingKey) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'API key not found',
                    });
                }

                if (!existingKey.userId) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'API key has invalid user association',
                    });
                }

                if (existingKey.userId !== userId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not allowed to update this API key',
                    });
                }

                // Validate API key format
                if (!validateApiKeyFormat(existingKey.provider, key)) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: `Invalid ${existingKey.provider} API key format`,
                    });
                }

                // Encrypt the new API key
                let encryptedKey: string;
                try {
                    encryptedKey = encrypt(key);
                } catch (error) {
                    console.error('Encryption error:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to secure API key',
                    });
                }

                // Update the API key
                const [updatedKey] = await db.update(userKeys)
                    .set({
                        hashedKey: encryptedKey,
                        updatedAt: new Date(),
                    })
                    .where(eq(userKeys.id, id))
                    .returning();

                if (!updatedKey) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to update API key',
                    });
                }

                return {
                    id: updatedKey.id,
                    provider: updatedKey.provider,
                    updatedAt: updatedKey.updatedAt?.toLocaleDateString(),
                };
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to update API key',
                    });
                }
                throw error;
            }
        }),

    deleteApiKey: protectedProcedure
        .input(z.object({
            id: z.string().uuid("Invalid API key ID format"),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const { id } = input;
                const userId = ctx.session.user.id;

                // Verify ownership of the API key
                const existingKey = await db.query.userKeys.findFirst({
                    where: eq(userKeys.id, id),
                });

                if (!existingKey) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'API key not found',
                    });
                }

                if (!existingKey.userId) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'API key has invalid user association',
                    });
                }

                if (existingKey.userId !== userId) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not allowed to delete this API key',
                    });
                }

                // Delete the API key
                const deletedRows = await db.delete(userKeys)
                    .where(
                        and(
                            eq(userKeys.id, id),
                            eq(userKeys.userId, userId)
                        )
                    );

                return { success: true, provider: existingKey.provider };
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to delete API key',
                    });
                }
                throw error;
            }
        }),
});

// Helper function to validate API key formats
function validateApiKeyFormat(provider: string, key: string): boolean {
    switch (provider) {
        case 'openai':
            return key.startsWith('sk-') && key.length >= 20;
        case 'anthropic':
            return key.startsWith('sk-ant-') && key.length >= 20;
        case 'google':
            return key.length >= 20; // Google API keys have various formats
        default:
            return key.length >= 10; // Minimum length for any API key
    }
}
