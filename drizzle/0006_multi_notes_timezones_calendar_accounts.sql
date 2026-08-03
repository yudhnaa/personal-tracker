ALTER TABLE "user" ADD COLUMN "time_zone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint

ALTER TABLE "notes" DROP CONSTRAINT "notes_pkey";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "title" text DEFAULT 'Note' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "created_at" bigint;--> statement-breakpoint
UPDATE "notes"
SET
  "id" = 'note_' || substr(md5("user_id"), 1, 16),
  "created_at" = floor(extract(epoch from coalesce("updated_at", now())) * 1000)::bigint
WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_pkey" PRIMARY KEY("id");--> statement-breakpoint

ALTER TABLE "google_calendar_connections" DROP CONSTRAINT "google_calendar_connections_pkey";--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD COLUMN "google_account_id" text;--> statement-breakpoint
UPDATE "google_calendar_connections"
SET
  "id" = 'gcal_' || substr(md5("user_id" || ':' || "google_email"), 1, 16),
  "google_account_id" = "google_email"
WHERE "id" IS NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ALTER COLUMN "google_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_pkey" PRIMARY KEY("id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_calendar_connections_user_account_idx" ON "google_calendar_connections" USING btree ("user_id","google_account_id");--> statement-breakpoint

DROP INDEX IF EXISTS "todos_user_calendar_event_idx";--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_calendar_connection_id" text;--> statement-breakpoint
UPDATE "todos" AS t
SET "google_calendar_connection_id" = c."id"
FROM "google_calendar_connections" AS c
WHERE t."user_id" = c."user_id"
  AND t."google_calendar_id" IS NOT NULL
  AND t."google_calendar_connection_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "todos_user_calendar_event_idx" ON "todos" USING btree ("user_id","google_calendar_connection_id","google_calendar_id","google_event_id");--> statement-breakpoint

DROP INDEX IF EXISTS "google_calendar_event_user_calendar_event_idx";--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ADD COLUMN "google_calendar_connection_id" text;--> statement-breakpoint
UPDATE "google_calendar_event_cache" AS e
SET "google_calendar_connection_id" = c."id"
FROM "google_calendar_connections" AS c
WHERE e."user_id" = c."user_id"
  AND e."google_calendar_connection_id" IS NULL;--> statement-breakpoint
DELETE FROM "google_calendar_event_cache" WHERE "google_calendar_connection_id" IS NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ALTER COLUMN "google_calendar_connection_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ADD CONSTRAINT "google_calendar_event_cache_google_calendar_connection_id_google_calendar_connections_id_fk" FOREIGN KEY ("google_calendar_connection_id") REFERENCES "public"."google_calendar_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "google_calendar_event_user_calendar_event_idx" ON "google_calendar_event_cache" USING btree ("user_id","google_calendar_connection_id","calendar_id","google_event_id");
