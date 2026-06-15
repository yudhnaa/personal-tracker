ALTER TABLE "todos" ADD COLUMN "source" text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "sync_status" text DEFAULT 'local_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "start_at" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "end_at" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "all_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "location" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_calendar_id" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_event_link" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_event_payload" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "todos_user_calendar_event_idx" ON "todos" USING btree ("user_id","google_calendar_id","google_event_id");--> statement-breakpoint
UPDATE "todos" SET "start_at" = "due_date", "end_at" = "due_date", "all_day" = true WHERE "due_date" != '';