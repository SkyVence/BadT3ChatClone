import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { user } from "./auth"
import { attachments } from "./attachment"
import { streamStatus, messageRole, providerEnum } from "./enum"

export const threads = pgTable("threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id).notNull(),
    title: text("title").default("New Thread").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id").references(() => threads.id).notNull(),

    // Metadata
    status: streamStatus("status").default("streaming").notNull(),
    model: text("model").notNull(),
    role: messageRole("role").notNull(),
    provider: providerEnum("provider").notNull(),


    content: text("content"),
    error: text("error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
