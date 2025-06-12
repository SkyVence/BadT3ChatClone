'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/trpc/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StreamingMessage } from '@/components/chat/StreamingMessage';
import { models } from '@/models';

export default function ChatTestPage() {
    const [prompt, setPrompt] = useState('');
    const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const sendMessageMutation = api.chat.sendMessageAndStartStream.useMutation({
        onSuccess: (data: any) => {
            console.log('Message sent successfully:', data);
            setCurrentMessageId(data.messageId);
            setPrompt('');
        },
        onError: (error: any) => {
            console.error('Error sending message:', error);
        },
    });

    const handleSendMessage = () => {
        if (!prompt.trim()) return;

        const selectedModel = models[8]; // Use first model for testing

        sendMessageMutation.mutate({
            prompt,
            model: selectedModel.version,
            provider: selectedModel.provider as 'anthropic' | 'openai' | 'google',
        });
    };

    return (
        <div className="container mx-auto max-w-4xl p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>AI Streaming Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter your test message..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!prompt.trim() || sendMessageMutation.isPending}
                        >
                            {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
                        </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        Model: {models[8]?.name} ({models[8]?.provider})
                    </div>
                </CardContent>
            </Card>

            {currentMessageId && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Response (Streaming)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <StreamingMessage
                            messageId={currentMessageId}
                            initialContent=""
                            initialStatus="streaming"
                        />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Debug Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm">
                        <div>Current Message ID: {currentMessageId || 'None'}</div>
                        <div>Mutation Status: {sendMessageMutation.status}</div>
                        <div>Is Pending: {sendMessageMutation.isPending ? 'Yes' : 'No'}</div>
                        {sendMessageMutation.error && (
                            <div className="text-red-500">
                                Error: {String(sendMessageMutation.error)}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 