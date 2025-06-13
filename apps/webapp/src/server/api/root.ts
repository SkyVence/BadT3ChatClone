import { router } from "@/server/api/trpc";
import { chatRouter } from "@/server/api/routers/chatRouter";
import { settingsRouter } from "@/server/api/routers/settingsRouter";
import { threadsRouter } from "@/server/api/routers/threadsRouter";
import { streamRouter } from "@/server/api/routers/streamRouter";
import { applyWSSHandler } from '@trpc/server/adapters/ws';

import { WebSocketServer } from "ws";
import { createWebSocketContext } from "../context";

export const appRouter = router({
    threads: threadsRouter,
    chat: chatRouter,
    settings: settingsRouter,
    stream: streamRouter
});
export type AppRouter = typeof appRouter;

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: createWebSocketContext,
    // Enable heartbeat messages to keep connection open (disabled by default)
    keepAlive: {
        enabled: true,
        // server ping message interval in milliseconds
        pingMs: 30000,
        // connection is terminated if pong message is not received in this many milliseconds
        pongWaitMs: 5000,
    },
});

wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once('close', () => {
        console.log(`➖➖ Connection (${wss.clients.size})`);
    });
});

console.log(`✅ WebSocket Server listening on ws://localhost:${PORT}`);
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
    wss.close();
});