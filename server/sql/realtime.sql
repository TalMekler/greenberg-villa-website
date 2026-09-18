-- Realtime "doorbell" tables for the browser (see README → Live updates).
--
-- The browser subscribes with the public (publishable) key, so everything it
-- may see is here, in version control. Neither table carries guest data:
--   booked_dates   the days approved stays occupy — already public on the calendar
--   inquiry_pulse  one row, bumped whenever anything in `inquiries` changes
--
-- This reproduces what is live in Supabase, with grants tightened to SELECT.
-- Idempotent: safe to re-run in the SQL editor. `ensureSchema()` re-applies the
-- REVOKEs on every boot, in case anything re-grants them.

-- ── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.booked_dates (
  day text PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS public.inquiry_pulse (
  id         integer PRIMARY KEY CHECK (id = 1),
  revision   bigint NOT NULL DEFAULT 0,
  changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.inquiry_pulse (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── Triggers that keep them current ─────────────────────────────────────────
-- SECURITY DEFINER so they can write the projections whoever touches
-- `inquiries`; search_path pinned so a caller cannot redirect `public.`.

CREATE OR REPLACE FUNCTION public.refresh_booked_dates()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.booked_dates;
  INSERT INTO public.booked_dates (day)
  SELECT DISTINCT to_char(d, 'YYYY-MM-DD')
    FROM public.inquiries i,
         -- Check-in through check-out inclusive, matching bookedDateKeys().
         generate_series(i."checkIn"::date, i."checkOut"::date, interval '1 day') AS d
   WHERE i.status = 'approved';
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_inquiry_pulse()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inquiry_pulse
     SET revision = revision + 1, changed_at = now()
   WHERE id = 1;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS inquiries_refresh_booked_dates ON public.inquiries;
CREATE TRIGGER inquiries_refresh_booked_dates
  AFTER INSERT OR DELETE OR UPDATE ON public.inquiries
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_booked_dates();

DROP TRIGGER IF EXISTS inquiries_bump_pulse ON public.inquiries;
CREATE TRIGGER inquiries_bump_pulse
  AFTER INSERT OR DELETE OR UPDATE ON public.inquiries
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_inquiry_pulse();

-- ── Who may read them ───────────────────────────────────────────────────────

ALTER TABLE public.booked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booked_dates_readable ON public.booked_dates;
CREATE POLICY booked_dates_readable ON public.booked_dates
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS inquiry_pulse_readable ON public.inquiry_pulse;
CREATE POLICY inquiry_pulse_readable ON public.inquiry_pulse
  FOR SELECT TO anon, authenticated USING (true);

-- Also live: SELECT policies on the already-public photo records and map pin.
DROP POLICY IF EXISTS site_images_readable ON public.site_images;
CREATE POLICY site_images_readable ON public.site_images
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS location_readable ON public.location;
CREATE POLICY location_readable ON public.location
  FOR SELECT TO anon, authenticated USING (true);

-- Read, and nothing else. Supabase's default privileges grant new tables
-- everything, TRUNCATE included — and TRUNCATE is not subject to RLS.
REVOKE ALL ON public.booked_dates, public.inquiry_pulse FROM anon, authenticated;
GRANT SELECT ON public.booked_dates, public.inquiry_pulse TO anon, authenticated;

-- Trigger functions are never meant to be called over /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.refresh_booked_dates(), public.bump_inquiry_pulse()
  FROM PUBLIC, anon, authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['booked_dates', 'inquiry_pulse', 'site_images', 'location'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
