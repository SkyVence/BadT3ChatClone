import { db } from "@/db";
import { messages, threads } from "@/db/schema";
import { protectedProcedure, router } from "@/lib/trpc";
import { desc, eq } from "drizzle-orm";
import z from "zod";

export const chatRouter = router({
    sendMessageAndStartStream: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid().optional(),
            prompt: z.string().min(1),
            model: z.string(),
            provider: z.enum(['anthropic', 'openai', 'google']),
        }))
        .mutation(async ({ input, ctx }) => {
            const { threadId, prompt, model, provider } = input;
            const userId = ctx.session.user.id;

            let finalThreadId = threadId;

            if (!finalThreadId) {
                const [newThread] = await db.insert(threads).values({
                    userId,
                    title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
                }).returning();
                finalThreadId = newThread.id;
            } else {
                const thread = await db.query.threads.findFirst({
                    where: eq(threads.id, finalThreadId),
                });

                if (!thread || thread.userId !== userId) {
                    throw new Error('Thread not found');
                }
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/chat/run-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Forward the original request headers to maintain session
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
                const debug = JSON.stringify(response.status)
                throw new Error(`Failed to start stream ${debug}`);
            }

            const result = await response.json();

            return {
                threadId: finalThreadId,
                messageId: result.messageId,
                userMessageId: result.userMessageId,
            };
        }),
    getThread: protectedProcedure
        .input(z.object({
            threadId: z.string().uuid(),
        }))
        .query(async ({ input, ctx }) => {
            const thread = await db.query.threads.findFirst({
                where: eq(threads.id, input.threadId),
                with: {
                    messages: {
                        orderBy: [desc(messages.createdAt)],
                    },
                },
            });

            if (!thread || thread.userId !== ctx.session.user.id) {
                throw new Error("Thread not found");
            }

            return thread;
        }),
    getThreads: protectedProcedure
        .query(async ({ ctx }) => {
            const userThreads = await db.query.threads.findMany({
                where: eq(threads.userId, ctx.session.user.id),
                orderBy: [desc(threads.updatedAt)],
                with: {
                    messages: {
                        orderBy: [desc(messages.createdAt)],
                        limit: 1,
                    }
                }
            });

            return userThreads;
        }),
    getMessage: protectedProcedure
        .input(z.object({
            messageId: z.string().uuid(),
        }))
        .query(async ({ input, ctx }) => {
            const message = await db.query.messages.findFirst({
                where: eq(messages.id, input.messageId),
                with: {
                    thread: true,
                },
            });
            if (!message || message.thread.userId !== ctx.session.user.id) {
                throw new Error('Message not found');
            }

            return message;
        }),
})