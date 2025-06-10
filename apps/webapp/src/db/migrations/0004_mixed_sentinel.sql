ALTER TABLE "attachments" ALTER COLUMN "message_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user_keys" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_keys" ALTER COLUMN "hashed_key" SET NOT NULL;