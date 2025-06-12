"use client";
import { useChat } from "@/components/chat/ChatContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMessageStream } from "@/hooks/use-message-stream";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPage({ children }: { children?: React.ReactNode }) {
    const { currentMessageId, setThreadId, messages, isMessagesLoading } = useChat();
    const searchParams = useSearchParams();
    const threadId = searchParams.get("threadId");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setThreadId(threadId);
    }, [threadId, setThreadId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isMessagesLoading, currentMessageId]);

    // Streaming logic
    const stream = useMessageStream({
        messageId: currentMessageId || "",
        initialStatus: "streaming",
        onComplete: () => { },
        onError: () => { },
    });
    const displayContent = stream.content;
    const displayStatus = stream.status;
    const displayError = stream.error;
    const isConnected = stream.isConnected;
    const reconnect = stream.reconnect;
    const retryCount = stream.retryCount;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div
                ref={scrollRef}
                className="flex-1 flex flex-col gap-4 p-4 pb-32 max-w-4xl w-full mx-auto overflow-y-auto"
            >
                {isMessagesLoading ? (
                    <div className="text-muted-foreground">Loading messages...</div>
                ) : messages.length === 0 ? (
                    <div className="text-muted-foreground">No messages yet. Start the conversation!</div>
                ) : (
                    messages.slice().reverse().map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-muted/50 text-foreground rounded-bl-md border border-border'}
                            `}>
                                <div className="whitespace-pre-wrap break-words text-base">{msg.content}</div>
                                <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100 text-right' : 'text-muted-foreground text-left'}`}>{formatTime(msg.createdAt)}</div>
                            </div>
                        </div>
                    ))
                )}
                {/* Streaming bubble */}
                {currentMessageId && (
                    <div className="flex justify-start">
                        <div className="max-w-[70%] rounded-2xl px-4 py-2 shadow-sm bg-muted/50 text-foreground rounded-bl-md border border-border">
                            <div className="whitespace-pre-wrap break-words text-base min-h-[24px]">
                                {displayContent}
                            </div>
                        </div>
                    </div>
                )}
                {/* Streaming status below bubble */}
                {currentMessageId && (
                    <div className="pl-2">
                        {displayStatus === 'streaming' && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="animate-pulse flex space-x-1">
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span>AI is responding...</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                    <span className="text-xs">
                                        {isConnected ? 'Connected' : retryCount > 0 ? `Retrying... (${retryCount})` : 'Disconnected'}
                                    </span>
                                    <span className="text-xs text-blue-500">
                                        (Debug: {isConnected ? 'T' : 'F'})
                                    </span>
                                </div>
                                {!isConnected && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={reconnect}
                                        className="h-6 px-2 text-xs"
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Reconnect
                                    </Button>
                                )}
                            </div>
                        )}
                        {displayStatus === 'error' && (
                            <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-destructive">
                                        Error occurred
                                    </div>
                                    <div className="text-sm text-destructive/80 mt-1">
                                        {displayError || 'An unknown error occurred while streaming the response.'}
                                    </div>
                                    {retryCount > 0 && (
                                        <div className="text-xs text-destructive/60 mt-1">
                                            Attempted {retryCount} reconnection{retryCount !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={reconnect}
                                        className="mt-2 h-7 px-3 text-xs"
                                    >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Retry
                                    </Button>
                                </div>
                            </div>
                        )}
                        {displayStatus === 'complete' && displayContent && (
                            <div className="mt-2">
                                <div className="text-xs text-muted-foreground">
                                    ✓ Response complete
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Input area (children) pinned to bottom */}
            {children}
        </div>
    );
}