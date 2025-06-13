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