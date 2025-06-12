import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";

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


export type Context = Awaited<ReturnType<typeof createContext>>;
