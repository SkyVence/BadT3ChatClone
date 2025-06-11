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
        console.log('SSE subscription request for messageId:', (await params).messageId);

        // Authenticate user
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        if (!session) {
            console.log('SSE auth failed - no session');
            return new Response('Unauthorized', { status: 401 });
        }

        console.log('SSE auth successful for user:', session.user.id);

        const { messageId } = await params;

        // Verify message exists and user has access
        console.log('SSE looking for message:', messageId);
        const message = await db.query.messages.findFirst({
            where: eq(messages.id, messageId),
            with: {
                thread: true,
            },
        });

        if (!message) {
            console.log('SSE message not found:', messageId);
            return new Response('Message not found', { status: 404 });
        }

        if (message.thread.userId !== session.user.id) {
            console.log('SSE unauthorized access - user mismatch');
            return new Response('Message not found', { status: 404 });
        }

        console.log('SSE message found:', message.id, 'status:', message.status);

        // Create SSE stream
        const stream = new ReadableStream({
            start(controller) {
                const encoder = new TextEncoder();

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

                // If message is already complete or error, close the stream
                if (message.status === 'complete' || message.status === 'error') {
                    controller.close();
                    return;
                }

                // Subscribe to Redis channel
                const redisSubscriber = subscriber.duplicate();
                const channel = `message:${messageId}`;

                redisSubscriber.subscribe(channel);

                redisSubscriber.on('message', (receivedChannel, data) => {
                    if (receivedChannel === channel) {
                        try {
                            const parsedData = JSON.parse(data);
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

                            // Close stream if complete or error
                            if (parsedData.type === 'complete' || parsedData.type === 'error') {
                                redisSubscriber.unsubscribe(channel);
                                redisSubscriber.disconnect();
                                controller.close();
                            }
                        } catch (error) {
                            console.error('Error parsing Redis message:', error);
                        }
                    }
                });

                redisSubscriber.on('error', (error) => {
                    console.error('Redis subscriber error:', error);
                    redisSubscriber.unsubscribe(channel);
                    redisSubscriber.disconnect();
                    controller.close();
                });

                // Cleanup on stream close
                req.signal.addEventListener('abort', () => {
                    redisSubscriber.unsubscribe(channel);
                    redisSubscriber.disconnect();
                    controller.close();
                });
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Cache-Control',
            },
        });

    } catch (error) {
        console.error('SSE subscription error:', error);
        return new Response('Internal server error', { status: 500 });
    }
} 