CREATE POLICY "Retained players can be inserted by anyone" ON public.retained_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Retained players can be deleted by anyone" ON public.retained_players FOR DELETE USING (true);
CREATE POLICY "Retained players can be updated by anyone" ON public.retained_players FOR UPDATE USING (true);
