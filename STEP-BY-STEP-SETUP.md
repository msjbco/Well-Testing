# 🚀 Step-by-Step Setup Guide

Let's do this one step at a time. Follow each step completely before moving to the next.

---

## ✅ STEP 1: Run Database Schema

### What this does:
Creates all the tables and columns your database needs for the field tech app.

### How to do it (TWO PARTS):

#### PART 1A: Create the jobs table first

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Sign in to your account
   - Click on your project

2. **Open SQL Editor**
   - Look at the left sidebar
   - Click on **"SQL Editor"** (it has a database icon)

3. **Create New Query**
   - Click the **"+ New query"** button (top right or in the query list)

4. **Copy the first SQL file**
   - Open the file `CREATE-JOBS-TABLE-FIRST.sql` in your project
   - Select ALL the text (Ctrl+A or Cmd+A)
   - Copy it (Ctrl+C or Cmd+C)

5. **Paste into Supabase**
   - Click in the big text box in the SQL Editor
   - Paste the SQL (Ctrl+V or Cmd+V)

6. **Run it**
   - Click the **"Run"** button (or press Ctrl+Enter)
   - If you see a warning popup, click **"Run this query"**
   - Wait for it to finish (should say "Success" or show green checkmark)

#### PART 1B: Run the full schema

7. **Clear the editor and create a new query**
   - Click **"+ New query"** again (or clear the current one)

8. **Copy the main SQL**
   - Open the file `SUPABASE_SCHEMA_FIELD_TECH.sql` in your project
   - Select ALL the text (Ctrl+A or Cmd+A)
   - Copy it (Ctrl+C or Cmd+C)

9. **Paste into Supabase**
   - Paste the SQL (Ctrl+V or Cmd+V)

10. **Run it**
    - Click the **"Run"** button (or press Ctrl+Enter)
    - If you see a warning popup, click **"Run this query"**
    - Wait for it to finish (should say "Success" or show green checkmark)

11. **Check for errors**
    - If you see any red errors, let me know
    - Most errors are okay if they say "already exists" - that means it's already set up

### ✅ You're done with Step 1 when:
- Both SQL files ran successfully
- You see "Success" or green checkmarks
- No red error messages (or only "already exists" messages)

**Tell me when Step 1 is complete, and I'll give you Step 2!**

---

## 📦 STEP 2: Create Storage Bucket (Wait for Step 1 to complete)

### What this does:
Creates a place to store photos that technicians upload.

### How to do it:

1. **Go to Storage**
   - In Supabase Dashboard, look at the left sidebar
   - Click on **"Storage"** (it has a folder icon)

2. **Create New Bucket**
   - Click the **"New bucket"** button (usually top right)

3. **Fill in the form:**
   - **Name**: Type exactly: `well-report-photos`
   - **Public bucket**: Check the box ✅ (make it public)
   - Leave everything else as default

4. **Create it**
   - Click **"Create bucket"** button
   - Wait for it to appear in the list

### ✅ You're done with Step 2 when:
- You see a bucket named "well-report-photos" in your Storage list

**Tell me when Step 2 is complete, and I'll give you Step 3!**

---

## 🔐 STEP 3: Set Up Storage Policies (Wait for Step 2 to complete)

### What this does:
Allows technicians to upload and view photos.

### How to do it:

1. **Go back to SQL Editor**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"+ New query"**

2. **Copy the storage policies SQL**
   - I'll provide this SQL below - copy all of it

3. **Paste and run**
   - Paste into the SQL Editor
   - Click **"Run"**

### The SQL to copy:

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

### ✅ You're done with Step 3 when:
- You see "Success" after running the SQL
- No red errors

**Tell me when Step 3 is complete, and I'll give you Step 4!**

---

## 🔄 STEP 4: Enable Realtime (Wait for Step 3 to complete)

### What this does:
Makes the app update in real-time when data changes.

### How to do it:

1. **Go to Database Settings**
   - In Supabase Dashboard, click **"Database"** in left sidebar
   - Click on **"Replication"** (it's a submenu under Database)

2. **Enable Realtime for jobs table**
   - Find **"jobs"** in the list
   - Toggle the switch ON (it should turn blue/green)

3. **Enable Realtime for well_reports table**
   - Find **"well_reports"** in the list
   - Toggle the switch ON (it should turn blue/green)

### ✅ You're done with Step 4 when:
- Both "jobs" and "well_reports" have their switches turned ON

**Tell me when Step 4 is complete, and you're all set!**

---

## 🎉 All Done!

Once all 4 steps are complete, your field tech app is ready to use!
