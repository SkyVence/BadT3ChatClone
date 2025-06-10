import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { db } from "@/db";
import { messages, threads } from "@/db/schema/threads";
import { eq } from "drizzle-orm";

interface anthropicOptions {
    apiKey: string;
    model: string;
    threadId: string;
    CoreMessages: {
        role: "user" | "assistant" | "system";
        content: string;
    }[];
    saveUserMessage?: boolean;
}
export async function* sendAnthropic({ apiKey, model, threadId, CoreMessages, saveUserMessage = true }: anthropicOptions) {

    if (CoreMessages.length < 1) {
        throw new Error("No messages provided");
    }

    // Save the new user message only if requested (to avoid duplicates)
    if (saveUserMessage) {
        const lastMessage = CoreMessages[CoreMessages.length - 1];
        if (lastMessage.role === "user") {
            const createMessage = await db.insert(messages).values({
                threadId,
                role: lastMessage.role,
                content: lastMessage.content,
                status: "complete",
                model,
            }).returning();
            const createdMessageId = createMessage[0].id;
        }
    }

    let fullResponse = "";

    try {
        const anthropic = createAnthropic({
            apiKey,
        });
        const chatModel = anthropic(model);

        const aiMessage = await db.insert(messages).values({
            threadId,
            role: "assistant",
            content: "",
            status: "streaming",
            model,
        }).returning();

        const aiMessageId = aiMessage[0].id;

        const { textStream } = streamText({
            model: chatModel,
            messages: CoreMessages,
            onChunk({ chunk }) {
                if (chunk.type === "text-delta") {
                    fullResponse += chunk.textDelta;
                    updateDatabaseRecord(aiMessageId, fullResponse);
                }
            },
            onFinish() {
                db.update(messages).set({
                    status: "complete",
                    content: fullResponse,
                    updatedAt: new Date(),
                }).where(eq(messages.id, aiMessageId));
            },
            onError(error) {
                db.update(messages).set({
                    status: "error",
                    error: error instanceof Error ? error.message : "Unknown error",
                    updatedAt: new Date(),
                }).where(eq(messages.id, aiMessageId));
            }
        });

        for await (const chunk of textStream) {
            yield chunk;
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Debounced database update to avoid too frequent writes
let updateTimeout: NodeJS.Timeout;
async function updateDatabaseRecord(messageId: string, response: string) {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(async () => {
        try {
            await db
                .update(messages)
                .set({
                    content: response,
                    status: "streaming",
                })
                .where(eq(messages.id, messageId));
        } catch (error) {
            console.error('Database update error:', error);
        }
    }, 100); // Update every 100ms max
}