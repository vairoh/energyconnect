ALTER TABLE "posts" ADD COLUMN "type" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "structured_data" json;