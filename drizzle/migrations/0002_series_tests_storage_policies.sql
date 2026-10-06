CREATE POLICY "Admins upload series files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'series-tests' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update series files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'series-tests' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete series files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'series-tests' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read series files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'series-tests' AND public.has_role(auth.uid(), 'admin'));