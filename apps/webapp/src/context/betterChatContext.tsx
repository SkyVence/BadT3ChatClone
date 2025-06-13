+"use client";
// ^ This file relies on React client-side hooks (zustand, context)
import { useChatActions } from "@/hooks/useChatAction";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatStore } from "@/lib/statemanager";
import { ModelInfo } from "@/models";
import { ThreadMessage, ThreadSummary } from "@/types/message";
import { createContext, useContext, type ReactNode } from "react";
import { useMemo } from "react";

interface BetterChatContextType {
    /* -------- read-only state -------- */
    messages: ThreadMessage[];
    threads: ThreadSummary[];
    selectedThreadId: string | null;
    model: ModelInfo;
    status: "idle" | "loading" | "sending" | "streaming" | "error";
    error: string | null;

    /* -------- convenience flags -------- */
    isLoadingThread: boolean;   // status === "loading"
    isSending: boolean;         // status === "sending"
    isStreaming: boolean;       // status === "streaming"

    /* -------- actions from useChatActions -------- */
    send: (content: string, opts?: { modelVersion?: string }) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    startNewThread: () => Promise<void>;
    selectThread: (threadId: string) => void;
    refetchThreads: () => Promise<void>;
    refetchThreadContext: () => Promise<void>;
    fetchThreadContext: (threadId: string) => Promise<void>;
    setModel: (model: ModelInfo) => void;

    /* -------- helpers from useChatStream -------- */
    startStream: (messageId: string) => void;
    stopStream: () => void;
}

const BetterChatContext = createContext<BetterChatContextType | undefined>(undefined);

export function BetterChatProvider({ children }: { children: ReactNode }) {
    const threads = useChatStore(state => state.threads);
    const selectedThreadId = useChatStore(state => state.selectedThreadId);
    const model = useChatStore(state => state.model);
    const status = useChatStore(state => state.status);
    const error = useChatStore(state => state.error);
    const allMessages = useChatStore(state => state.messages);

    const messages = useMemo(() => {
        if (!selectedThreadId) return [];
        return allMessages.filter(m => m.threadId === selectedThreadId);
    }, [allMessages, selectedThreadId]);

    const actions = useChatActions();
    const { startStream, stopStream } = useChatStream();

    const value: BetterChatContextType = {
        messages,
        threads,
        selectedThreadId,
        model,
        status,
        error,
        isLoadingThread: status === "loading",
        isSending: status === "sending",
        isStreaming: status === "streaming",
        ...actions,
        startStream,
        stopStream,
    };

    return (
        <BetterChatContext.Provider value={value}>
            {children}
        </BetterChatContext.Provider>
    )
}

export function useBetterChat() {
    const ctx = useContext(BetterChatContext);
    if (!ctx) throw new Error("useBetterChat must be used inside BetterChatProvider");
    return ctx;
}