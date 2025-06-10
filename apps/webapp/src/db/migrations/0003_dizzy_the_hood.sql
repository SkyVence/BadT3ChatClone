-- First, drop foreign key constraints that reference the columns we're about to change
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_message_id_messages_id_fk";--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_thread_id_threads_id_fk";--> statement-breakpoint

-- Convert text IDs to UUIDs using gen_random_uuid() for existing data
-- Note: This will generate new UUIDs for all existing records, breaking existing relationships
-- If you need to preserve data relationships, you'll need a more complex migration strategy

ALTER TABLE "threads" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

ALTER TABLE "messages" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "thread_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

ALTER TABLE "attachments" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "message_id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint

ALTER TABLE "user_keys" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint

-- Recreate foreign key constraints
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;