import { db } from "@/db";
import { messages, threads } from "@/db/schema";
import {
    protectedProcedure,
    router,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import z from "zod";

export const chatRouter = router({
    sendMessageAndStartStream: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid().optional(),
            prompt: z.string().min(1, "Message cannot be empty"),
            model: z.string().min(1, "Model must be specified"),
            provider: z.enum(['anthropic', 'openai', 'google'], {
                errorMap: () => ({ message: "Provider must be one of: anthropic, openai, google" })
            }),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                const { threadId, prompt, model, provider } = input;
                const userId = ctx.session.user.id;

                let finalThreadId = threadId;

                if (!finalThreadId) {
                    // Create new thread
                    try {
                        const [newThread] = await db.insert(threads).values({
                            userId,
                            title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
                        }).returning();

                        if (!newThread) {
                            throw new TRPCError({
                                code: 'INTERNAL_SERVER_ERROR',
                                message: 'Failed to create new conversation',
                            });
                        }

                        finalThreadId = newThread.id;
                    } catch (error) {
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to create new conversation',
                        });
                    }
                } else {
                    // Validate existing thread ownership
                    try {
                        const thread = await db.query.threads.findFirst({
                            where: eq(threads.id, finalThreadId),
                        });

                        if (!thread) {
                            throw new TRPCError({
                                code: 'NOT_FOUND',
                                message: 'Conversation not found',
                            });
                        }

                        if (thread.userId !== userId) {
                            throw new TRPCError({
                                code: 'FORBIDDEN',
                                message: 'You are not allowed to access this conversation',
                            });
                        }
                    } catch (error) {
                        if (error instanceof Error && error.message.includes('not found')) {
                            throw new TRPCError({
                                code: 'NOT_FOUND',
                                message: 'Conversation not found',
                            });
                        }
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: 'Failed to validate conversation',
                        });
                    }
                }

                // Start the stream
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
                    const response = await fetch(`${baseUrl}/api/chat/run-stream`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': ctx.req.headers.get('cookie') || '',
                        },
                        body: JSON.stringify({
                            threadId: finalThreadId,
                            prompt,
                            model,
                            provider,
                        }),
                    });

                    if (!response.ok) {
                        if (response.status === 401) {
                            throw new TRPCError({
                                code: 'BAD_REQUEST',
                                message: `${provider} API key not found or invalid`,
                            });
                        }
                        if (response.status === 460) {
                            throw new TRPCError({
                                code: 'BAD_REQUEST',
                                message: `${provider} API key not found. Please add your API key in settings.`,
                            });
                        }
                        if (response.status === 403) {
                            throw new TRPCError({
                                code: 'BAD_REQUEST',
                                message: `${provider} API quota exceeded`,
                            });
                        }
                        if (response.status === 429) {
                            throw new TRPCError({
                                code: 'BAD_REQUEST',
                                message: 'Too many requests, please try again later',
                            });
                        }
                        if (response.status >= 500) {
                            throw new TRPCError({
                                code: 'BAD_REQUEST',
                                message: `${provider} service is temporarily unavailable`,
                            });
                        }

                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: `Failed to start streaming (${response.status})`,
                        });
                    }

                    const result = await response.json();

                    if (!result.messageId || !result.userMessageId) {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'Invalid response from streaming service',
                        });
                    }

                    return {
                        threadId: finalThreadId,
                        messageId: result.messageId,
                        userMessageId: result.userMessageId,
                    };
                } catch (error) {
                    if (error instanceof Error && error.name === 'TypeError') {
                        throw new TRPCError({
                            code: 'BAD_REQUEST',
                            message: 'Network error occurred while starting stream',
                        });
                    }
                    throw error; // Re-throw if it's already a tRPC error
                }
            } catch (error) {
                // Log unexpected errors
                if (!(error as any).code) {
                    console.error('Unexpected error in sendMessageAndStartStream:', error);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'An unexpected error occurred',
                    });
                }
                throw error;
            }
        }),

    getThread: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid("Invalid thread ID format"),
        }))
        .query(async ({ input, ctx }) => {
            try {
                const thread = await db.query.threads.findFirst({
                    where: eq(threads.id, input.threadId),
                    with: {
                        messages: {
                            orderBy: [desc(messages.createdAt)],
                        },
                    },
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Conversation not found',
                    });
                }

                if (thread.userId !== ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not allowed to access this conversation',
                    });
                }

                return thread;
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to fetch conversation',
                    });
                }
                throw error;
            }
        }),

    getThreads: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(20),
            offset: z.date().optional(),
        }))
        .query(async ({ input, ctx }) => {
            try {
                const { limit, offset } = input;
                const userThreads = await db.query.threads.findMany({
                    where: and(
                        eq(threads.userId, ctx.session.user.id),
                        offset ? lt(threads.updatedAt, offset) : undefined
                    ),
                    orderBy: [desc(threads.updatedAt)],
                    limit: limit + 1,
                    offset: offset ? 1 : undefined,
                    with: {
                        messages: {
                            orderBy: [desc(messages.createdAt)],
                            limit: 1,
                        }
                    }
                });

                let nextCursor: Date | null = null;
                if (userThreads.length > limit) {
                    const nextItem = userThreads.pop();
                    nextCursor = nextItem?.updatedAt || null;
                }

                return {
                    threads: userThreads,
                    nextCursor,
                };
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch conversations',
                });
            }
        }),

    getMessage: protectedProcedure
        .input(z.object({
            messageId: z.string().uuid("Invalid message ID format"),
        }))
        .query(async ({ input, ctx }) => {
            try {
                const message = await db.query.messages.findFirst({
                    where: eq(messages.id, input.messageId),
                    with: {
                        thread: true,
                    },
                });

                if (!message) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Message not found',
                    });
                }

                if (message.thread.userId !== ctx.session.user.id) {
                    throw new TRPCError({
                        code: 'FORBIDDEN',
                        message: 'You are not allowed to access this message',
                    });
                }

                return message;
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to fetch message',
                    });
                }
                throw error;
            }
        }),

    deleteThread: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid("Invalid thread ID format"),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // First verify ownership
                const thread = await db.query.threads.findFirst({
                    where: and(eq(threads.id, input.threadId), eq(threads.userId, ctx.session.user.id)),
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Conversation not found',
                    });
                }

                // Delete all messages in the thread
                await db.delete(messages).where(eq(messages.threadId, input.threadId));

                // Delete the thread (messages will be cascade deleted)
                await db.delete(threads).where(eq(threads.id, input.threadId));

                return { success: true };
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to delete conversation',
                    });
                }
                throw error;
            }
        }),
})