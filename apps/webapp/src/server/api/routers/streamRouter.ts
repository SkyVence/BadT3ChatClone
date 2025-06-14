import { db } from "@/db";
import { messages, threads, userKeys } from "@/db/schema";
import { publisher, subscriber } from "@/lib/redis";
import { protectedProcedure, router } from "@/server/api/trpc";
import { decrypt } from "@/utils/crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { TRPCError } from "@trpc/server";
import { streamText } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";


/* --- Helper Functions for the streamRouter --- */

interface getOrCreateThreadProps {
    db: typeof db;
    userId: string;
    prompt: string;
    threadId?: string;
}

interface getUserApiKeyProps {
    db: typeof db;
    userId: string;
    provider: "anthropic" | "openai" | "google";
    decrypt: typeof decrypt;
}

interface selectAIProviderProps {
    provider: "anthropic" | "openai" | "google";
    apiKey: string;
    model: string;
}

interface createMessagesProps {
    db: typeof db;
    threadId: string;
    prompt: string;
    model: string;
    provider: "anthropic" | "openai" | "google";
}

interface getContextHistoryProps {
    db: typeof db;
    threadId: string;
    assistantMessageId: string;
}

interface streamAndUpdateMessageProps {
    stream: any;
    db: typeof db;
    assistantMessage: any;
    publisher: typeof publisher;
}

async function getOrCreateThread({ db, userId, prompt, threadId }: getOrCreateThreadProps) {
    if (threadId) {
        const thread = await db.query.threads.findFirst({ where: eq(threads.id, threadId) });
        if (!thread) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
        if (thread.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not allowed' });
        return thread.id;
    }
    const [newThread] = await db.insert(threads).values({
        userId,
        title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
    }).returning();
    if (!newThread) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create thread' });
    return newThread.id;
}

async function getUserApiKey({ db, userId, provider, decrypt }: getUserApiKeyProps) {
    const getApiKey = await db.query.userKeys.findFirst({
        where: and(eq(userKeys.userId, userId), eq(userKeys.provider, provider)),
    });
    if (!getApiKey) throw new TRPCError({ code: 'BAD_REQUEST', message: 'API key not found' });
    return decrypt(getApiKey.hashedKey);
}

async function* streamingDedent(stream: ReadableStream<string>): AsyncGenerator<string> {
    let minIndent: number | null = null;
    let lineBuffer = "";
    const reader = stream.getReader();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (lineBuffer) yield lineBuffer; // Yield any remaining buffer
                break;
            }

            lineBuffer += value;
            const lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() || ""; // Keep the last partial line in the buffer

            for (const line of lines) {
                if (minIndent === null && line.trim() !== "") {
                    // This is the first contentful line. Determine the indent.
                    const match = line.match(/^\s+/);
                    minIndent = match ? match[0].length : 0;
                }

                if (minIndent !== null) {
                    yield line.substring(minIndent) + "\n";
                } else {
                    // Still waiting for the first contentful line
                    yield line + "\n";
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}


async function createMessages({ db, threadId, prompt, model, provider }: createMessagesProps) {
    const [userMessage] = await db.insert(messages).values({
        threadId,
        content: prompt,
        role: 'user',
        model,
        provider,
        status: 'complete',
    }).returning();
    const [assistantMessage] = await db.insert(messages).values({
        threadId,
        content: '',
        role: 'assistant',
        model,
        provider,
        status: 'streaming',
    }).returning();
    return { userMessage, assistantMessage };
}


function selectAIProvider({ provider, apiKey, model }: selectAIProviderProps) {
    switch (provider) {
        case 'anthropic': return createAnthropic({ apiKey })(model);
        case 'openai': return createOpenAI({ apiKey })(model);
        case 'google': return createGoogleGenerativeAI({ apiKey })(model);
        default: throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported provider' });
    }
}



async function getContextHistory({ db, threadId, assistantMessageId }: getContextHistoryProps) {
    const contextHistory = await db.query.messages.findMany({
        where: eq(messages.threadId, threadId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
    return contextHistory
        .filter(msg => msg.id !== assistantMessageId)
        .map(msg => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content || "",
        }));
}


async function streamAndUpdateMessage({ stream, db, assistantMessage, publisher }: streamAndUpdateMessageProps) {
    let fullResponse = "";
    for await (const delta of streamingDedent(stream.textStream)) {
        fullResponse += delta;
        await db.update(messages).set({
            content: fullResponse,
            updatedAt: new Date(),
        }).where(eq(messages.id, assistantMessage.id));
        await publisher.publish(`message:${assistantMessage.id}`, JSON.stringify({
            type: 'delta',
            content: delta,
            fullContent: fullResponse,
            messageId: assistantMessage.id,
        }));
    }
    await db.update(messages).set({
        status: 'complete',
        updatedAt: new Date(),
    }).where(eq(messages.id, assistantMessage.id));
    await publisher.publish(`message:${assistantMessage.id}`, JSON.stringify({
        type: 'complete',
        fullContent: fullResponse,
        messageId: assistantMessage.id,
    }));
}



export const streamRouter = router({
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
            const { prompt, model, provider } = input;
            const userId = ctx.session.user.id;

            // 1. Thread
            const threadId = await getOrCreateThread({ db, userId, prompt, threadId: input.threadId });

            // 2. API Key
            const apiKey = await getUserApiKey({ db, userId, provider, decrypt });

            // 3. Messages
            const { userMessage, assistantMessage } = await createMessages({ db, threadId, prompt, model, provider });

            // 4. AI Provider
            const selectedModel = selectAIProvider({ provider, apiKey, model });

            // 5. Context
            const aiMessages = await getContextHistory({ db, threadId, assistantMessageId: assistantMessage.id });

            // 6. Stream
            const stream = await streamText({ model: selectedModel, messages: aiMessages });
            streamAndUpdateMessage({ stream, db, assistantMessage, publisher });

            return {
                threadId,
                messageId: assistantMessage.id,
                userMessageId: userMessage.id,
            };
        }),
    subToMessage: protectedProcedure
        .input(z.object({ messageId: z.string().uuid("Invalid message ID format") }))
        .subscription(async function* ({ input, ctx }) {
            // Align channel name with the publisher in streamAndUpdateMessage
            const channel = `message:${input.messageId}`;
            const queue: string[] = [];
            const handler = (_channel: string, message: string) => {
                if (_channel === channel) {
                    queue.push(message);
                }
            };
            subscriber.on('message', handler);
            subscriber.subscribe(channel);

            try {
                while (true) {
                    // Wait for new messages
                    if (queue.length === 0) {
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        continue;
                    }
                    const data = queue.shift();
                    if (data) {
                        const parsed = JSON.parse(data);
                        yield parsed;
                    }
                }
            } finally {
                subscriber.unsubscribe(channel);
                subscriber.off('message', handler);
            }
        }),
})