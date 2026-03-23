INSERT INTO storage.buckets (id, name, public) VALUES ('player-images', 'player-images', true);

CREATE POLICY "Anyone can upload player images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-images');

CREATE POLICY "Anyone can view player images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-images');

CREATE POLICY "Anyone can delete player images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'player-images');