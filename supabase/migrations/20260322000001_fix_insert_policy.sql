-- Add missing INSERT policy for auction_players
CREATE POLICY "Auction players can be inserted by anyone"
  ON public.auction_players
  FOR INSERT
  WITH CHECK (true);

-- Also add DELETE policy so players can be removed if needed
CREATE POLICY "Auction players can be deleted by anyone"
  ON public.auction_players
  FOR DELETE
  USING (true);
