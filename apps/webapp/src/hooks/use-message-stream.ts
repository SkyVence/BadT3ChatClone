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

    // Debug: Track connection status changes
    useEffect(() => {
        console.log(`[useMessageStream] 🔌 Connection status changed for ${messageId}:`, isConnected);
    }, [isConnected, messageId]);

    // Enhanced cleanup function that handles all timers and connections
    const cleanup = useCallback(() => {
        console.log(`[useMessageStream] 🧹 Cleanup called for ${messageId}`);
        
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        
        // Clear all timeouts
        [retryTimeoutRef, connectionTimeoutRef, heartbeatTimeoutRef].forEach(ref => {
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
                console.log(`[useMessageStream] 👁️ Page visible, attempting reconnect for ${messageId}`);
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
        console.log(`[useMessageStream] connect() called for ${messageId} with status: ${status}, hasReceivedInitial: ${hasReceivedInitialMessage}`);
        
        if (!messageId) {
            console.log(`[useMessageStream] connect() early return: no messageId`);
            return;
        }

        // Skip connection for completed messages if we've already received the initial message
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
            // Add timestamp to prevent caching issues
            const url = `/api/chat/stream/subscribe/${messageId}?t=${Date.now()}`;
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            // Set connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (isConnectingRef.current && !isConnected) {
                    console.log(`[useMessageStream] ⏰ Connection timeout for ${messageId}`);
                    eventSource.close();
                    isConnectingRef.current = false;
                    setIsConnected(false);
                }
            }, 10000); // 10 second timeout

            eventSource.onopen = () => {
                console.log(`[useMessageStream] ✅ SSE onopen fired for ${messageId}`);
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
                        console.log(`[useMessageStream] � Heartbeat timeout, checking connection for ${messageId}`);
                        // Check if connection is actually still alive
                        if (eventSource.readyState !== EventSource.OPEN) {
                            setIsConnected(false);
                        }
                    }
                }, 45000); // 45 seconds (longer than server heartbeat)
            };

            eventSource.onmessage = (event) => {
                console.log(`[useMessageStream] 📨 Message received for ${messageId}`);
                
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
                        console.log(`[useMessageStream] 💓 Heartbeat timeout after message for ${messageId}`);
                        setIsConnected(false);
                    }
                }, 45000);

                // Handle heartbeat messages (keep connection alive)
                if (event.data.trim() === '' || event.data.startsWith(':')) {
                    console.log(`[useMessageStream] 💓 Heartbeat received for ${messageId}`);
                    return;
                }

                try {
                    const data: StreamMessage = JSON.parse(event.data);
                    console.log(`[useMessageStream] 📝 Data message received for ${messageId}:`, data.type);
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
                    console.log(`[useMessageStream] 🔄 Scheduling retry ${retryCount + 1}/${maxRetries} for ${messageId}`);
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
    }, [messageId, status, retryCount, hasReceivedInitialMessage, onMessage, onComplete, onError, cleanup, isConnected, lastReconnectTime]);

    // Effect to manage connection and visibility changes
    useEffect(() => {
        console.log(`[useMessageStream] 🔄 Effect triggered for ${messageId}, status: ${status}`);
        
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
            console.log(`[useMessageStream] 🧽 Effect cleanup for ${messageId}`);
            cleanup();
        };
    }, [messageId, status]); // Minimal dependencies

    const reconnect = useCallback(() => {
        console.log(`🔄 Manual reconnect for ${messageId}`);
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