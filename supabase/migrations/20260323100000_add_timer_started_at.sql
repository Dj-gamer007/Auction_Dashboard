-- Server-side timer sync: stores when the bid timer started
-- All clients calculate remaining time = 10s - (now - timer_started_at)
ALTER TABLE public.auction_players ADD COLUMN IF NOT EXISTS timer_started_at timestamptz;
