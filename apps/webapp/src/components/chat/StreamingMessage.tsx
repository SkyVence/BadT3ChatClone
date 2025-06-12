'use client';

import { useMessageStream } from '@/hooks/use-message-stream';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingMessageProps {
    messageId: string;
    initialContent?: string;
    initialStatus?: 'streaming' | 'complete' | 'error';
    error?: string | null;
}

export function StreamingMessage({
    messageId,
    initialContent = '',
    initialStatus = 'streaming',
    error: initialError
}: StreamingMessageProps) {
    const {
        content,
        status,
        error,
        isConnected,
        reconnect,
        retryCount
    } = useMessageStream({
        messageId,
        initialStatus,
        onComplete: (fullContent) => {
            console.log('Stream completed:', fullContent);
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
    });

    const displayContent = content || initialContent;
    const displayStatus = status || initialStatus;
    const displayError = error || initialError;

    // Debug: Log connection status changes
    console.log('StreamingMessage render:', {
        messageId,
        isConnected,
        status: displayStatus,
        hasContent: !!displayContent,
        contentLength: displayContent?.length || 0
    });

    return (
        <div className="w-full">
            {/* Message Content */}
            {displayContent && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap break-words">
                        {displayContent}
                    </div>
                </div>
            )}

            {/* Streaming Indicator */}
            {displayStatus === 'streaming' && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="animate-pulse flex space-x-1">
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span>AI is responding...</span>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            isConnected ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="text-xs">
                            {isConnected ? 'Connected' : retryCount > 0 ? `Retrying... (${retryCount})` : 'Disconnected'}
                        </span>
                        {/* Debug info */}
                        <span className="text-xs text-blue-500">
                            (Debug: {isConnected ? 'T' : 'F'})
                        </span>
                    </div>

                    {/* Reconnect Button */}
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

            {/* Error State */}
            {displayStatus === 'error' && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
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

            {/* Complete State */}
            {displayStatus === 'complete' && displayContent && (
                <div className="mt-2">
                    <div className="text-xs text-muted-foreground">
                        ✓ Response complete
                    </div>
                </div>
            )}
        </div>
    );
} 