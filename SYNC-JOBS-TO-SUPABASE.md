# 🔄 Syncing Jobs from Main Site to PWA

## The Problem

Your **main site** (Express server on port 3001) stores jobs in `data/jobs.json`, but your **PWA** (Next.js on port 3000) reads from Supabase's `jobs` table. They're separate, so jobs created in the main site won't automatically appear in the PWA.

## Solution: Sync Script

I've created a script to copy jobs from your Express server to Supabase.

### Step 1: Install dotenv (if not already installed)

```powershell
npm install dotenv
```

### Step 2: Run the Sync Script

```powershell
node scripts/sync-jobs-to-supabase.js
```

This will:
- Read all jobs from `data/jobs.json`
- Check which ones already exist in Supabase
- Insert new jobs into Supabase
- Skip jobs that already exist

### Step 3: Verify in Supabase

1. Go to your Supabase dashboard
2. Open **Table Editor** → `jobs` table
3. You should see your synced jobs!

---

## Alternative: Auto-Sync on Job Creation

If you want jobs to automatically sync when created in the main site, you can modify your Express server's job creation endpoint to also insert into Supabase.

### Option A: Modify Express Server (Advanced)

Update `server.js` to also save to Supabase when creating jobs:

```javascript
// In your POST /api/jobs endpoint
app.post('/api/jobs', async (req, res) => {
  try {
    // ... existing code to save to jobs.json ...
    
    // Also save to Supabase
    const { error: supabaseError } = await supabase
      .from('jobs')
      .insert(newJob);
    
    if (supabaseError) {
      console.error('Failed to sync to Supabase:', supabaseError);
      // Don't fail the request, just log the error
    }
    
    res.status(201).json(newJob);
  } catch (error) {
    // ... error handling ...
  }
});
```

### Option B: Manual Sync (Simpler)

Just run the sync script whenever you create new jobs:

```powershell
node scripts/sync-jobs-to-supabase.js
```

---

## Manual Job Creation in Supabase

You can also create jobs directly in Supabase:

1. Go to Supabase → **Table Editor** → `jobs` table
2. Click **"Insert row"**
3. Fill in:
   - `id`: A unique ID (UUID or string)
   - `address`: Job address
   - `client_name`: Client name
   - `jobId`: Job identifier
4. Click **"Save"**

---

## Testing

After syncing:

1. Go to your PWA home page
2. Navigate to: `/field-tech/[job-id]/flow-entry`
3. Replace `[job-id]` with an actual job ID from Supabase
4. The flow entry page should load with the job details!

---

## Troubleshooting

**"data/jobs.json not found"**
- Make sure you've created at least one job in the main site first
- The file is created automatically when you create a job

**"Missing Supabase credentials"**
- Make sure `.env.local` exists with your Supabase credentials
- Run the script from the project root directory

**Jobs not showing in PWA**
- Make sure you ran the SQL schema (`SUPABASE_SCHEMA.sql`) to create the `jobs` table
- Check that the job IDs match between Express and Supabase
- Verify RLS policies allow technicians to read jobs

---

## Future: Unified Data Store

For a production setup, consider:
- Moving everything to Supabase (recommended)
- Or using the Express API as the single source of truth
- Or implementing real-time sync between both

For now, the sync script works great for development!
