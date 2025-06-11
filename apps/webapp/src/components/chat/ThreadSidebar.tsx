'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Thread {
    id: string;
    title: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    userId: string;
    messages: Array<{
        id: string;
        content: string | null;
        role: 'user' | 'assistant' | 'system';
        createdAt: string | null;
    }>;
}

interface ThreadSidebarProps {
    threads: Thread[];
    selectedThreadId: string | null;
    onSelectThread: (threadId: string) => void;
    onRefresh: () => void;
}

export function ThreadSidebar({
    threads,
    selectedThreadId,
    onSelectThread,
    onRefresh
}: ThreadSidebarProps) {
    const getLastMessage = (thread: Thread) => {
        if (thread.messages.length === 0) return null;
        return thread.messages[0]; // Messages are ordered by createdAt desc
    };

    const getMessagePreview = (content: string | null) => {
        if (!content) return 'No messages yet';
        return content.length > 60 ? content.slice(0, 60) + '...' : content;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Recent Chats</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRefresh}
                        className="h-8 w-8 p-0"
                    >
                        <RefreshCw className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {threads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No chats yet</p>
                        </div>
                    ) : (
                        threads.map((thread) => {
                            const lastMessage = getLastMessage(thread);
                            const isSelected = selectedThreadId === thread.id;

                            return (
                                <Button
                                    key={thread.id}
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start p-3 h-auto text-left flex-col items-start gap-1",
                                        isSelected && "bg-accent"
                                    )}
                                    onClick={() => onSelectThread(thread.id)}
                                >
                                    <div className="w-full">
                                        <div className="font-medium text-sm truncate">
                                            {thread.title || 'Untitled Chat'}
                                        </div>

                                        {lastMessage && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {getMessagePreview(lastMessage.content)}
                                            </div>
                                        )}

                                        {thread.updatedAt && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}
                                            </div>
                                        )}
                                    </div>
                                </Button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
} 