import { NextRequest } from 'next/server';
import { subscriber } from '@/lib/redis';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { messages } from '@/db/schema/threads';
import { eq } from 'drizzle-orm';

// Store active connections per message per user to manage cleanup and prevent interference
const activeConnections = new Map<string, Map<string, Set<string>>>();

function generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getConnectionKey(messageId: string, userId: string): string {
    return `${messageId}:${userId}`;
}

export async function GET(
    req: NextRequest,
    { params }: { params: { messageId: string } }
) {
    try {
        // Authenticate user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session) {
            return new Response('Unauthorized', { status: 401 });
        }

        const { messageId } = await params;
        const userId = session.user.id;
        const connectionId = generateConnectionId();
        const connectionKey = getConnectionKey(messageId, userId);

        // Verify message exists and user has access
        const message = await db.query.messages.findFirst({
            where: eq(messages.id, messageId),
            with: {
                thread: true,
            },
        });

        if (!message) {
            return new Response('Message not found', { status: 404 });
        }

        if (message.thread.userId !== userId) {
            return new Response('Message not found', { status: 404 });
        }

        console.log('SSE: New connection for message', {
            messageId: message.id,
            connectionId,
            userId,
            connectionKey,
            status: message.status,
            contentLength: message.content?.length || 0,
            role: message.role,
            isResuming: !!message.content
        });

        // Track this connection per user
        if (!activeConnections.has(messageId)) {
            activeConnections.set(messageId, new Map());
        }
        const messageConnections = activeConnections.get(messageId)!;
        if (!messageConnections.has(userId)) {
            messageConnections.set(userId, new Set());
        }
        messageConnections.get(userId)!.add(connectionId);

        // Create SSE stream
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();
                let heartbeatInterval: NodeJS.Timeout | null = null;
                let isCleanedUp = false;
                const channel = `message:${messageId}`;
                let messageHandler: ((channel: string, data: string) => void) | null = null;
                let errorHandler: ((error: any) => void) | null = null;

                // Send keep-alive comments every 25 seconds (shorter than client timeout)
                const sendHeartbeat = () => {
                    if (isCleanedUp) return;
                    try {
                        const heartbeatData = `: heartbeat ${Date.now()} user:${userId} conn:${connectionId}\n\n`;
                        controller.enqueue(encoder.encode(heartbeatData));
                        console.log(`SSE: Heartbeat sent for ${connectionKey}:${connectionId}`);
                    } catch (error) {
                        console.log(`SSE: Error sending heartbeat for ${connectionKey}:${connectionId}`, error);
                        cleanup();
                    }
                };

                // Enhanced cleanup function with user isolation
                const cleanup = () => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;

                    console.log(`SSE: Cleaning up connection ${connectionId} for ${connectionKey}`);

                    // Clear heartbeat
                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }

                    // Remove connection from tracking
                    const messageConnections = activeConnections.get(messageId);
                    if (messageConnections) {
                        const userConnections = messageConnections.get(userId);
                        if (userConnections) {
                            userConnections.delete(connectionId);
                            if (userConnections.size === 0) {
                                messageConnections.delete(userId);
                                console.log(`SSE: No more connections for user ${userId} on message ${messageId}`);
                            }
                        }
                        if (messageConnections.size === 0) {
                            activeConnections.delete(messageId);
                            console.log(`SSE: No more connections for message ${messageId}, removing from tracking`);
                        }
                    }

                    // Remove event listeners
                    if (messageHandler) {
                        subscriber.off('message', messageHandler);
                        messageHandler = null;
                    }
                    if (errorHandler) {
                        subscriber.off('error', errorHandler);
                        errorHandler = null;
                    }

                    // Unsubscribe from Redis channel only if no more connections for this message
                    const remainingConnections = activeConnections.get(messageId);
                    if (!remainingConnections || remainingConnections.size === 0) {
                        subscriber.unsubscribe(channel).catch((error) => {
                            console.log(`SSE: Error unsubscribing from ${channel}:`, error);
                        });
                        console.log(`SSE: Unsubscribed from Redis channel: ${channel}`);
                    }
                };

                // Start heartbeat
                heartbeatInterval = setInterval(sendHeartbeat, 25000);

                // Always send initial message data - this enables resumption
                const data = JSON.stringify({
                    type: 'initial',
                    fullContent: message.content || '',
                    status: message.status,
                    messageId: message.id,
                    connectionId,
                    userId,
                    isResuming: !!message.content, // Flag to indicate if this is a resumption
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                console.log(`SSE: Initial data sent for ${connectionKey}:${connectionId} (resuming: ${!!message.content})`);

                // If message is already complete or error, send final status and close
                if (message.status === 'complete' || message.status === 'error') {
                    // Give a small delay to ensure initial message is processed
                    setTimeout(() => {
                        const finalData = JSON.stringify({
                            type: message.status,
                            fullContent: message.content,
                            error: message.error,
                            messageId: message.id,
                            connectionId,
                            userId,
                        });
                        controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                        console.log(`SSE: Final status sent for ${connectionKey}:${connectionId}, closing connection`);

                        cleanup();
                        controller.close();
                    }, 100);
                    return;
                }

                // Set up Redis message handler - filter messages to prevent interference
                messageHandler = (receivedChannel: string, data: string) => {
                    if (isCleanedUp) return;
                    if (receivedChannel === channel) {
                        try {
                            const parsedData = JSON.parse(data);
                            // Add connection and user info for debugging
                            parsedData.connectionId = connectionId;
                            parsedData.userId = userId;
                            
                            const messageData = JSON.stringify(parsedData);
                            controller.enqueue(encoder.encode(`data: ${messageData}\n\n`));
                            console.log(`SSE: Redis message forwarded for ${connectionKey}:${connectionId}, type: ${parsedData.type}`);

                            // Close stream if complete or error
                            if (parsedData.type === 'complete' || parsedData.type === 'error') {
                                console.log(`SSE: Stream completed for ${connectionKey}:${connectionId}`);
                                cleanup();
                                controller.close();
                            }
                        } catch (error) {
                            console.error(`SSE: Error parsing Redis message for ${connectionKey}:${connectionId}:`, error);
                        }
                    }
                };

                // Set up Redis error handler
                errorHandler = (error: any) => {
                    if (isCleanedUp) return;
                    console.error(`SSE: Redis subscriber error for ${connectionKey}:${connectionId}:`, error);
                    cleanup();
                    try {
                        controller.close();
                    } catch (closeError) {
                        console.log(`SSE: Error closing controller for ${connectionKey}:${connectionId}:`, closeError);
                    }
                };

                // Attach event listeners
                subscriber.on('message', messageHandler);
                subscriber.on('error', errorHandler);

                // Subscribe to the Redis channel
                subscriber.subscribe(channel).then(() => {
                    console.log(`SSE: Subscribed to Redis channel: ${channel} for connection ${connectionKey}:${connectionId}`);
                }).catch((error: any) => {
                    console.error(`SSE: Redis subscription error for ${connectionKey}:${connectionId}:`, error);
                    cleanup();
                    try {
                        controller.close();
                    } catch (closeError) {
                        console.log(`SSE: Error closing controller after subscription error:`, closeError);
                    }
                });

                // Handle client disconnect
                const handleDisconnect = () => {
                    console.log(`SSE: Client disconnected for ${connectionKey}:${connectionId}`);
                    cleanup();
                };

                // Listen for abort signal
                req.signal.addEventListener('abort', handleDisconnect);

                // Store cleanup function for later use
                (controller as any).cleanup = cleanup;
            },

            cancel() {
                console.log(`SSE: Stream cancelled for ${connectionKey}:${connectionId}`);
                // Cleanup when stream is cancelled
                if ((this as any).cleanup) {
                    (this as any).cleanup();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
                'X-Accel-Buffering': 'no', // Disable nginx buffering
                'X-Connection-Id': connectionId, // Add connection ID to headers for debugging
                'X-User-Id': userId, // Add user ID for debugging
            },
        });

    } catch (error) {
        console.error('SSE subscription error:', error);
        return new Response('Internal server error', { status: 500 });
    }
} 