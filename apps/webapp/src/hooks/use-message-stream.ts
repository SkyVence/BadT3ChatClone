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
    const [hasReceivedInitialMessage, setHasReceivedInitialMessage] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debug: Track connection status changes
    useEffect(() => {
        console.log(`[useMessageStream] 🔌 Connection status changed for ${messageId}:`, isConnected);
    }, [isConnected, messageId]);

    // Stable cleanup function that doesn't change
    const cleanup = useCallback(() => {
        console.log(`[useMessageStream] 🧹 Cleanup called for ${messageId}`);
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
        console.log(`[useMessageStream] connect() called for ${messageId} with status: ${status}, hasReceivedInitial: ${hasReceivedInitialMessage}`);
        if (!messageId) {
            console.log(`[useMessageStream] connect() early return: no messageId`);
            return;
        }

        // Only skip connection for completed messages if we've already received the initial message from the server
        // This ensures we always try the initial connection to get the actual server status
        if (hasReceivedInitialMessage && (status === 'complete' || status === 'error')) {
            console.log(`[useMessageStream] ⏭️ Skipping connection for completed message ${messageId}: ${status}`);
            return;
        }

        // Prevent multiple simultaneous connections
        if (isConnectingRef.current || eventSourceRef.current) {
            console.log(`[useMessageStream] ⏸️ Connection already in progress for ${messageId}`);
            return;
        }

        console.log(`[useMessageStream] 🚀 Starting SSE connection for ${messageId}`);
        isConnectingRef.current = true;

        try {
            const eventSource = new EventSource(`/api/chat/stream/subscribe/${messageId}`);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log(`[useMessageStream] ✅ SSE onopen fired for ${messageId}`);
                setIsConnected(true);
                setRetryCount(0);
                isConnectingRef.current = false;
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }
            };

            eventSource.onmessage = (event) => {
                console.log(`[useMessageStream] 📨 Message received for ${messageId}, setting connected`);
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
                    console.log(`[useMessageStream] 💓 Heartbeat received for ${messageId}`);
                    return;
                }

                try {
                    const data: StreamMessage = JSON.parse(event.data);
                    console.log(`[useMessageStream] 📝 Data message received for ${messageId}:`, data.type, data);
                    onMessage?.(data);

                    switch (data.type) {
                        case 'initial':
                            setContent(data.fullContent || '');
                            setStatus(data.status as any || 'streaming');
                            setHasReceivedInitialMessage(true);
                            console.log(`[useMessageStream] 📋 Initial message received for ${messageId}, server status: ${data.status}`);
                            break;

                        case 'delta':
                            setContent(data.fullContent || '');
                            break;

                        case 'complete':
                            console.log(`[useMessageStream] 🏁 Stream complete for ${messageId}`);
                            setContent(data.fullContent || '');
                            setStatus('complete');
                            onComplete?.(data.fullContent || '');
                            cleanup();
                            break;

                        case 'error':
                            console.log(`[useMessageStream] 💥 Stream error for ${messageId}`);
                            setStatus('error');
                            setError(data.error || 'Unknown error');
                            onError?.(data.error || 'Unknown error');
                            cleanup();
                            break;
                    }
                } catch (err) {
                    console.error('[useMessageStream] Error parsing SSE message:', err);
                }
            };

            eventSource.onerror = (err) => {
                console.log(`[useMessageStream] ❌ SSE error for ${messageId}:`, err);
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

                // Retry logic: 
                // - Always retry if we haven't received the initial message yet (to get server status)
                // - Only retry if server says message is still streaming and we haven't exceeded max retries
                const maxRetries = 3;
                const shouldRetry = (!hasReceivedInitialMessage || status === 'streaming') && retryCount < maxRetries;

                if (shouldRetry) {
                    console.log(`[useMessageStream] 🔄 Scheduling retry ${retryCount + 1}/${maxRetries} for ${messageId} (hasInitial: ${hasReceivedInitialMessage}, status: ${status})`);
                    // Exponential backoff with jitter
                    const baseDelay = 2000;
                    const jitter = Math.random() * 1000;
                    const delay = Math.min(baseDelay * Math.pow(2, retryCount) + jitter, 15000);

                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        connect();
                    }, delay);
                } else if (retryCount >= maxRetries) {
                    console.log(`[useMessageStream] 🚫 Max retries reached for ${messageId}`);
                    setStatus('error');
                    setError('Failed to connect to stream after multiple attempts');
                }
            };

        } catch (error) {
            console.error('[useMessageStream] Failed to create EventSource for:', messageId, error);
            isConnectingRef.current = false;
            setStatus('error');
            setError('Failed to establish connection');
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
        }
    }, [messageId, status, retryCount, hasReceivedInitialMessage, onMessage, onComplete, onError, cleanup]); // Fixed dependencies

    // Single effect to manage connection
    useEffect(() => {
        console.log(`[useMessageStream] 🔄 Effect triggered for ${messageId}, status: ${status}`);
        // Reset flag when messageId changes (new message)
        setHasReceivedInitialMessage(false);

        if (status === 'streaming') {
            connect();
        } else {
            console.log(`[useMessageStream] Effect: Not connecting because status is '${status}' for ${messageId}`);
        }
        // Return cleanup only on unmount or messageId/status change
        return () => {
            console.log(`[useMessageStream] 🧽 Effect cleanup for ${messageId}`);
            cleanup();
        };
    }, [messageId, status]); // Depend on both messageId and status

    const reconnect = useCallback(() => {
        console.log(`🔄 Manual reconnect for ${messageId}`);
        cleanup();
        setRetryCount(0);
        setError(null);
        setHasReceivedInitialMessage(false); // Reset flag to allow reconnection
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
        hasReceivedInitialMessage, // For debugging
    };
}