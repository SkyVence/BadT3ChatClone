import { useChatStore } from "@/lib/statemanager";
import { models } from "@/models";
import { api } from "@/trpc/react";
import { useCallback } from "react";

export function useChatActions() {
    const {
        selectedThreadId,
        model,
        setStatus,
        setError,
        selectThread,
        setModel,
        upsertMessage,
        setMessages,
        setThreads,
        upsertThread,
        removeThread,
    } = useChatStore(state => ({
        selectedThreadId: state.selectedThreadId,
        model: state.model,
        /* writers */
        setStatus: state.setStatus,
        setError: state.setError,
        selectThread: state.selectThread,
        setModel: state.setModel,
        upsertMessage: state.upsertMessage,
        setMessages: state.setMessages,
        setThreads: state.setThreads,
        upsertThread: state.upsertThread,
        removeThread: state.removeThread,
    }));

    const utils = api.useUtils();

    const sendMutation = api.chat.sendMessageAndStartStream.useMutation();
    const deleteMutation = api.threads.deleteThread.useMutation();
    const threadsQuery = api.threads.getThreads.useQuery({ limit: 15, offset: 0 }, { enabled: false });
    const threadCtxQuery = api.threads.threadContext.useQuery({ threadId: selectedThreadId ?? "" }, { enabled: false });

    const send = useCallback(
        async (content: string, opts?: { modelVersion?: string }) => {
            if (!content.trim()) return;
            const mdl = opts?.modelVersion
                ? models.find(m => m.version === opts.modelVersion) ?? model
                : model;

            setStatus("sending");
            try {
                const { threadId } = await sendMutation.mutateAsync({
                    threadId: selectedThreadId ?? undefined,
                    prompt: content,
                    model: mdl.version,
                    provider: mdl.provider.toLowerCase() as "anthropic" | "openai" | "google",
                });

                if (threadId && threadId !== selectedThreadId) {
                    selectThread(threadId);
                }
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

    const refetchThreadContext = useCallback(async () => {
        if (!selectedThreadId) return;
        const res = await threadCtxQuery.refetch();
        setMessages(res.data?.data.messages ?? []);
    }, [selectedThreadId]);

    return {
        send,
        deleteThread,
        startNewThread,
        refetchThreads,
        refetchThreadContext,
        setModel,
        selectThread,
    }
}