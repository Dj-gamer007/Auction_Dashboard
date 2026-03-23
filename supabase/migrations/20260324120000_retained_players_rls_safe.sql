DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'retained_players' 
    AND policyname = 'Retained players can be inserted by anyone'
  ) THEN
    CREATE POLICY "Retained players can be inserted by anyone" ON public.retained_players FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'retained_players' 
    AND policyname = 'Retained players can be deleted by anyone'
  ) THEN
    CREATE POLICY "Retained players can be deleted by anyone" ON public.retained_players FOR DELETE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'retained_players' 
    AND policyname = 'Retained players can be updated by anyone'
  ) THEN
    CREATE POLICY "Retained players can be updated by anyone" ON public.retained_players FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auction_players' AND column_name = 'timer_started_at'
  ) THEN
    ALTER TABLE public.auction_players ADD COLUMN timer_started_at timestamptz;
  END IF;
END $$;
