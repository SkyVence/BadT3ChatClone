import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import type { CreateWSSContextFnOptions } from "@trpc/server/adapters/ws";
import type { IncomingHttpHeaders } from "http";

// Helper: convert Node.js `IncomingHttpHeaders` to Fetch API `Headers`
function toFetchHeaders(nodeHeaders?: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    if (!nodeHeaders) return headers;
    for (const [key, value] of Object.entries(nodeHeaders)) {
        if (typeof value === "string") headers.append(key, value);
        else if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    }
    return headers;
}

export async function createContext(req: NextRequest) {
    const session = await auth.api.getSession({
        headers: req.headers,
    });
    return {
        session,
        db,
        req,
    };
}

export async function createWebSocketContext(opts: CreateWSSContextFnOptions) {
    const session = await auth.api.getSession({
        headers: toFetchHeaders(opts.req?.headers),
    });
    return {
        session,
        db,
        // Cast Node's IncomingMessage to NextRequest to satisfy Context type used by HTTP routes
        req: opts.req as unknown as NextRequest,
    };
}

export type WebSocketContext = Awaited<ReturnType<typeof createWebSocketContext>>;
export type Context = Awaited<ReturnType<typeof createContext>>;
