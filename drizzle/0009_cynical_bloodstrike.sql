CREATE TABLE "subscription_payment_confirmations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"billing_cycle" text NOT NULL,
	"next_renewal_date" text NOT NULL,
	"last_payment_date" text,
	"confirmed_renewal_date" text,
	"created_at" bigint NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_payment_confirmations" ADD CONSTRAINT "subscription_payment_confirmations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_payment_confirmations" ADD CONSTRAINT "subscription_payment_confirmations_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_payment_confirmations_user_subscription_idx" ON "subscription_payment_confirmations" USING btree ("user_id","subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_payment_confirmations_idempotency_idx" ON "subscription_payment_confirmations" USING btree ("user_id","subscription_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "subscriptions_user_next_renewal_idx" ON "subscriptions" USING btree ("user_id","next_renewal_date");