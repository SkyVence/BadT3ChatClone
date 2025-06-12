import { db } from "@/db";
import { messages, threads } from "@/db/schema";
import { protectedProcedure, router } from "@/server/api/trpc";
import { count, desc, eq } from "drizzle-orm";
import z from "zod";

export const threadsRouter = router({
    getThreads: protectedProcedure.input(z.object({
        limit: z.number().min(1).default(15),
        offset: z.number().min(0).default(0),
    })).query(async ({ ctx, input }) => {
        const [totalResult, queryData] = await Promise.all([
            db.select({ value: count() }).from(threads).where(eq(threads.userId, ctx.session.user.id)),

            await db.query.threads.findMany({
                where: eq(threads.userId, ctx.session.user.id),
                orderBy: [desc(threads.updatedAt)],
                with: {
                    messages: {
                        orderBy: [desc(messages.createdAt)],
                        limit: 3
                    },
                },
                limit: input.limit,
                offset: input.offset,
            })
        ]);

        const total = totalResult[0].value ?? 0;
        const totalPages = Math.ceil(total / input.limit);

        return {
            data: queryData,
            meta: {
                total,
                totalPages,
                page: input.offset,
                limit: input.limit,
            },
        };
    }),
})