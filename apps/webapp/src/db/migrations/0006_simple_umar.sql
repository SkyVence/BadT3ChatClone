CREATE TYPE "public"."provider" AS ENUM('anthropic', 'openai', 'google');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."stream_status" AS ENUM('streaming', 'complete', 'error');--> statement-breakpoint
ALTER TABLE "user_keys" ALTER COLUMN "provider" SET DATA TYPE provider USING provider::provider;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "thread_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DATA TYPE stream_status USING status::stream_status;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "status" SET DEFAULT 'streaming'::stream_status;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "model" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "provider" SET DATA TYPE provider USING provider::provider;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET DATA TYPE message_role USING role::message_role;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "title" SET DEFAULT 'New Thread';