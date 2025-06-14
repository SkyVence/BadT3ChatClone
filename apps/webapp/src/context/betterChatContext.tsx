+"use client";
// ^ This file relies on React client-side hooks (zustand, context)
import { useChatActions } from "@/hooks/useChatAction";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatStore } from "@/lib/statemanager";
import { ModelInfo } from "@/models";
import { ThreadMessage, ThreadSummary } from "@/types/message";
import { createContext, useContext, type ReactNode, useEffect, useMemo } from "react";

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
    startStream: (messageId: string, threadId: string) => void;
    resumeActiveStreams: (messages: ThreadMessage[]) => void;
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
    const { startStream, stopStream, resumeActiveStreams } = useChatStream();

    // Fetch latest threads from the server when the provider mounts so that the
    // sidebar stays in sync with the database after a full page reload.
    useEffect(() => {
        // Fire and forget – any errors are handled inside the hook
        actions.refetchThreads();
    }, [actions.refetchThreads]);

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
        resumeActiveStreams,
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