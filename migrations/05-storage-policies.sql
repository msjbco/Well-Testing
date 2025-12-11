-- Storage Policies for Photo Uploads
-- Run this AFTER creating the 'well-report-photos' bucket in Supabase Dashboard
-- Run in Supabase SQL Editor

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Technicians can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos for assigned jobs" ON storage.objects;
DROP POLICY IF EXISTS "Users can read photos for assigned jobs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for assigned jobs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos for assigned jobs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

-- Simple policy: Allow any authenticated user to upload to well-report-photos bucket
-- Access control is handled at the job level (users can only access jobs assigned to them)
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'well-report-photos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to read photos
CREATE POLICY "Authenticated users can read photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'well-report-photos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update photos
CREATE POLICY "Authenticated users can update photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'well-report-photos' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete photos
CREATE POLICY "Authenticated users can delete photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'well-report-photos' AND
  auth.uid() IS NOT NULL
);

-- Verify policies were created
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
