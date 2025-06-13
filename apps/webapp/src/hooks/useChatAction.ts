+"use client";
// client-side hook

import { useChatStore } from "@/lib/statemanager";
import { models } from "@/models";
import { api } from "@/trpc/react";
import { useCallback } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import { v4 as uuid } from "uuid";

export function useChatActions() {
    // Select reactive primitives individually to avoid new object every render
    const selectedThreadId = useChatStore(state => state.selectedThreadId);
    const model = useChatStore(state => state.model);

    // Non-reactive writer functions (stable references)
    const setStatus = useChatStore(state => state.setStatus);
    const setError = useChatStore(state => state.setError);
    const selectThread = useChatStore(state => state.selectThread);
    const setModel = useChatStore(state => state.setModel);
    const upsertMessage = useChatStore(state => state.upsertMessage);
    const setMessages = useChatStore(state => state.setMessages);
    const setThreads = useChatStore(state => state.setThreads);
    const upsertThread = useChatStore(state => state.upsertThread);
    const removeThread = useChatStore(state => state.removeThread);

    const utils = api.useUtils();

    const sendMutation = api.chat.sendMessageAndStartStream.useMutation();
    const deleteMutation = api.threads.deleteThread.useMutation();
    const threadsQuery = api.threads.getThreads.useQuery({ limit: 15, offset: 0 }, { enabled: false });
    const threadCtxQuery = api.threads.threadContext.useQuery({ threadId: selectedThreadId ?? "" }, { enabled: false });

    const { startStream } = useChatStream();

    const send = useCallback(
        async (content: string, opts?: { modelVersion?: string }) => {
            if (!content.trim()) return;
            const mdl = opts?.modelVersion
                ? models.find(m => m.version === opts.modelVersion) ?? model
                : model;

            setStatus("sending");

            // optimistic user message
            const localUserId = uuid();
            upsertMessage({
                id: localUserId,
                threadId: selectedThreadId ?? "temp",
                role: "user",
                content: content,
                status: "complete",
                model: model.version,
                provider: model.provider,
                error: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as any);

            try {
                const { threadId, messageId } = await sendMutation.mutateAsync({
                    threadId: selectedThreadId ?? undefined,
                    prompt: content,
                    model: mdl.version,
                    provider: mdl.provider.toLowerCase() as "anthropic" | "openai" | "google",
                });

                if (threadId && threadId !== selectedThreadId) {
                    selectThread(threadId);

                    // update optimistic user message's threadId
                    upsertMessage({
                        id: localUserId,
                        threadId: threadId,
                    } as any);
                }
                if (messageId) startStream(messageId);
                setStatus("streaming");
            } catch (error) {
                setStatus("error");
                setError(error instanceof Error ? error.message : "Unknown error");
            }
        },
        [selectedThreadId, model]
    );

    const deleteThread = useCallback(async (threadId: string) => {
        await deleteMutation.mutateAsync({ threadId });
        removeThread(threadId);
        if (selectedThreadId === threadId) selectThread(null);
    }, [selectedThreadId]);

    const startNewThread = useCallback(async () => {
        selectThread(null);
        setMessages([]);
    }, []);

    const refetchThreads = useCallback(async () => {
        const res = await threadsQuery.refetch();
        const threads = res.data?.data ?? [];
        setThreads(threads.map(thread => ({
            ...thread,
            lastMessagePreview: thread.messages[thread.messages.length - 1]?.content ?? '',
            lastActivityAt: thread.messages[thread.messages.length - 1]?.updatedAt ?? thread.updatedAt,
            messageCount: thread.messages.length
        })));
    }, []);

    const fetchThreadContext = useCallback(async (threadId: string) => {
        if (!threadId) return;
        // directly fetch via tRPC utils to avoid stale closure
        const res = await utils.threads.threadContext.fetch({ threadId });
        setMessages(res?.data?.messages ?? []);
    }, []);

    const refetchThreadContext = useCallback(async () => {
        if (!selectedThreadId) return;
        await fetchThreadContext(selectedThreadId);
    }, [selectedThreadId, fetchThreadContext]);

    return {
        send,
        deleteThread,
        startNewThread,
        refetchThreads,
        refetchThreadContext,
        fetchThreadContext,
        setModel,
        selectThread,
    }
}