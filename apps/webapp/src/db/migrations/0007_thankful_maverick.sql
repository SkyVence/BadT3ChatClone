ALTER TABLE "messages" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "threads" ALTER COLUMN "updated_at" SET NOT NULL;