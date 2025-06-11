import { useEffect, useState, useCallback } from 'react';

interface StreamMessage {
    type: 'initial' | 'delta' | 'complete' | 'error';
    content?: string;
    fullContent?: string;
    status?: string;
    error?: string;
    messageId: string;
}

interface UseMessageStreamOptions {
    messageId: string;
    initialStatus?: 'streaming' | 'complete' | 'error';
    onMessage?: (message: StreamMessage) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: string) => void;
}

export function useMessageStream({
    messageId,
    initialStatus = 'streaming',
    onMessage,
    onComplete,
    onError,
}: UseMessageStreamOptions) {
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<'streaming' | 'complete' | 'error'>(initialStatus);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const connect = useCallback(() => {
        if (!messageId) {
            console.warn('useMessageStream: No messageId provided');
            return;
        }

        // Don't attempt SSE connection for already completed messages
        if (status === 'complete' || status === 'error') {
            console.log('useMessageStream: Message already complete/error, skipping SSE connection');
            return;
        }

        console.log('useMessageStream: Connecting to SSE for messageId:', messageId, 'retry:', retryCount);
        const eventSource = new EventSource(`/api/chat/stream/subscribe/${messageId}`);

        eventSource.onopen = () => {
            console.log('useMessageStream: SSE connection opened');
            setIsConnected(true);
            setRetryCount(0); // Reset retry count on successful connection
        };

        eventSource.onmessage = (event) => {
            console.log('useMessageStream: Received SSE message:', event.data);
            try {
                const data: StreamMessage = JSON.parse(event.data);

                onMessage?.(data);

                switch (data.type) {
                    case 'initial':
                        setContent(data.fullContent || '');
                        setStatus(data.status as any || 'streaming');
                        break;

                    case 'delta':
                        setContent(data.fullContent || '');
                        break;

                    case 'complete':
                        setContent(data.fullContent || '');
                        setStatus('complete');
                        onComplete?.(data.fullContent || '');
                        eventSource.close();
                        setIsConnected(false);
                        break;

                    case 'error':
                        setStatus('error');
                        setError(data.error || 'Unknown error');
                        onError?.(data.error || 'Unknown error');
                        eventSource.close();
                        setIsConnected(false);
                        break;
                }
            } catch (err) {
                console.error('useMessageStream: Error parsing SSE message:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('useMessageStream: SSE error:', err);
            console.error('useMessageStream: EventSource readyState:', eventSource.readyState);
            console.error('useMessageStream: EventSource url:', eventSource.url);

            setIsConnected(false);
            eventSource.close();

            // Implement retry logic with exponential backoff
            const maxRetries = 5;
            if (retryCount < maxRetries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
                console.log(`useMessageStream: Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

                setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                }, delay);
            } else {
                console.error('useMessageStream: Max retries reached, giving up');
                setStatus('error');
                setError('Failed to connect to stream after multiple attempts');
            }
        };

        return () => {
            console.log('useMessageStream: Cleaning up SSE connection');
            eventSource.close();
            setIsConnected(false);
        };
    }, [messageId, status, onMessage, onComplete, onError, retryCount]);

    useEffect(() => {
        const cleanup = connect();
        return cleanup;
    }, [connect]);

    const reconnect = useCallback(() => {
        console.log('useMessageStream: Manual reconnect triggered');
        setRetryCount(0); // Reset retry count on manual reconnect
        const cleanup = connect();
        return cleanup;
    }, [connect]);

    return {
        content,
        status,
        error,
        isConnected,
        reconnect,
        retryCount,
    };
}