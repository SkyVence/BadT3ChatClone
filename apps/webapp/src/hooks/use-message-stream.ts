import { toastUtils } from '@/lib/toast';
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
    const [lastReconnectTime, setLastReconnectTime] = useState<number>(0);

    const eventSourceRef = useRef<EventSource | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const visibilityChangeHandlerRef = useRef<(() => void) | null>(null);
    const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Debug: Track connection status changes
    useEffect(() => {
    }, [isConnected, messageId]);

    // Enhanced cleanup function that handles all timers and connections
    const cleanup = useCallback(() => {

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        // Clear all timeouts
        [retryTimeoutRef, connectionTimeoutRef, heartbeatTimeoutRef, completionTimeoutRef].forEach(ref => {
            if (ref.current) {
                clearTimeout(ref.current);
                ref.current = null;
            }
        });

        // Remove visibility change handler
        if (visibilityChangeHandlerRef.current) {
            document.removeEventListener('visibilitychange', visibilityChangeHandlerRef.current);
            visibilityChangeHandlerRef.current = null;
        }

        setIsConnected(false);
        isConnectingRef.current = false;
    }, [messageId]);

    // Handle page visibility changes to reconnect when user comes back
    const handleVisibilityChange = useCallback(() => {
        if (document.visibilityState === 'visible' && !isConnected && status === 'streaming') {
            const timeSinceLastReconnect = Date.now() - lastReconnectTime;
            // Only reconnect if it's been at least 2 seconds since last attempt
            if (timeSinceLastReconnect > 2000) {
                setLastReconnectTime(Date.now());
                setTimeout(() => {
                    if (status === 'streaming' && !isConnected) {
                        connect();
                    }
                }, 500);
            }
        }
    }, [isConnected, status, messageId, lastReconnectTime]);

    const connect = useCallback(() => {

        if (!messageId) {
            return;
        }

        // Skip connection for completed messages if we've already received the initial message
        if (hasReceivedInitialMessage && (status === 'complete' || status === 'error')) {
            return;
        }

        // Prevent multiple simultaneous connections
        if (isConnectingRef.current || eventSourceRef.current) {
            return;
        }
        isConnectingRef.current = true;

        try {
            // Add timestamp and random parameter to prevent caching issues
            const url = `/api/chat/stream/subscribe/${messageId}?t=${Date.now()}&r=${Math.random()}`;
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            // Set connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (isConnectingRef.current && !isConnected) {
                    eventSource.close();
                    isConnectingRef.current = false;
                    setIsConnected(false);
                }
            }, 10000); // 10 second timeout

            eventSource.onopen = () => {
                setIsConnected(true);
                setRetryCount(0);
                isConnectingRef.current = false;
                setLastReconnectTime(Date.now());

                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }

                // Reset heartbeat timeout on successful connection
                if (heartbeatTimeoutRef.current) {
                    clearTimeout(heartbeatTimeoutRef.current);
                }
                heartbeatTimeoutRef.current = setTimeout(() => {
                    if (isConnected) {
                        // Check if connection is actually still alive
                        if (eventSource.readyState !== EventSource.OPEN) {
                            setIsConnected(false);
                        }
                    }
                }, 45000); // 45 seconds (longer than server heartbeat)
            };

            eventSource.onmessage = (event) => {

                // Mark as connected and reset retry count
                setIsConnected(true);
                setRetryCount(0);
                isConnectingRef.current = false;

                // Clear connection timeout
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }

                // Reset heartbeat timeout
                if (heartbeatTimeoutRef.current) {
                    clearTimeout(heartbeatTimeoutRef.current);
                }
                heartbeatTimeoutRef.current = setTimeout(() => {
                    if (isConnected) {
                        setIsConnected(false);
                    }
                }, 45000);

                // Handle heartbeat messages (keep connection alive)
                if (event.data.trim() === '' || event.data.startsWith(':')) {
                    return;
                }

                try {
                    const data: StreamMessage = JSON.parse(event.data);
                    onMessage?.(data);

                    switch (data.type) {
                        case 'initial':
                            setContent(data.fullContent || '');
                            setStatus(data.status as any || 'streaming');
                            setHasReceivedInitialMessage(true);
                            break;

                        case 'delta':
                            setContent(data.fullContent || '');
                            break;

                        case 'complete':
                            setContent(data.fullContent || '');
                            setStatus('complete');

                            // Call completion callback after a small delay to ensure state is set
                            completionTimeoutRef.current = setTimeout(() => {
                                onComplete?.(data.fullContent || '');
                            }, 100);

                            cleanup();
                            break;

                        case 'error':
                            setStatus('error');
                            setError(data.error || 'Unknown error');

                            // Call error callback after a small delay to ensure state is set
                            completionTimeoutRef.current = setTimeout(() => {
                                onError?.(data.error || 'Unknown error');
                            }, 100);

                            cleanup();
                            break;
                    }
                } catch (err: any) {
                    toastUtils.error("Error parsing SSE message:", err.message);
                }
            };

            eventSource.onerror = (err) => {
                setIsConnected(false);
                isConnectingRef.current = false;

                // Clear timeouts
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                    connectionTimeoutRef.current = null;
                }

                // Close the current connection
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }

                // Enhanced retry logic with exponential backoff
                const maxRetries = 5; // Increased max retries
                const shouldRetry = (!hasReceivedInitialMessage || status === 'streaming') && retryCount < maxRetries;

                if (shouldRetry) {
                    // Exponential backoff with jitter and increased base delay
                    const baseDelay = 3000; // Increased base delay
                    const jitter = Math.random() * 2000;
                    const delay = Math.min(baseDelay * Math.pow(1.5, retryCount) + jitter, 30000);

                    retryTimeoutRef.current = setTimeout(() => {
                        setRetryCount(prev => prev + 1);
                        setLastReconnectTime(Date.now());
                        connect();
                    }, delay);
                } else if (retryCount >= maxRetries) {
                    setStatus('error');
                    setError('Failed to connect to stream after multiple attempts');
                }
            };

        } catch (error) {
            isConnectingRef.current = false;
            setStatus('error');
            setError('Failed to establish connection');

            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
        }
    }, [messageId, status, retryCount, hasReceivedInitialMessage, onMessage, onComplete, onError, cleanup, isConnected, lastReconnectTime]);

    // Effect to manage connection and visibility changes
    useEffect(() => {

        // Reset state when messageId changes
        if (messageId) {
            setHasReceivedInitialMessage(false);
            setRetryCount(0);
            setError(null);
        }

        // Set up visibility change handler
        visibilityChangeHandlerRef.current = handleVisibilityChange;
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (status === 'streaming' && messageId) {
            connect();
        }

        // Cleanup on unmount or messageId/status change
        return () => {
            cleanup();
        };
    }, [messageId, status]); // Minimal dependencies

    const reconnect = useCallback(() => {
        cleanup();
        setRetryCount(0);
        setError(null);
        setHasReceivedInitialMessage(false);
        setLastReconnectTime(Date.now());

        // Small delay before reconnecting
        setTimeout(() => {
            if (status === 'streaming') {
                connect();
            }
        }, 1000);
    }, [cleanup, connect, messageId, status]);

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