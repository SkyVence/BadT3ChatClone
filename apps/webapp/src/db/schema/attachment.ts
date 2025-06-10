import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { messages } from "./threads"
import { relations } from "drizzle-orm"
import { user } from "./auth"

export const attachments = pgTable("attachments", {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    url: text("url"),
    key: text("key"),
    type: text("type"),
    size: integer("size"),
    createdAt: timestamp("created_at").defaultNow(),
})

export const attachmentRelations = relations(attachments, ({ one }) => ({
    message: one(messages, {
        fields: [attachments.messageId],
        references: [messages.id],
    }),
    user: one(user, {
        fields: [attachments.userId],
        references: [user.id],
    }),
}))