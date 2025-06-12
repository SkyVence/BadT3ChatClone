import { useEffect, useState, useCallback, useRef } from 'react';

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

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debug: Track connection status changes
    useEffect(() => {
        console.log(`🔌 Connection status changed for ${messageId}:`, isConnected);
    }, [isConnected, messageId]);

    // Stable cleanup function that doesn't change
    const cleanup = useCallback(() => {
        console.log(`🧹 Cleanup called for ${messageId}`);
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
        }
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
        setIsConnected(false);
        isConnectingRef.current = false;
    }, [messageId]); // Only depend on messageId

    const connect = useCallback(() => {
        if (!messageId) {
            return;
        }

        // Don't attempt SSE connection for already completed messages
        if (status === 'complete' || status === 'error') {
            console.log(`⏭️ Skipping connection for completed message ${messageId}: ${status}`);
            return;
        }

        // Prevent multiple simultaneous connections
        if (isConnectingRef.current || eventSourceRef.current) {
            console.log(`⏸️ Connection already in progress for ${messageId}`);
            return;
        }

        console.log(`🚀 Starting SSE connection for ${messageId}`);
        isConnectingRef.current = true;

        try {
            const eventSource = new EventSource(`/api/chat/stream/subscribe/${messageId}`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log(`✅ SSE onopen fired for ${messageId}`);
                setIsConnected(true);
                setRetryCount(0);
                isConnectingRef.current = false;
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
            };

            eventSource.onmessage = (event) => {
                console.log(`📨 Message received for ${messageId}, setting connected`);
                // Always mark as connected when we receive any message
                setIsConnected(true);
                setRetryCount(0);
                isConnectingRef.current = false;
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }

                // Handle heartbeat messages (keep connection alive)
                if (event.data.trim() === '' || event.data.startsWith(':')) {
                    console.log(`💓 Heartbeat received for ${messageId}`);
                    return;
                }

                try {
                    const data: StreamMessage = JSON.parse(event.data);
                    console.log(`📝 Data message received for ${messageId}:`, data.type);
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
                            console.log(`🏁 Stream complete for ${messageId}`);
                            setContent(data.fullContent || '');
                            setStatus('complete');
                            onComplete?.(data.fullContent || '');
                            cleanup();
                            break;

                        case 'error':
                            console.log(`💥 Stream error for ${messageId}`);
                            setStatus('error');
                            setError(data.error || 'Unknown error');
                            onError?.(data.error || 'Unknown error');
                            cleanup();
                            break;
                    }
                } catch (err) {
                    console.error('Error parsing SSE message:', err);
                }
            };

            eventSource.onerror = (err) => {
                console.log(`❌ SSE error for ${messageId}:`, err);
                setIsConnected(false);
                isConnectingRef.current = false;

                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }

                // Close the current connection
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }

                // Only retry if the message is still streaming and we haven't exceeded max retries
                const maxRetries = 3;
                if (status === 'streaming' && retryCount < maxRetries) {
                    console.log(`🔄 Scheduling retry ${retryCount + 1}/${maxRetries} for ${messageId}`);
                    // Exponential backoff with jitter
                    const baseDelay = 2000;
                    const jitter = Math.random() * 1000;
                    const delay = Math.min(baseDelay * Math.pow(2, retryCount) + jitter, 15000);

                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        connect();
                    }, delay);
                } else if (retryCount >= maxRetries) {
                    console.log(`🚫 Max retries reached for ${messageId}`);
                    setStatus('error');
                    setError('Failed to connect to stream after multiple attempts');
                }
            };

        } catch (error) {
            console.error('Failed to create EventSource for:', messageId, error);
            isConnectingRef.current = false;
            setStatus('error');
            setError('Failed to establish connection');
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
        }
    }, [messageId, status, retryCount, onMessage, onComplete, onError, cleanup]); // Fixed dependencies

    // Single effect to manage connection
    useEffect(() => {
        console.log(`🔄 Effect triggered for ${messageId}, status: ${status}`);
        connect();

        // Return cleanup only on unmount or messageId change
        return () => {
            console.log(`🧽 Effect cleanup for ${messageId}`);
            cleanup();
        };
    }, [messageId]); // Only depend on messageId, not on connect or cleanup

    const reconnect = useCallback(() => {
        console.log(`🔄 Manual reconnect for ${messageId}`);
        cleanup();
        setRetryCount(0);
        setError(null);
        // Small delay before reconnecting to avoid immediate reconnection
        setTimeout(() => {
            connect();
        }, 500);
    }, [cleanup, connect, messageId]);

    return {
        content,
        status,
        error,
        isConnected,
        reconnect,
        retryCount,
    };
}