"use client";
import { useStreamer } from "@/context/chat";
import { useParams } from "next/navigation";
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
    const { messageId, setThreadId, messages, isMessagesLoading, clearMessageId } = useStreamer();
    const params = useParams();
    const threadId = params.threadId as string;
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setThreadId(threadId);
    }, [threadId, setThreadId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isMessagesLoading, messageId]);

    // Get the current streaming message details for initial content
    const currentStreamingMessage = messageId ? messages.find(msg => msg.id === messageId) : null;
    const initialStreamingContent = currentStreamingMessage?.content || '';
    const initialStreamingStatus = currentStreamingMessage?.status as 'streaming' | 'complete' | 'error' || 'streaming';

    // Streaming logic with proper completion handling and resumption
    const stream = useMessageStream({
        messageId: messageId || "",
        initialStatus: initialStreamingStatus,
        onComplete: (fullContent) => {
            console.log('Stream completed, clearing messageId');
            clearMessageId(); // Clear messageId when stream completes
        },
        onError: (error) => {
            console.log('Stream error, clearing messageId');
            clearMessageId(); // Clear messageId on error
        },
    });

    // Use the stream content if available, otherwise fall back to the message content
    const displayContent = stream.content || initialStreamingContent;
    const displayStatus = stream.status || initialStreamingStatus;
    const displayError = stream.error;
    const isConnected = stream.isConnected;
    const reconnect = stream.reconnect;
    const retryCount = stream.retryCount;

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div
                ref={scrollRef}
                className="flex-1 flex flex-col gap-6 p-4 pb-32 max-w-4xl w-full mx-auto overflow-y-auto"
            >
                {isMessagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Loading messages...</div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground mb-2">Start a conversation</h3>
                            <p className="text-muted-foreground">Ask me anything to get started!</p>
                        </div>
                    </div>
                ) : (
                    // Display messages in chronological order (oldest to newest)
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'user' ? (
                                // User message with bubble
                                <div className="max-w-[80%] lg:max-w-[70%]">
                                    <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                            {msg.content}
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right mt-1 px-1">
                                        {formatTime(msg.createdAt)}
                                    </div>
                                </div>
                            ) : (
                                // Assistant message without bubble
                                <div className="max-w-[85%] lg:max-w-[75%]">
                                    {/* Don't render the content if this message is currently streaming - let the streaming component handle it */}
                                    {msg.id === messageId ? null : (
                                        <>
                                            <div className="text-foreground">
                                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground text-left mt-2 px-1">
                                                {formatTime(msg.createdAt)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}

                {/* Streaming message bubble - appears after the last message or replaces the streaming message */}
                {messageId && displayContent && (
                    <div className="flex justify-start">
                        <div className="max-w-[85%] lg:max-w-[75%]">
                            <div className="text-foreground">
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed min-h-[20px]">
                                        {displayContent}
                                    </div>
                                </div>
                            </div>
                            {/* Show timestamp if the message is completed */}
                            {displayStatus === 'complete' && currentStreamingMessage && (
                                <div className="text-xs text-muted-foreground text-left mt-2 px-1">
                                    {formatTime(currentStreamingMessage.createdAt)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Streaming status */}
                {messageId && (
                    <div className="pl-2">
                        {displayStatus === 'streaming' && (
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <div className="flex space-x-1">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <span className="text-xs">
                                        {stream.content ? 'Thinking...' : 'Resuming stream...'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                    <span className="text-xs">
                                        {isConnected ? 'Connected' : retryCount > 0 ? `Retrying... (${retryCount})` : 'Connecting...'}
                                    </span>
                                </div>
                                {!isConnected && retryCount > 0 && (
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
                            <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
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
                            <div className="mt-1">
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