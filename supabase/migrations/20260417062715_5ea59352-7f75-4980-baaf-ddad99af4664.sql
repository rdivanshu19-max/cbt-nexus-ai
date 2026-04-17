
ALTER TABLE public.test_questions
  ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Question images are publicly readable" ON storage.objects;
CREATE POLICY "Question images are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Authenticated can upload question images" ON storage.objects;
CREATE POLICY "Authenticated can upload question images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Authenticated can update question images" ON storage.objects;
CREATE POLICY "Authenticated can update question images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Authenticated can delete question images" ON storage.objects;
CREATE POLICY "Authenticated can delete question images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'question-images');
