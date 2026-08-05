ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "confirmed_renewal_date" text;--> statement-breakpoint
ALTER TABLE "subscription_payment_confirmations" ADD COLUMN IF NOT EXISTS "id" text;--> statement-breakpoint
WITH numbered AS (
  SELECT ctid, row_number() OVER (ORDER BY "created_at", "idempotency_key") AS rn
  FROM "subscription_payment_confirmations"
  WHERE "id" IS NULL
)
UPDATE "subscription_payment_confirmations" AS confirmations
SET "id" = 'legacy-' || numbered.rn
FROM numbered
WHERE confirmations.ctid = numbered.ctid;--> statement-breakpoint
DO $$
DECLARE
  pk_name text;
  pk_columns text;
BEGIN
  SELECT
    constraint_info.conname,
    string_agg(attribute_info.attname, ',' ORDER BY key_info.ordinality)
  INTO pk_name, pk_columns
  FROM pg_constraint AS constraint_info
  JOIN unnest(constraint_info.conkey) WITH ORDINALITY AS key_info(attnum, ordinality)
    ON true
  JOIN pg_attribute AS attribute_info
    ON attribute_info.attrelid = constraint_info.conrelid
   AND attribute_info.attnum = key_info.attnum
  WHERE constraint_info.conrelid = 'subscription_payment_confirmations'::regclass
    AND constraint_info.contype = 'p'
  GROUP BY constraint_info.conname;

  IF pk_name IS NOT NULL AND pk_columns <> 'id' THEN
    EXECUTE format(
      'ALTER TABLE "subscription_payment_confirmations" DROP CONSTRAINT %I',
      pk_name
    );
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "subscription_payment_confirmations" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'subscription_payment_confirmations'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE "subscription_payment_confirmations"
      ADD CONSTRAINT "subscription_payment_confirmations_pkey" PRIMARY KEY ("id");
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_payment_confirmations_user_subscription_idx"
ON "subscription_payment_confirmations" USING btree ("user_id","subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payment_confirmations_idempotency_idx"
ON "subscription_payment_confirmations" USING btree ("user_id","subscription_id","idempotency_key");
