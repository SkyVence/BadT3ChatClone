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
    startNewThread: () => void;
    messages: Message[];
    isMessagesLoading: boolean;
    refetchMessages: () => void;
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
            // If no threadId was set and we got one back, update it
            if (!threadId && data.threadId) {
                setThreadId(data.threadId);
            }
            setIsLoading(false);
            setError(null);
            // Refetch messages to get the latest state
            refetchMessages();
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
            threadId: threadId || undefined, // Send undefined for new threads
            prompt,
            model: selectedModel.version,
            provider: selectedModel.provider as 'anthropic' | 'openai' | 'google',
        });
    }, [sendMessageMutation, threadId]);

    const startNewThread = useCallback(() => {
        setThreadId(null);
        setMessageId(null);
        setError(null);
    }, []);

    return (
        <StreamerContext.Provider value={{ 
            messageId, 
            isLoading, 
            error, 
            threadId, 
            setThreadId, 
            sendMessage, 
            startNewThread,
            messages, 
            isMessagesLoading,
            refetchMessages
        }}>
            {children}
        </StreamerContext.Provider>
    )
}

export function useStreamer() {
    const ctx = useContext(StreamerContext);
    if (!ctx) {
        throw new Error('useStreamer must be used within a StreamerProvider');
    }
    return ctx;
}