import { NextRequest } from 'next/server';
import { subscriber } from '@/lib/redis';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { messages } from '@/db/schema/threads';
import { eq } from 'drizzle-orm';

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

        console.log('SSE: Message found', {
            messageId: message.id,
            status: message.status,
            contentLength: message.content?.length || 0,
            role: message.role
        });

        // Create SSE stream
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();
                let heartbeatInterval: NodeJS.Timeout | null = null;
                let redisSubscriber: any = null;
                let isCleanedUp = false;
                const channel = `message:${messageId}`;

                // Send keep-alive comments every 30 seconds
                const sendHeartbeat = () => {
                    if (isCleanedUp) return;
                    try {
                        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                    } catch (error) {
                        // Connection closed, trigger cleanup
                        cleanup();
                    }
                };

                // Cleanup function
                const cleanup = () => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;

                    if (heartbeatInterval) {
                        clearInterval(heartbeatInterval);
                        heartbeatInterval = null;
                    }

                    if (redisSubscriber) {
                        try {
                            const unsubscribeResult = redisSubscriber.unsubscribe(channel);
                            if (unsubscribeResult && typeof unsubscribeResult.catch === 'function') {
                                unsubscribeResult.catch(() => { });
                            }
                        } catch (error) {
                            // Ignore cleanup errors
                        }

                        try {
                            const disconnectResult = redisSubscriber.disconnect();
                            if (disconnectResult && typeof disconnectResult.catch === 'function') {
                                disconnectResult.catch(() => { });
                            }
                        } catch (error) {
                            // Ignore cleanup errors
                        }

                        redisSubscriber = null;
                    }
                };

                // Start heartbeat
                heartbeatInterval = setInterval(sendHeartbeat, 30000);

                // Send initial message if it exists
                if (message.content) {
                    const data = JSON.stringify({
                        type: 'initial',
                        fullContent: message.content,
                        status: message.status,
                        messageId: message.id,
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                }

                // If message is already complete or error, send final status and close
                if (message.status === 'complete' || message.status === 'error') {
                    const data = JSON.stringify({
                        type: message.status,
                        fullContent: message.content,
                        error: message.error,
                        messageId: message.id,
                    });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));

                    cleanup();
                    controller.close();
                    return;
                }

                // Use the main subscriber instead of duplicating to avoid connection issues
                // Subscribe directly to the channel
                const handleRedisMessage = (receivedChannel: string, data: string) => {
                    if (isCleanedUp) return;
                    if (receivedChannel === channel) {
                        try {
                            const parsedData = JSON.parse(data);
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

                            // Close stream if complete or error
                            if (parsedData.type === 'complete' || parsedData.type === 'error') {
                                cleanup();
                                controller.close();
                            }
                        } catch (error) {
                            console.error('Error parsing Redis message:', error);
                        }
                    }
                };

                const handleRedisError = (error: any) => {
                    if (isCleanedUp) return;
                    console.error('Redis subscriber error:', error);
                    cleanup();
                    try {
                        controller.close();
                    } catch { }
                };

                // Subscribe using the main subscriber
                subscriber.on('message', handleRedisMessage);
                subscriber.on('error', handleRedisError);

                subscriber.subscribe(channel).catch((error: any) => {
                    console.error('Redis subscription error:', error);
                    cleanup();
                    try {
                        controller.close();
                    } catch { }
                });

                console.log('SSE: Subscribed to Redis channel:', channel);

                // Enhanced cleanup for event listeners
                const enhancedCleanup = () => {
                    cleanup();
                    // Remove event listeners from main subscriber
                    subscriber.off('message', handleRedisMessage);
                    subscriber.off('error', handleRedisError);
                    // Unsubscribe from the specific channel
                    subscriber.unsubscribe(channel).catch(() => { });
                };

                // Cleanup on stream close or request abort
                req.signal.addEventListener('abort', enhancedCleanup);

                // Store cleanup function for later use
                (controller as any).cleanup = enhancedCleanup;
            },

            cancel() {
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
            },
        });

    } catch (error) {
        console.error('SSE subscription error:', error);
        return new Response('Internal server error', { status: 500 });
    }
} 