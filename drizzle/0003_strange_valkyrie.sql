CREATE TABLE "google_calendar_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"google_email" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"scope" text NOT NULL,
	"selected_calendar_ids" text DEFAULT '[]' NOT NULL,
	"sync_interval_minutes" integer DEFAULT 5 NOT NULL,
	"reconnect_required" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "google_calendar_event_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"calendar_id" text NOT NULL,
	"google_event_id" text NOT NULL,
	"etag" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"start" text NOT NULL,
	"end" text NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"google_updated_at" timestamp,
	"local_updated_at" timestamp,
	"pending_local_update" boolean DEFAULT false NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_event_cache" ADD CONSTRAINT "google_calendar_event_cache_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "google_calendar_event_user_calendar_event_idx" ON "google_calendar_event_cache" USING btree ("user_id","calendar_id","google_event_id");