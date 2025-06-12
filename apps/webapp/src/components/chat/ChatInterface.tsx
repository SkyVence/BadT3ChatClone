'use client';

import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Message {
    id: string;
    threadId: string;
    content: string | null;
    role: 'user' | 'assistant' | 'system';
    status: 'streaming' | 'complete' | 'error' | null;
    model: string;
    provider: 'anthropic' | 'openai' | 'google';
    createdAt: string | null;
    updatedAt: string | null;
    error: string | null;
}

interface Thread {
    id: string;
    title: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    userId: string;
    messages: Message[];
}

interface ChatInterfaceProps {
    thread?: Thread;
}

export function ChatInterface({ thread }: ChatInterfaceProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [thread?.messages]);

    const sortedMessages = thread?.messages ? [...thread.messages].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
    }) : [];

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold">
                            {thread?.title || 'New Conversation'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Testing AI streaming
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="max-w-4xl mx-auto space-y-6">
                    {sortedMessages.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">🤖</div>
                            <h3 className="text-lg font-medium mb-2">Ready to chat!</h3>
                            <p className="text-muted-foreground">
                                Start a conversation to test the streaming functionality.
                            </p>
                        </div>
                    ) : (
                        sortedMessages.map((message) => (
                            <div key={message.id} className="space-y-4">
                                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-sm font-medium">
                                                {message.role === 'user' ? 'You' : 'Assistant'}
                                            </div>
                                            {message.role === 'assistant' && (
                                                <div className="text-xs text-muted-foreground">
                                                    {message.model} • {message.provider}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`rounded-lg p-4 ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground ml-4'
                                            : 'bg-muted mr-4'
                                            }`}>
                                            {message.role === 'assistant' ? (
                                                <StreamingMessage
                                                    messageId={message.id}
                                                    initialContent={message.content || ''}
                                                    initialStatus={message.status || 'complete'}
                                                    error={message.error}
                                                />
                                            ) : (
                                                <div className="prose prose-sm max-w-none text-current">
                                                    {message.content}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

        </div>
    );
} 