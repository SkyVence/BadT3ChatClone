import { db } from "@/db";
import { userKeys } from "@/db/schema/auth";
import { messages, threads } from "@/db/schema/threads";
import { auth } from "@/lib/auth";
import { decrypt } from "@/utils/crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { publisher } from "@/lib/redis";
import { NextResponse } from "next/server";

const runStreamSchema = z.object({
    threadId: z.string().uuid(),
    prompt: z.string().min(1),
    model: z.string(),
    provider: z.enum(["anthropic", "openai", "google"]),
})

export async function POST(req: Request) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });
        if (!session) {
            return new Response("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { threadId, prompt, model, provider } = runStreamSchema.parse(body);

        const getApiKey = await db.query.userKeys.findFirst({
            where: and(eq(userKeys.userId, session.user.id), eq(userKeys.provider, provider)),
        })
        if (!getApiKey) {
            return new Response("API key not found", { status: 404 });
        }
        const apiKey = decrypt(getApiKey.hashedKey);

        let rawThreadId: string | null = null;

        const thread = await db.query.threads.findFirst({
            where: eq(threads.id, threadId),
        })
        if (!thread) {
            return new Response("Thread not found", { status: 404 });
        }
        rawThreadId = threadId;

        if (!rawThreadId) {
            return new Response("Error while creating or fetching thread", { status: 500 });
        }

        // Add the user message to the thread
        const [userMessage] = await db.insert(messages).values({
            threadId: rawThreadId,
            content: prompt,
            role: 'user',
            model,
            provider,
            status: 'complete',
        }).returning();

        const [assistantMessage] = await db.insert(messages).values({
            threadId: rawThreadId,
            content: '',
            role: 'assistant',
            model,
            provider,
            status: 'streaming',
        }).returning();

        let aiProvider;
        let selectedModel;
        switch (provider) {
            case 'anthropic':
                aiProvider = createAnthropic({
                    apiKey,
                })
                selectedModel = aiProvider(model)
                break;
            case 'openai':
                aiProvider = createOpenAI({
                    apiKey,
                })
                selectedModel = aiProvider(model)
                break;
            case 'google':
                aiProvider = createGoogleGenerativeAI({
                    apiKey,
                })
                selectedModel = aiProvider(model)
                break;
            default:
                return new Error(`Unsupported provider: ${provider}`);
        }

        const contextHistory = await db.query.messages.findMany({
            where: eq(messages.threadId, rawThreadId),
            orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        })

        const aiMessages = contextHistory
            .filter((msg => msg.id! !== assistantMessage.id))
            .map((msg => ({
                role: msg.role as "user" | "assistant" | "system",
                content: msg.content || "",
            })));

        const stream = await streamText({
            model: selectedModel,
            messages: aiMessages
        });

        let fullResponse = "";

        (async () => {
            try {
                for await (const delta of stream.textStream) {
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
                await db.update(messages)
                    .set({
                        status: 'complete',
                        updatedAt: new Date()
                    })
                    .where(eq(messages.id, assistantMessage.id));

                await publisher.publish(`message:${assistantMessage.id}`, JSON.stringify({
                    type: 'complete',
                    fullContent: fullResponse,
                    messageId: assistantMessage.id,
                }));

            } catch (error) {
                await db.update(messages)
                    .set({
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknow error',
                        updatedAt: new Date(),
                    })
                    .where(eq(messages.id, assistantMessage.id));

                await publisher.publish(`message:${assistantMessage.id}`, JSON.stringify({
                    type: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                    messageId: assistantMessage.id,
                }));
            }
        })();

        return NextResponse.json({
            success: true,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Internal server Error' },
            { status: 500 }
        );
    }
}