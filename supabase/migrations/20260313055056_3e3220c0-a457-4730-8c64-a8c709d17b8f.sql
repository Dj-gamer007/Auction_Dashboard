
-- Add current_bid and leading_team_id columns to auction_players
ALTER TABLE public.auction_players 
  ADD COLUMN IF NOT EXISTS current_bid numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS leading_team_id uuid DEFAULT NULL;

-- Allow public INSERT on auction_players (for Change 5: Add New Player)
CREATE POLICY "Auction players can be inserted by anyone"
  ON public.auction_players
  FOR INSERT
  TO public
  WITH CHECK (true);
