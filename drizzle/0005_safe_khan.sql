ALTER TABLE "dashboard_settings" ADD COLUMN "layout" jsonb;--> statement-breakpoint
ALTER TABLE "dashboard_settings" ADD COLUMN "hidden_cards" text DEFAULT '[]' NOT NULL;