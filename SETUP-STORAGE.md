# 📦 Setting Up Supabase Storage for Photos

The field tech app needs a Supabase Storage bucket to upload photos. Here's how to set it up:

## Step 1: Create Storage Bucket

1. Go to your Supabase dashboard
2. Click **Storage** in the left sidebar
3. Click **"New bucket"** or **"Create bucket"**
4. Fill in:
   - **Name**: `well-report-photos`
   - **Public bucket**: ✅ Check this (or set to private if you prefer)
   - **File size limit**: 10MB (or your preferred limit)
   - **Allowed MIME types**: Leave empty for all, or specify: `image/*,application/pdf`
5. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

After creating the bucket, run this SQL in your Supabase SQL Editor:

```sql
-- Allow technicians to upload photos
CREATE POLICY "Technicians can upload photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'well-report-photos' AND
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
  );

-- Allow technicians to read photos
CREATE POLICY "Technicians can read photos"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'well-report-photos' AND
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
  );

-- Allow technicians to update their own photos
CREATE POLICY "Technicians can update photos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'well-report-photos' AND
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
  );

-- Allow technicians to delete their own photos
CREATE POLICY "Technicians can delete photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'well-report-photos' AND
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
  );
```

## Step 3: Verify Storage Setup

1. Go to **Storage** → **well-report-photos**
2. Try uploading a test file manually
3. Check that the policies are working

## Troubleshooting

**"Bucket not found"**
- Make sure the bucket name is exactly `well-report-photos`
- Check that the bucket exists in Storage section

**"Permission denied"**
- Make sure you've run the storage policies SQL
- Verify the user is in the `technicians` table
- Check RLS is enabled on storage.objects

**Photos not uploading**
- Check browser console for errors
- Verify Supabase credentials in `.env.local`
- Make sure file size is under the limit

---

Once storage is set up, photo uploads will work in the Photos tab!
