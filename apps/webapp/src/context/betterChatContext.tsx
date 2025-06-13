import { useChatActions } from "@/hooks/useChatAction";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatStore } from "@/lib/statemanager";
import { ModelInfo } from "@/models";
import { ThreadMessage, ThreadSummary } from "@/types/message";
import { createContext, useContext, type ReactNode } from "react";

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
    setModel: (model: ModelInfo) => void;

    /* -------- helpers from useChatStream -------- */
    startStream: (messageId: string) => void;
    stopStream: () => void;
}

const BetterChatContext = createContext<BetterChatContextType | undefined>(undefined);

export function BetterChatProvider({ children }: { children: ReactNode }) {
    const {
        messages,
        threads,
        selectedThreadId,
        model,
        status,
        error,
    } = useChatStore(state => ({
        messages: state.currentMessages(),
        threads: state.threads,
        selectedThreadId: state.selectedThreadId,
        model: state.model,
        status: state.status,
        error: state.error,
    }));

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