-- Add owner_name column to teams (safe, idempotent)
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS owner_name text;

-- Add timer_started_at column to auction_players (safe, idempotent)
ALTER TABLE public.auction_players ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;

-- Fix retained_players RLS — add missing INSERT / DELETE / UPDATE policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retained_players'
    AND policyname = 'Retained players can be inserted by anyone'
  ) THEN
    CREATE POLICY "Retained players can be inserted by anyone"
      ON public.retained_players FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retained_players'
    AND policyname = 'Retained players can be deleted by anyone'
  ) THEN
    CREATE POLICY "Retained players can be deleted by anyone"
      ON public.retained_players FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'retained_players'
    AND policyname = 'Retained players can be updated by anyone'
  ) THEN
    CREATE POLICY "Retained players can be updated by anyone"
      ON public.retained_players FOR UPDATE USING (true);
  END IF;
END $$;
