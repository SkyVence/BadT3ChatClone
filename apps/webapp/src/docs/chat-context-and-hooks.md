### 📚 Quick Guide – Using the new Chat stack

---

#### 1. Wrap your app

```tsx
import { BetterChatProvider } from "@/context/betterChatContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BetterChatProvider>{children}</BetterChatProvider>;
}
```

#### 2. Consume the context

```tsx
import { useBetterChat } from "@/context/betterChatContext";

export default function ChatWindow() {
  const {
    messages,
    threads,
    selectedThreadId,
    isLoadingThread,
    isSending,
    isStreaming,
    send,
    startNewThread,
    deleteThread,
    selectThread,
    startStream,
    stopStream,
    setModel,
  } = useBetterChat();

  /* …render UI / call the helpers as needed… */
}
```

---

### 🗂️ API reference

| Key                | Type                                                         | Description                               |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| `messages`         | `ThreadMessage[]`                                            | Full history for the selected thread      |
| `threads`          | `ThreadSummary[]`                                            | Lightweight list for sidebar              |
| `selectedThreadId` | `string \| null`                                             | `null` → no thread open                   |
| `model`            | `ModelInfo`                                                  | Currently-selected LLM                    |
| `status`           | `"idle" \| "loading" \| "sending" \| "streaming" \| "error"` | Global activity flag                      |
| `error`            | `string \| null`                                             | Last fatal error (cleared on next action) |
| `isLoadingThread`  | `boolean`                                                    | Convenience (`status === "loading"`)      |
| `isSending`        | `boolean`                                                    | Convenience (`status === "sending"`)      |
| `isStreaming`      | `boolean`                                                    | Convenience (`status === "streaming"`)    |

#### Actions

| Function               | Signature                                             | Typical Use                                            |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| `send`                 | `(content: string, opts?: { modelVersion?: string })` | Send user prompt & auto-start streaming                |
| `deleteThread`         | `(id: string)`                                        | Remove thread and its messages                         |
| `startNewThread`       | `()`                                                  | Reset to a blank conversation                          |
| `selectThread`         | `(id: string \| null)`                                | Switch sidebar selection                               |
| `refetchThreads`       | `()`                                                  | Manually reload sidebar list                           |
| `refetchThreadContext` | `()`                                                  | Refresh messages for current thread                    |
| `setModel`             | `(model: ModelInfo)`                                  | Change model for subsequent calls                      |
| `startStream`          | `(messageId: string)`                                 | Resume / start SSE for an existing message             |
| `stopStream`           | `()`                                                  | Force-stop live stream (e.g. "Stop generating" button) |

---

### 🔧 Customising behaviour

1. **Models** – extend `models` array in `@/models` to surface more LLM options; pass `modelVersion` in `send` to override per-message.
2. **Persisted store** – `chat-store` is persisted via `zustand/middleware/persist`; change the key or storage strategy in `statemanager.ts` if desired.
3. **Error toasts** – centralised in `useChatActions` / `useChatStream`; adapt `toastUtils` to match your design system.
4. **Streaming transport** – the underlying wire logic lives in `useMessageStream.ts`; swap it for a tRPC subscription or WebSocket as needed—`useChatStream` remains the bridge to the UI.
