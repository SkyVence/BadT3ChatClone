"use client";
import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/lib/statemanager";
import { subscriptionClient } from "@/trpc/react";


type Unsubscribe = () => void;
interface StreamEntry {
    unsubscribe: Unsubscribe;
    retryCount: number;
    retryTimer?: ReturnType<typeof setTimeout>;
}

export function useChatStream() {
    const upsertMessage = useChatStore(s => s.upsertMessage);
    const setStatus = useChatStore(s => s.setStatus);
    const setError = useChatStore(s => s.setError);

    const streamsRef = useRef<Map<string, StreamEntry>>(new Map());

    const subscribe = useCallback(
        (messageId: string, threadId: string) => {
            if (streamsRef.current.has(messageId)) return;

            const entry: StreamEntry = { unsubscribe: () => { }, retryCount: 0 };

            const start = () => {
                const unsub = subscriptionClient.stream.subToMessage.subscribe(
                    { messageId },
                    {
                        onData: msg => {
                            upsertMessage({
                                id: msg.messageId,
                                threadId: threadId,
                                role: "assistant",
                                content: msg.fullContent ?? "",
                                status: msg.type === "complete" ? "complete" : "streaming",
                                provider: "",
                                model: "",
                                error: msg.type === "error" ? msg.error ?? "Unknown error" : null,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            } as any);

                            if (msg.type === "complete") {
                                if (entry.retryTimer) {
                                    clearTimeout(entry.retryTimer);
                                    entry.retryTimer = undefined;
                                }
                                entry.unsubscribe();
                                streamsRef.current.delete(messageId);
                                if (streamsRef.current.size === 0) setStatus("idle");
                            }
                        },
                        onError: err => {
                            entry.retryCount += 1;
                            const maxRetries = 5;
                            if (entry.retryCount <= maxRetries) {
                                const delay = Math.min(2000 * Math.pow(1.5, entry.retryCount), 15000);
                                if (entry.retryTimer) clearTimeout(entry.retryTimer);
                                entry.retryTimer = setTimeout(start, delay);
                            } else {
                                setError(err.message);
                                setStatus("error");
                                entry.unsubscribe();
                                streamsRef.current.delete(messageId);
                            }
                        },
                    },
                );

                entry.unsubscribe = unsub.unsubscribe;
                streamsRef.current.set(messageId, entry);
            };

            setStatus("streaming");
            start();
        },
        [upsertMessage, setStatus, setError],
    );

    const startStream = useCallback(
        (messageId: string, threadId: string) => {
            subscribe(messageId, threadId);
        },
        [subscribe],
    );

    const stopStream = useCallback((messageId?: string) => {
        if (messageId) {
            const entry = streamsRef.current.get(messageId);
            if (entry) {
                if (entry.retryTimer) {
                    clearTimeout(entry.retryTimer);
                    entry.retryTimer = undefined;
                }
                entry.unsubscribe();
                streamsRef.current.delete(messageId);
            }
        } else {
            streamsRef.current.forEach(e => {
                if (e.retryTimer) {
                    clearTimeout(e.retryTimer);
                    e.retryTimer = undefined;
                }
                e.unsubscribe();
            });
            streamsRef.current.clear();
        }

        if (streamsRef.current.size === 0) setStatus("idle");
    }, []);

    const resumeActiveStreams = useCallback(
        (messages: any[]) => {
            const streamingMessages = messages.filter(
                m => m.role === "assistant" && m.status === "streaming",
            );
            if (streamingMessages.length > 0) {
                for (const msg of streamingMessages) {
                    startStream(msg.id, msg.threadId);
                }
            }
        },
        [startStream],
    );

    useEffect(() => () => stopStream(), [stopStream]);

    return { startStream, stopStream, resumeActiveStreams };
}