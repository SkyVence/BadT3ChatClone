import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { relations } from "drizzle-orm"
import { attachments } from "./attachment"

export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id),
    title: text("title"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => threads.id),
    status: text("status").default("streaming"),

    model: text("model"),
    provider: text("provider"),
    role: text("role"),
    content: text("content"),

    error: text("error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

export const messagesRelations = relations(messages, ({ one, many }) => ({
    thread: one(threads, {
        fields: [messages.threadId],
        references: [threads.id],
    }),
    attachments: many(attachments),
}))

export const threadsRelations = relations(threads, ({ many, one }) => ({
    user: one(user, {
        fields: [threads.userId],
        references: [user.id],
    }),
    messages: many(messages),
}))
