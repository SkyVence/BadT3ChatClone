+"use client";
import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { ThreadMessage, ThreadSummary } from "@/types/message";
import { ModelInfo, models } from "@/models";

type Status = "idle" | "loading" | "sending" | "streaming" | "error";

interface ChatState {
    /* ---------- domain data ---------- */
    threads: ThreadSummary[];
    messages: ThreadMessage[];
    selectedThreadId: string | null;
    model: ModelInfo;
    status: Status;
    error: string | null;

    /* ---------- derived selectors ---------- */
    currentThread: () => ThreadSummary | undefined;
    currentMessages: () => ThreadMessage[];

    /* ---------- actions ---------- */
    setThreads: (threads: ThreadSummary[]) => void;
    upsertThread: (thread: ThreadSummary) => void;
    removeThread: (threadId: string) => void;

    setMessages: (msgs: ThreadMessage[]) => void;
    upsertMessage: (msg: ThreadMessage) => void;
    removeMessage: (msgId: string) => void;

    selectThread: (threadId: string | null) => void;
    setModel: (model: ModelInfo) => void;
    setStatus: (s: Status) => void;
    setError: (e: string | null) => void;
}

export const useChatStore = create<ChatState>()(
    devtools(
        persist(
            subscribeWithSelector((set, get) => ({
                /* ----- initial state ----- */
                threads: [],
                messages: [],
                selectedThreadId: null,
                model: models[0],
                status: "idle",
                error: null,

                /* ----- selectors ----- */
                currentThread: () =>
                    get().threads.find(t => t.id === get().selectedThreadId),
                currentMessages: () =>
                    get().messages.filter(m => m.threadId === get().selectedThreadId),

                /* ----- actions ----- */
                setThreads: threads => set({ threads }),
                upsertThread: thread =>
                    set(state => {
                        const idx = state.threads.findIndex(t => t.id === thread.id);
                        return idx === -1
                            ? { threads: [...state.threads, thread] }
                            : {
                                threads: state.threads.map((t, i) =>
                                    i === idx ? { ...t, ...thread } : t,
                                ),
                            };
                    }),
                removeThread: id =>
                    set(state => ({
                        threads: state.threads.filter(t => t.id !== id),
                    })),

                setMessages: msgs => set({ messages: msgs }),
                upsertMessage: msg =>
                    set(state => {
                        const idx = state.messages.findIndex(m => m.id === msg.id);
                        return idx === -1
                            ? { messages: [...state.messages, msg] }
                            : {
                                messages: state.messages.map((m, i) =>
                                    i === idx ? { ...m, ...msg } : m,
                                ),
                            };
                    }),
                removeMessage: id =>
                    set(state => ({
                        messages: state.messages.filter(m => m.id !== id),
                    })),

                selectThread: id => set({ selectedThreadId: id }),
                setModel: model => {
                    const { providerIcon, ...rest } = model as any;
                    set({ model: { ...rest, providerIcon: null } as any });
                },
                setStatus: status => set({ status }),
                setError: error => set({ error }),
            })),
            {
                name: "chat-store",
                version: 2,
                migrate: (persistedState: any, version) => {
                    if (persistedState && persistedState.model && persistedState.model.providerIcon) {
                        persistedState.model.providerIcon = null;
                    }
                    return persistedState;
                },
            },
        ),
    ),
);