import { protectedProcedure, router } from "@/lib/trpc";
import { db } from "@/db";
import { and, eq, desc, asc } from "drizzle-orm";
import { userKeys } from "@/db/schema/auth";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { decrypt } from "@/utils/crypto";
import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { sendAnthropic } from "@/models/anthropic";
import { messages, threads } from "@/db/schema/threads";

export const aiRouter = router({
    chat: protectedProcedure.input(z.object({
        provider: z.string(),
        model: z.string(),
        prompt: z.string(),
    })).subscription(async function* ({ ctx, input }) {
        const { provider, model, prompt } = input;
        const apiKeyResult = await db.select().from(userKeys).where(and(eq(userKeys.userId, ctx.session.user.id), eq(userKeys.provider, provider)));
        if (!apiKeyResult.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
        }
        const decodedKey = decrypt(apiKeyResult[0].hashedKey);
        const anthropic = createAnthropic({
            apiKey: decodedKey,
        });
        const chatModel = anthropic("claude-3-7-sonnet-20250219");

        const { textStream } = streamText({
            model: chatModel,
            messages: [{ role: "user", content: prompt }],
        });


        for await (const chunk of textStream) {
            yield chunk;
        }
    }),
    chatv2: protectedProcedure.input(z.object({
        threadId: z.string().uuid().optional(),
        provider: z.string(),
        model: z.string(),
        prompt: z.string(),
    })).subscription(async function* ({ ctx, input }) {
        const { provider, model, prompt } = input;
        let { threadId } = input;

        console.log(`[CHATV2] Called with threadId: ${threadId}, prompt: "${prompt.substring(0, 50)}..."`);

        // Fetch API key once
        const userApiKey = await db.query.userKeys.findFirst({
            where: and(eq(userKeys.userId, ctx.session.user.id), eq(userKeys.provider, provider)),
        });
        if (!userApiKey) {
            throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
        }
        const decodedKey = decrypt(userApiKey.hashedKey);

        switch (provider) {
            case "anthropic":
                if (!threadId) {
                    // Always create a new thread when no threadId is provided
                    const titleToUse = prompt.split(" ").slice(0, 3).join(" ");
                    console.log(`Creating new thread for user ${ctx.session.user.id} with prompt: "${titleToUse}"`);
                    const thread = await db.insert(threads).values({
                        userId: ctx.session.user.id,
                        title: titleToUse,
                    }).returning();
                    const createdThreadId = thread[0].id;
                    console.log(`Created thread with ID: ${createdThreadId}`);

                    // Create the initial user message
                    await db.insert(messages).values({
                        threadId: createdThreadId,
                        role: "user",
                        content: prompt,
                        status: "complete",
                        model,
                    });

                    const CoreMessages = [{ role: "user" as const, content: prompt }];
                    yield* sendAnthropic({
                        apiKey: decodedKey,
                        model,
                        threadId: createdThreadId,
                        CoreMessages,
                        saveUserMessage: false, // Don't save user message again since we just created it
                    });
                } else {
                    // Get messages from the specified thread
                    const existingMessages = await db.query.messages.findMany({
                        where: eq(messages.threadId, threadId),
                        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
                    });
                    const CoreMessages = existingMessages.map((message) => ({
                        role: message.role as "user" | "assistant" | "system",
                        content: message.content || "",
                    }));
                    const newCoreMessage = { role: "user" as const, content: prompt };
                    const allMessages = [...CoreMessages, newCoreMessage];
                    yield* sendAnthropic({
                        apiKey: decodedKey,
                        model,
                        threadId,
                        CoreMessages: allMessages,
                        saveUserMessage: true, // Save the new user message for existing threads
                    });
                }
                break;

            case "openai":
                // TODO: Implement OpenAI logic
                break;
            case "google":
                // TODO: Implement Google logic
                break;
            default:
                throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported provider" });
        }
    })
})  