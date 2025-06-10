import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { providerEnum, user } from "./auth"
import { relations } from "drizzle-orm"
import { attachments } from "./attachment"


export const streamStatus = pgEnum("stream_status", ["streaming", "complete", "error"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id).notNull(),
    title: text("title").default("New Thread"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
})

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => threads.id).notNull(),

    // Metadata
    status: streamStatus("status").default("streaming"),
    model: text("model").notNull(),
    role: messageRole("role").notNull(),
    provider: providerEnum("provider").notNull(),


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
