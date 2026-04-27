-- Allow multiple subscription rows per user.
-- This is required so buying a new paid plan does not overwrite old purchases.

DO $$
DECLARE
    unique_name text;
BEGIN
    SELECT c.conname
    INTO unique_name
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'user_subscriptions'
      AND c.contype = 'u'
      AND c.conkey = ARRAY[
        (
          SELECT a.attnum
          FROM pg_attribute a
          WHERE a.attrelid = t.oid
            AND a.attname = 'user_id'
            AND a.attnum > 0
            AND NOT a.attisdropped
          LIMIT 1
        )
      ];

    IF unique_name IS NOT NULL THEN
        EXECUTE format(
          'ALTER TABLE public.user_subscriptions DROP CONSTRAINT %I',
          unique_name
        );
    END IF;
END $$;
