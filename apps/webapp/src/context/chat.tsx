"use client";

import { models } from '@/models';
import { api } from '@/trpc/react';
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Message {
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
}

interface StreamMessage {
    type: 'initial' | 'delta' | 'complete' | 'error';
    content?: string;
    fullContent?: string;
    status?: string;
    error?: string;
    messageId: string;
}

interface UseMessageStreamProps {
    messageId: string;
    initialStatus?: 'streaming' | 'complete' | 'error';
    onMessage?: (message: StreamMessage) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: string) => void;
}

interface StreamerContextType {
    messageId: string | null;
    isLoading: boolean;
    error: string | null;
    threadId: string | null;
    setThreadId: (id: string | null) => void;
    sendMessage: (prompt: string, modelVersion?: string) => void;
    messages: Message[];
    isMessagesLoading: boolean;
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined);

interface StreamerProviderProps {
    children: ReactNode;
}

export function StreamerProvider({ children }: StreamerProviderProps) {
    const [messageId, setMessageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);

    const sendMessageMutation = api.chat.sendMessageAndStartStream.useMutation({
        onSuccess: (data: any) => {
            console.log('Message sent successfully:', data);
            setMessageId(data.messageId);
            setIsLoading(false);
            setError(null);
        },
        onError: (err: any) => {
            setError(String(err));
            setIsLoading(false);
        },
    });

    const { data: threadData, isLoading: isMessagesLoading, refetch: refetchMessages } = api.threads.threadContext.useQuery({ threadId: threadId! }, {
        enabled: !!threadId,
    });

    const messages: Message[] = threadData?.data?.messages || [];

    const sendMessage = useCallback((prompt: string, modelVersion?: string) => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);

        const selectedModel = models.find((m) => m.version === modelVersion) || models[8];
        sendMessageMutation.mutate({
            threadId: threadId || undefined,
            prompt,
            model: selectedModel.version,
            provider: selectedModel.provider as 'anthropic' | 'openai' | 'google',
        });
    }, [sendMessageMutation, threadId]);

    return (
        <StreamerContext.Provider value={{ messageId, isLoading, error, threadId, setThreadId, sendMessage, messages, isMessagesLoading }}>
            {children}
        </StreamerContext.Provider>
    )
}

export function useStreamer() {
    const ctx = useContext(StreamerContext);
}