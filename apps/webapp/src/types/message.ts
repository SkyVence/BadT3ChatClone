import { ModelInfo } from "@/models";

export type ThreadMessage = {
    id: string;
    threadId: string;
    status: string;
    model: string;
    role: string;
    provider: string;
    content: string | null;
    error: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ThreadSummary = {
    id: string;
    title: string;
    lastMessagePreview: string;
    lastActivityAt: string;
    messageCount: number;
    model?: ModelInfo;
}