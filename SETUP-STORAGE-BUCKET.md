# 📦 Setting Up Supabase Storage for Photos

The field tech app needs a storage bucket to upload photos. Here's how to set it up:

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Fill in:
   - **Name**: `well-report-photos`
   - **Public bucket**: ✅ Check this (or use signed URLs)
   - **File size limit**: 10MB (or adjust as needed)
   - **Allowed MIME types**: `image/*, application/pdf`
5. Click **"Create bucket"**

## Step 2: Set Up Storage Policies

After creating the bucket, go to **Storage** → **Policies** → `well-report-photos`

Run this SQL in your Supabase SQL Editor:

```sql
-- Allow technicians to upload photos
CREATE POLICY "Technicians can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'well-report-photos' AND
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE technicians.user_id = auth.uid()
  )
);

-- Allow technicians to read photos
CREATE POLICY "Technicians can read photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'well-report-photos' AND
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE technicians.user_id = auth.uid()
  )
);

-- Allow technicians to update photos
CREATE POLICY "Technicians can update photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'well-report-photos' AND
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE technicians.user_id = auth.uid()
  )
);

-- Allow technicians to delete photos
CREATE POLICY "Technicians can delete photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'well-report-photos' AND
  EXISTS (
    SELECT 1 FROM technicians 
    WHERE technicians.user_id = auth.uid()
  )
);
```

## Step 3: Enable Realtime (if needed)

1. Go to **Database** → **Replication**
2. Make sure **Realtime** is enabled
3. Enable replication for:
   - `jobs` table
   - `well_reports` table

## Step 4: Test Photo Upload

1. Create a test job in the PWA
2. Go to the Photos tab
3. Try uploading a photo
4. Check that it appears in Storage → `well-report-photos` bucket

---

## Troubleshooting

**"Bucket not found" error:**
- Make sure the bucket name is exactly `well-report-photos`
- Check that the bucket exists in Storage

**"Permission denied" error:**
- Make sure you've run the storage policies SQL
- Verify the user is in the `technicians` table
- Check RLS is enabled on storage.objects

**Photos not uploading:**
- Check browser console for errors
- Verify bucket is public or using signed URLs
- Check file size isn't exceeding limit

---

That's it! Your photo upload should work now.
