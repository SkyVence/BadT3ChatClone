import { useState, useCallback } from "react";
import { useChatStore } from "@/lib/statemanager";
import { useMessageStream } from "@/hooks/use-message-stream";

/**
 * Hook that bridges the low-level SSE/WebSocket logic (useMessageStream)
 * with the global zustand store. The provider can expose the returned
 * startStream / stopStream functions to UI components.
 */
export function useChatStream() {
    const {
        upsertMessage,
        setStatus,
        setError,
    } = useChatStore(state => ({
        upsertMessage: state.upsertMessage,
        setStatus: state.setStatus,
        setError: state.setError,
    }));

    const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

    // Wire the lower-level stream hook. It will noop when messageId is null.
    useMessageStream({
        messageId: activeMessageId ?? "",
        initialStatus: "streaming",
        onMessage: (msg) => {
            // For deltas we only care about assembling the fullContent.
            if (msg.fullContent !== undefined) {
                // Update / append the message in the store. We only touch the
                // fields we know for sure; the reducer merges them.
                upsertMessage({
                    id: msg.messageId,
                    threadId: "", // optional, backend should reconcile
                    content: msg.fullContent,
                    status: msg.type === "complete" ? "complete" : "streaming",
                    model: "",
                    role: "assistant",
                    provider: "",
                    error: msg.type === "error" ? msg.error ?? "Unknown error" : null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                } as any);
            }
        },
        onComplete: () => {
            setStatus("idle");
            stopStream();
        },
        onError: (err) => {
            setStatus("error");
            setError(err);
            stopStream();
        },
    });

    const startStream = useCallback((messageId: string) => {
        setActiveMessageId(messageId);
        setStatus("streaming");
    }, []);

    const stopStream = useCallback(() => {
        setActiveMessageId(null);
    }, []);

    return { startStream, stopStream };
} 