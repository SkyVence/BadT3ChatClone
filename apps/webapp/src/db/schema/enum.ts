import { pgEnum } from "drizzle-orm/pg-core";

export const streamStatus = pgEnum("stream_status", ["streaming", "complete", "error"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);
export const providerEnum = pgEnum("provider", ["anthropic", "openai", "google"]);