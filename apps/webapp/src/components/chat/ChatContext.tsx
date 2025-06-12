import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { api } from '@/trpc/react';
import { models } from '@/models';

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

interface ChatContextType {
    currentMessageId: string | null;
    isLoading: boolean;
    error: string | null;
    threadId: string | null;
    setThreadId: (id: string | null) => void;
    sendMessage: (prompt: string, modelVersion?: string) => void;
    messages: Message[];
    isMessagesLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);

    // Use the mutation from trpc
    const sendMessageMutation = api.chat.sendMessageAndStartStream.useMutation({
        onSuccess: (data: any) => {
            setCurrentMessageId(data.messageId);
            setIsLoading(false);
            setError(null);
            refetchMessages(); // Refetch messages after sending
        },
        onError: (err: any) => {
            setError(String(err));
            setIsLoading(false);
        },
    });

    // Fetch messages for the current thread
    const {
        data: threadData,
        isLoading: isMessagesLoading,
        refetch: refetchMessages,
    } = api.chat.getThread.useQuery(
        { threadId: threadId! },
        {
            enabled: !!threadId,
        }
    );

    const messages: Message[] = threadData?.messages || [];

    const sendMessage = useCallback((prompt: string, modelVersion?: string) => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setError(null);
        // Use selected model or fallback
        const selectedModel = models.find((m) => m.version === modelVersion) || models[8];
        sendMessageMutation.mutate({
            threadId: threadId || undefined,
            prompt,
            model: selectedModel.version,
            provider: selectedModel.provider as 'anthropic' | 'openai' | 'google',
        });
    }, [sendMessageMutation, threadId]);

    return (
        <ChatContext.Provider value={{ currentMessageId, isLoading, error, threadId, setThreadId, sendMessage, messages, isMessagesLoading }}>
            {children}
        </ChatContext.Provider>
    );
};

export function useChat() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChat must be used within a ChatProvider');
    return ctx;
} 