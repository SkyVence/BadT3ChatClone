'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTRPC } from '@/utils/trpc';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ThreadSidebar } from '@/components/chat/ThreadSidebar';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';

export default function ChatPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const threadId = searchParams.get('threadId');
    const queryClient = useQueryClient();
    const trpc = useTRPC();

    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(threadId);

    const threadsQuery = useQuery(trpc.chat.getThreads.queryOptions());
    const currentThreadQuery = useQuery(trpc.chat.getThread.queryOptions(
        { threadId: selectedThreadId! },
        { enabled: !!selectedThreadId }
    ));

    const sendMessageMutation = useMutation(trpc.chat.sendMessageAndStartStream.mutationOptions({
        onSuccess: (data: any) => {
            if (!selectedThreadId) {
                setSelectedThreadId(data.threadId);
                router.push(`/chat?threadId=${data.threadId}`);
            }
            queryClient.invalidateQueries({ queryKey: trpc.chat.getThread.queryKey({ threadId: selectedThreadId! }) });
            queryClient.invalidateQueries({ queryKey: trpc.chat.getThreads.queryKey() });
        },
        onError: (error: any) => {
            toast.error('Failed to send message: ' + error.message);
        },
    }));

    useEffect(() => {
        if (threadId && threadId !== selectedThreadId) {
            setSelectedThreadId(threadId);
        }
    }, [threadId, selectedThreadId]);

    const handleNewChat = () => {
        setSelectedThreadId(null);
        router.push('/chat');
    };

    const handleSelectThread = (threadId: string) => {
        setSelectedThreadId(threadId);
        router.push(`/chat?threadId=${threadId}`);
    };

    const handleSendMessage = async (prompt: string, model: string, provider: 'anthropic' | 'openai' | 'google') => {
        try {
            await sendMessageMutation.mutateAsync({
                threadId: selectedThreadId || undefined,
                prompt,
                model,
                provider,
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className="w-80 bg-muted/30 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                    <Button
                        onClick={handleNewChat}
                        className="w-full justify-start gap-2"
                        variant="outline"
                    >
                        <MessageSquarePlus className="h-4 w-4" />
                        New Chat
                    </Button>
                </div>

                <ThreadSidebar
                    threads={threadsQuery.data || []}
                    selectedThreadId={selectedThreadId}
                    onSelectThread={handleSelectThread}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: trpc.chat.getThreads.queryKey() })}
                />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {selectedThreadId ? (
                    <ChatInterface
                        thread={currentThreadQuery.data}
                        onSendMessage={handleSendMessage}
                        isLoading={sendMessageMutation.isPending}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="text-6xl">💬</div>
                            <h2 className="text-2xl font-semibold">Start a new conversation</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Select a model and start chatting to test the streaming functionality.
                                You can also select an existing thread from the sidebar.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 