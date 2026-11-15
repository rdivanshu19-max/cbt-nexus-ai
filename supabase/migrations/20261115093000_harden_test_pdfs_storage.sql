-- Harden the private "test-pdfs" bucket.
--
-- The original policies (20260415062640) allowed ANY authenticated user to read
-- every object in the bucket:
--
--   CREATE POLICY "Authenticated users can view PDFs" ON storage.objects
--     FOR SELECT TO authenticated USING (bucket_id = 'test-pdfs');
--
-- That exposes every student's uploaded question paper and, more seriously, the
-- admin answer keys stored under admin/answer-keys/. Students can then open the
-- key for a live official test.
--
-- Uploads are equally open, so a user can write into another user's folder or
-- into the admin/ folder.
--
-- The application never reads this bucket from the browser: both readers go
-- through the process-pdf-test Edge Function, which uses the service-role key.
-- So scoping SELECT to the owner's folder breaks nothing in the app.
--
-- This migration must be reviewed and applied deliberately (it changes
-- production RLS); it is not executed by the daily audit.

DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload PDFs" ON storage.objects;

-- Owners read only their own folder; admins read everything.
CREATE POLICY "Users read own PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'test-pdfs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Owners upload only into their own folder; admins may upload anywhere (admin/...).
CREATE POLICY "Users upload PDFs to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'test-pdfs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
