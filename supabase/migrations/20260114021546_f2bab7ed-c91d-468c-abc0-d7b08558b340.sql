-- Create storage bucket for task submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own submission files
CREATE POLICY "Users can upload submission files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own submission files
CREATE POLICY "Users can update own submission files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own submission files
CREATE POLICY "Users can delete own submission files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access for submission files
CREATE POLICY "Public read access for submissions"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'submissions');

-- Add file_url column to submissions table if not exists
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS file_url TEXT;