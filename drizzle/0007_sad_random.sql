DROP INDEX "google_calendar_event_user_calendar_event_idx";--> statement-breakpoint
DROP INDEX "todos_user_calendar_event_idx";--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ADD COLUMN "google_account_id" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "google_calendar_account_id" text;--> statement-breakpoint
UPDATE "google_calendar_event_cache" AS e
SET "google_account_id" = c."google_account_id"
FROM "google_calendar_connections" AS c
WHERE e."google_calendar_connection_id" = c."id"
  AND e."user_id" = c."user_id"
  AND e."google_account_id" IS NULL;--> statement-breakpoint
UPDATE "todos" AS t
SET "google_calendar_account_id" = c."google_account_id"
FROM "google_calendar_connections" AS c
WHERE t."google_calendar_connection_id" = c."id"
  AND t."user_id" = c."user_id"
  AND t."google_calendar_account_id" IS NULL;--> statement-breakpoint
DELETE FROM "google_calendar_event_cache"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "user_id", "google_account_id", "calendar_id", "google_event_id"
        ORDER BY "local_updated_at" DESC NULLS LAST, "id"
      ) AS rn
    FROM "google_calendar_event_cache"
    WHERE "google_account_id" IS NOT NULL
  ) AS ranked
  WHERE ranked.rn > 1
);--> statement-breakpoint
DELETE FROM "todos"
WHERE "id" IN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      row_number() OVER (
        PARTITION BY "user_id", "google_calendar_account_id", "google_calendar_id", "google_event_id"
        ORDER BY "created_at", "id"
      ) AS rn
    FROM "todos"
    WHERE "google_calendar_account_id" IS NOT NULL
      AND "google_calendar_id" IS NOT NULL
      AND "google_event_id" IS NOT NULL
  ) AS ranked
  WHERE ranked.rn > 1
);--> statement-breakpoint
DELETE FROM "google_calendar_event_cache" WHERE "google_account_id" IS NULL;--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ALTER COLUMN "google_account_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "google_calendar_event_user_calendar_event_idx" ON "google_calendar_event_cache" USING btree ("user_id","google_account_id","calendar_id","google_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "todos_user_calendar_event_idx" ON "todos" USING btree ("user_id","google_calendar_account_id","google_calendar_id","google_event_id");
