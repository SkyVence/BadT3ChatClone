import { db } from "@/db";
import { threads } from "@/db/schema";
import { protectedProcedure, router } from "@/lib/trpc";
import { eq } from "drizzle-orm";

export const threadsRoute = router({
    getThreads: protectedProcedure.query(async ({ ctx }) => {
        const getThreads = await db.select().from(threads).where(eq(threads.userId, ctx.session.user.id));
        return getThreads;
    })
})