"use client";

import { ModelInfo, models } from '@/models';
import { api } from '@/trpc/react';
import { useTRPCErrorHandler } from '@/hooks/use-trpc-error-handler';
import { toastUtils } from '@/lib/toast';
import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react";

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
    model: ModelInfo | null;
    setModel: (model: ModelInfo) => void;
    messageId: string | null;
    isLoading: boolean;
    error: string | null;
    threadId: string | null;
    setThreadId: (id: string | null) => void;
    sendMessage: (prompt: string, modelVersion?: string) => void;
    startNewThread: () => void;
    clearMessageId: () => void;
    messages: Message[];
    isMessagesLoading: boolean;
    refetchMessages: () => void;
    optimisticMessage: Message | null;
}

const StreamerContext = createContext<StreamerContextType | undefined>(undefined);

interface StreamerProviderProps {
    children: ReactNode;
}

export function StreamerProvider({ children }: StreamerProviderProps) {
    const [model, setModel] = useState<ModelInfo | null>(models[0]);
    const [messageId, setMessageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);

    const utils = api.useUtils();
    const { handleStreamError } = useTRPCErrorHandler();

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
            // Clear optimistic message since real message is now available
            setOptimisticMessage(null);

            // Refetch messages to get the latest state
            refetchMessages();

            // Optimistically update threads list
            if (data.threadId) {
                utils.threads.getThreads.invalidate();
            }
        },
        onError: (error) => {
            console.error('Send message error:', error);
            handleStreamError(error);
            setIsLoading(false);
            setMessageId(null);
            setOptimisticMessage(null); // Clear optimistic message on error
            setError(null); // Error is handled by toast, don't store it locally
        },
    });

    const { data: threadData, isLoading: isMessagesLoading, refetch: refetchMessages, error: threadError } = api.threads.threadContext.useQuery(
        { threadId: threadId! },
        {
            enabled: !!threadId,
        }
    );

    // Handle thread query errors
    useEffect(() => {
        if (threadError && threadId) {
            console.error('Thread context error:', threadError);
            handleStreamError(threadError);
        }
    }, [threadError, threadId, handleStreamError]);

    // Get messages from server and merge with optimistic message, then sort properly
    const serverMessages: Message[] = threadData?.data?.messages || [];
    const allMessages = optimisticMessage
        ? [...serverMessages, optimisticMessage]
        : serverMessages;

    // Always sort messages by creation time to ensure proper chronological order
    const messages = allMessages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Check for streaming messages and resume streaming when messages are loaded
    useEffect(() => {
        if (!isMessagesLoading && serverMessages.length > 0) {
            // Find the most recent streaming message (should be assistant role)
            const streamingMessage = serverMessages
                .filter(msg => msg.role === 'assistant' && msg.status === 'streaming')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            [0];

            if (streamingMessage && streamingMessage.id !== messageId) {
                console.log('Found streaming message, resuming streaming for:', streamingMessage.id);
                setMessageId(streamingMessage.id);
            } else if (!streamingMessage && messageId) {
                // No streaming messages found but we have a messageId, clear it
                const currentMessage = serverMessages.find(msg => msg.id === messageId);
                if (currentMessage && (currentMessage.status === 'complete' || currentMessage.status === 'error')) {
                    console.log('Current message is no longer streaming, clearing messageId');
                    setMessageId(null);
                }
            }
        }
    }, [serverMessages, isMessagesLoading, messageId]);

    const sendMessage = useCallback((prompt: string, modelVersion?: string) => {
        if (!prompt.trim()) {
            toastUtils.warning("Please enter a message");
            return;
        }

        // Clear any existing messageId before sending new message
        setMessageId(null);
        setIsLoading(true);
        setError(null);

        // Create optimistic user message
        const optimisticUserMessage: Message = {
            id: `optimistic-${Date.now()}`,
            threadId: threadId || `temp-${Date.now()}`,
            status: 'complete',
            model: '',
            role: 'user',
            provider: '',
            content: prompt,
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setOptimisticMessage(optimisticUserMessage);

        const selectedModel = models.find((m) => m.version === modelVersion) || models[0];
        console.log("selectedModel", selectedModel);

        if (!selectedModel) {
            toastUtils.error("No valid model selected");
            setIsLoading(false);
            setOptimisticMessage(null);
            return;
        }

        sendMessageMutation.mutate({
            threadId: threadId || undefined, // Send undefined for new threads
            prompt,
            model: selectedModel.version,
            provider: selectedModel.provider.toLowerCase() as 'anthropic' | 'openai' | 'google',
        });
    }, [sendMessageMutation, threadId]);

    const startNewThread = useCallback(() => {
        setThreadId(null);
        setMessageId(null);
        setError(null);
        setOptimisticMessage(null);
    }, []);

    const clearMessageId = useCallback(() => {
        setMessageId(null);
    }, []);

    return (
        <StreamerContext.Provider value={{
            model,
            setModel,
            messageId,
            isLoading,
            error,
            threadId,
            setThreadId,
            sendMessage,
            startNewThread,
            clearMessageId,
            messages,
            isMessagesLoading,
            refetchMessages,
            optimisticMessage
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