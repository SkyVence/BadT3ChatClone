import { db } from "@/db";
import { messages, threads } from "@/db/schema";
import {
    protectedProcedure,
    router,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq } from "drizzle-orm";
import z from "zod";

export const threadsRouter = router({
    getThreads: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(15),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;

                const [totalResult, queryData] = await Promise.all([
                    db.select({ value: count() }).from(threads).where(eq(threads.userId, userId)),
                    db.query.threads.findMany({
                        where: eq(threads.userId, userId),
                        orderBy: [desc(threads.updatedAt)],
                        with: {
                            messages: {
                                orderBy: [desc(messages.createdAt)],
                                limit: 1
                            },
                        },
                        limit: input.limit,
                        offset: input.offset,
                    })
                ]);

                const total = totalResult[0]?.value ?? 0;
                const totalPages = Math.ceil(total / input.limit);

                return {
                    data: queryData,
                    meta: {
                        total,
                        totalPages,
                        page: Math.floor(input.offset / input.limit) + 1,
                        limit: input.limit,
                    },
                };
            } catch (error) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to fetch conversations',
                });
            }
        }),

    threadContext: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid("Invalid thread ID format"),
        }))
        .query(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;
                const { threadId } = input;

                const thread = await db.query.threads.findFirst({
                    where: and(
                        eq(threads.id, threadId),
                        eq(threads.userId, userId)
                    ),
                    with: {
                        messages: {
                            orderBy: [asc(messages.createdAt)]
                        },
                    }
                });

                if (!thread) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Conversation not found',
                    });
                }

                return {
                    data: thread
                };
            } catch (error) {
                if (!(error as any).code) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Failed to fetch conversation context',
                    });
                }
                throw error;
            }
        }),

    deleteThread: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid("Invalid thread ID format"),
        }))
        .mutation(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;
                const { threadId } = input;

                // First verify the thread exists and belongs to the user
                const thread = await db.query.threads.findFirst({
                    where: eq(threads.id, threadId),
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
                        message: 'You are not allowed to delete this conversation',
                    });
                }

                // Delete the thread (messages will be cascade deleted)
                await db.delete(threads).where(
                    and(
                        eq(threads.id, threadId),
                        eq(threads.userId, userId)
                    )
                );

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