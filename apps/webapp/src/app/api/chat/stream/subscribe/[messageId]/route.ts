import { NextRequest } from 'next/server';
import { subscriber } from '@/lib/redis';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { messages } from '@/db/schema/threads';
import { eq } from 'drizzle-orm';

// Store active connections per message to manage cleanup
const activeConnections = new Map<string, Set<string>>();

function generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
        const connectionId = generateConnectionId();

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

        if (message.thread.userId !== session.user.id) {
            return new Response('Message not found', { status: 404 });
        }

        console.log('SSE: New connection for message', {
            messageId: message.id,
            connectionId,
            status: message.status,
            contentLength: message.content?.length || 0,
            role: message.role,
            userId: session.user.id
        });

        // Track this connection
        if (!activeConnections.has(messageId)) {
            activeConnections.set(messageId, new Set());
        }
        activeConnections.get(messageId)!.add(connectionId);

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
                        const heartbeatData = `: heartbeat ${Date.now()}\n\n`;
                        controller.enqueue(encoder.encode(heartbeatData));
                        console.log(`SSE: Heartbeat sent for ${messageId}:${connectionId}`);
                    } catch (error) {
                        console.log(`SSE: Error sending heartbeat for ${messageId}:${connectionId}`, error);
                        cleanup();
                    }
                };

                // Enhanced cleanup function
                const cleanup = () => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;

                    console.log(`SSE: Cleaning up connection ${connectionId} for message ${messageId}`);

                    // Clear heartbeat
                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }

                    // Remove connection from tracking
                    const connections = activeConnections.get(messageId);
                    if (connections) {
                        connections.delete(connectionId);
                        if (connections.size === 0) {
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

                    // Unsubscribe from Redis channel if no more connections
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

                // Send initial message data if it exists
                if (message.content) {
                    const data = JSON.stringify({
                        type: 'initial',
                        fullContent: message.content,
                        status: message.status,
                        messageId: message.id,
                        connectionId, // Add connection ID for debugging
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    console.log(`SSE: Initial data sent for ${messageId}:${connectionId}`);
                }

                // If message is already complete or error, send final status and close
                if (message.status === 'complete' || message.status === 'error') {
                    const data = JSON.stringify({
                        type: message.status,
                        fullContent: message.content,
                        error: message.error,
                        messageId: message.id,
                        connectionId,
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    console.log(`SSE: Final status sent for ${messageId}:${connectionId}, closing connection`);

                    cleanup();
                    controller.close();
                    return;
                }

                // Set up Redis message handler
                messageHandler = (receivedChannel: string, data: string) => {
                    if (isCleanedUp) return;
                    if (receivedChannel === channel) {
                        try {
                            const parsedData = JSON.parse(data);
                            // Add connection ID for debugging
                            parsedData.connectionId = connectionId;
                            const messageData = JSON.stringify(parsedData);
                            controller.enqueue(encoder.encode(`data: ${messageData}\n\n`));
                            console.log(`SSE: Redis message forwarded for ${messageId}:${connectionId}, type: ${parsedData.type}`);

                            // Close stream if complete or error
                            if (parsedData.type === 'complete' || parsedData.type === 'error') {
                                console.log(`SSE: Stream completed for ${messageId}:${connectionId}`);
                                cleanup();
                                controller.close();
                            }
                        } catch (error) {
                            console.error(`SSE: Error parsing Redis message for ${messageId}:${connectionId}:`, error);
                        }
                    }
                };

                // Set up Redis error handler
                errorHandler = (error: any) => {
                    if (isCleanedUp) return;
                    console.error(`SSE: Redis subscriber error for ${messageId}:${connectionId}:`, error);
                    cleanup();
                    try {
                        controller.close();
                    } catch (closeError) {
                        console.log(`SSE: Error closing controller for ${messageId}:${connectionId}:`, closeError);
                    }
                };

                // Attach event listeners
                subscriber.on('message', messageHandler);
                subscriber.on('error', errorHandler);

                // Subscribe to the Redis channel
                subscriber.subscribe(channel).then(() => {
                    console.log(`SSE: Subscribed to Redis channel: ${channel} for connection ${connectionId}`);
                }).catch((error: any) => {
                    console.error(`SSE: Redis subscription error for ${messageId}:${connectionId}:`, error);
                    cleanup();
                    try {
                        controller.close();
                    } catch (closeError) {
                        console.log(`SSE: Error closing controller after subscription error:`, closeError);
                    }
                });

                // Handle client disconnect
                const handleDisconnect = () => {
                    console.log(`SSE: Client disconnected for ${messageId}:${connectionId}`);
                    cleanup();
                };

                // Listen for abort signal
                req.signal.addEventListener('abort', handleDisconnect);

                // Store cleanup function for later use
                (controller as any).cleanup = cleanup;
            },

            cancel() {
                console.log(`SSE: Stream cancelled for ${messageId}:${connectionId}`);
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
            },
        });

    } catch (error) {
        console.error('SSE subscription error:', error);
        return new Response('Internal server error', { status: 500 });
    }
} 