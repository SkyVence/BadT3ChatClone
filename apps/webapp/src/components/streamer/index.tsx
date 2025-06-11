'use client';

import { useMessageStream } from '@/hooks/use-message-stream';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface StreamingMessageProps {
    messageId: string;
    initialContent?: string;
    initialStatus?: 'streaming' | 'complete' | 'error';
}

export function StreamingMessage({
    messageId,
    initialContent = '',
    initialStatus = 'streaming'
}: StreamingMessageProps) {
    const {
        content,
        status,
        error,
        isConnected,
        reconnect
    } = useMessageStream({
        messageId,
        onComplete: (fullContent) => {
            console.log('Stream completed:', fullContent);
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
    });

    const displayContent = content || initialContent;
    const displayStatus = status || initialStatus;

    return (
        <div className="message-container">
            <div className="message-content">
                {displayContent && (
                    <div className="prose prose-sm max-w-none">
                        {displayContent}
                    </div>
                )}

                {displayStatus === 'streaming' && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <div className="animate-pulse">●</div>
                        <span>AI is thinking...</span>
                        {!isConnected && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={reconnect}
                                className="ml-2"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reconnect
                            </Button>
                        )}
                    </div>
                )}

                {displayStatus === 'error' && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                        <span>Error: {error}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={reconnect}
                            className="ml-2"
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}