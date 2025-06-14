"use client";
import { useBetterChat } from "@/context/betterChatContext";
import { useChatStore } from "@/lib/statemanager";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { MarkdownCodeBlock } from "@/components/markdown";
import remarkGfm from "remark-gfm";
import React from "react";
import { visit } from "unist-util-visit";

function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function remarkFixBoldedCode() {
    return (tree: any) => {
        visit(tree, "text", (node) => {
            const regex = /\*\*\`(.+?)\`\*\*/g;
            if (regex.test(node.value)) {
                node.value = node.value.replace(regex, "`$1`");
            }
        });
    };
}

export default function ChatPage({ params }: { params: Promise<{ threadId: string }> }) {
    const { threadId } = React.use(params);
    const {
        messages,
        isLoadingThread,
        isStreaming,
        selectThread,
        fetchThreadContext,
        resumeActiveStreams,
        status,
        error,
    } = useBetterChat();
    const setStatus = useChatStore(state => state.setStatus);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        selectThread(threadId);
        fetchThreadContext(threadId);
    }, [threadId, fetchThreadContext]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoadingThread, isStreaming]);

    useEffect(() => {
        // Auto-resume any streaming assistant messages after (re)load or on new messages
        if (messages.some(m => m.role === 'assistant' && m.status === 'streaming')) {
            resumeActiveStreams(messages);
        } else if (status === 'streaming') {
            // No streaming messages but status still streaming -> reset
            setStatus('idle');
        }
    }, [messages, status]);

    // Derive currently-streaming assistant message (if any)
    const streamingMessage = messages
        .filter(m => m.role === 'assistant' && m.status === 'streaming')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const displayContent = streamingMessage?.content ?? "";
    const displayStatus: 'streaming' | 'complete' | 'error' = streamingMessage?.status as any ?? 'complete';

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div
                ref={scrollRef}
                className="flex-1 flex flex-col gap-6 p-4 pb-32 max-w-4xl w-full mx-auto overflow-y-auto"
            >
                {isLoadingThread ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Loading messages...</div>
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
                                <div className="max-w-[100%] lg:max-w-[75%]">
                                    {/* Don't render the content if this message is currently streaming - let the streaming component handle it */}
                                    {msg.status === 'streaming' ? null : (
                                        <>
                                            <div className="text-foreground">
                                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-div:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                                        <ReactMarkdown
                                                            components={{
                                                                code: (props: any) => <MarkdownCodeBlock {...props}>{props.children}</MarkdownCodeBlock>,
                                                                p: "div"
                                                            }}
                                                            remarkPlugins={[remarkGfm, remarkFixBoldedCode]}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
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
                {streamingMessage && displayContent && (
                    <div className="flex justify-start">
                        <div className="max-w-[100%] lg:max-w-[75%]">
                            <div className="text-foreground">
                                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed min-h-[20px]">
                                        <ReactMarkdown
                                            components={{
                                                code: (props: any) => <MarkdownCodeBlock {...props}>{props.children}</MarkdownCodeBlock>,
                                                p: "div"
                                            }}
                                            remarkPlugins={[remarkGfm, remarkFixBoldedCode]}
                                        >
                                            {displayContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                            {/* Show timestamp if the message is completed */}
                            {displayStatus === 'complete' && (
                                <div className="text-xs text-muted-foreground text-left mt-2 px-1">
                                    {formatTime(streamingMessage?.createdAt ?? new Date().toISOString())}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Streaming status */}
                {status === "streaming" && (
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs">
                                {displayContent ? "Generating response..." : "Resuming stream…"}
                            </span>
                        </div>
                    </div>
                )}
                {status === 'sending' && (
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-xs">
                                Sending message...
                            </span>
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="text-sm font-medium text-destructive">
                                Error occurred
                            </div>
                            <div className="text-sm text-destructive/80 mt-1">
                                {error || 'An unknown error occurred while streaming the response.'}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resumeActiveStreams(messages)}
                                className="mt-2 h-7 px-3 text-xs"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                            </Button>
                        </div>
                    </div>
                )}
                {status === 'idle' && displayContent && (
                    <div className="mt-1">
                        <div className="text-xs text-muted-foreground">
                            ✓ Response complete
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
} 