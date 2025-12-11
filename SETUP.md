# Complete Setup Guide

This guide will walk you through setting up the Well Testing application from scratch.

## 📋 Prerequisites

- Node.js 18+ installed
- npm installed
- Supabase account (free tier works)
- Git (optional, for version control)

---

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages for both the Express backend and Next.js PWA.

---

## Step 2: Set Up Environment Variables

1. **Create `.env.local` file** in the project root:
   ```bash
   # Copy the example file
   cp env.example .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to https://supabase.com/dashboard
   - Select your project (or create a new one)
   - Go to **Settings** → **API**

3. **Add to `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

   **Important:**
   - The **anon key** is safe for client-side use (PWA)
   - The **service role key** has full database access - **NEVER** commit it to git or use it client-side
   - The service role key is only used by the Express server

---

## Step 3: Set Up Database Schema

### 3.1: Run Initial Schema

1. Open Supabase Dashboard → **SQL Editor**
2. Create a new query
3. Copy and run the contents of:
   - `migrations/01-initial-schema.sql` (or `SUPABASE_SCHEMA_COMPLETE.sql` if migrations folder doesn't exist yet)

This creates:
- `jobs` table
- `well_reports` table
- `technicians` table (if needed)
- Basic indexes

### 3.2: Add Additional Fields

Run these migrations in order:
- `migrations/02-add-job-fields.sql` (or `ADD-JOB-FIELDS.sql`)
- `migrations/03-add-well-basics.sql` (or `ADD-WELL-BASICS-SYSTEM-EQUIPMENT-RECOMMENDATIONS.sql`)
- `migrations/04-rls-policies.sql` (consolidated RLS policies)
- `migrations/05-storage-policies.sql` (or `FIX-STORAGE-POLICIES.sql`)

**Note:** If you see "already exists" errors, that's okay - it means the column/table already exists.

---

## Step 4: Create Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Fill in:
   - **Name**: `well-report-photos` (exact name required)
   - **Public bucket**: ✅ Check this
   - **File size limit**: 10MB (or your preference)
   - **Allowed MIME types**: `image/*,application/pdf` (optional)
4. Click **"Create bucket"**

---

## Step 5: Set Up Storage Policies

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the SQL from `migrations/05-storage-policies.sql` (or `FIX-STORAGE-POLICIES.sql`)

This allows authenticated users to:
- Upload photos
- Read photos
- Update photos
- Delete photos

---

## Step 6: Enable Realtime

1. Go to Supabase Dashboard → **Database** → **Replication**
2. Enable Realtime for:
   - ✅ `jobs` table
   - ✅ `well_reports` table

This enables real-time updates in the PWA.

---

## Step 7: Create a Test User

### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click **"Add user"** or **"Create new user"**
3. Fill in:
   - **Email**: `tech@example.com` (or your email)
   - **Password**: Choose a secure password
   - **Auto Confirm User**: ✅ Check this
4. Click **"Create user"**
5. Copy the user's UUID (you'll need it)

### Option B: Via SQL

```sql
-- After creating user via dashboard, add to technicians table if needed
INSERT INTO technicians (user_id, name)
SELECT id, 'Test Technician'
FROM auth.users
WHERE email = 'tech@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Step 8: Start the Servers

### Terminal 1: Express Backend

```bash
npm start
```

You should see:
```
Server running on http://localhost:3003
Data directory: C:\Users\...\Well_Testing\data
```

### Terminal 2: Next.js PWA

```bash
npm run next:dev
```

You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3001
✓ Ready in X seconds
```

**Important:** Keep both terminals open - the servers run continuously.

---

## Step 9: Test the Applications

### Test Admin Site (http://localhost:3003)

1. Open http://localhost:3003
2. Login with admin credentials (if you have them)
3. Create a test job
4. Verify it appears in the dashboard

### Test PWA (http://localhost:3001)

1. Open http://localhost:3001
2. You'll be redirected to `/login`
3. Login with the test user you created
4. Navigate to `/field-tech`
5. Create a new job or edit an existing one
6. Test each tab:
   - **Flow Test**: Enter GPM readings
   - **Water Quality**: Fill test results
   - **Photos**: Upload photos (use camera on mobile)
   - **Notes**: Add notes and recommendations

---

## Step 10: Install PWA on Mobile Device

### On Android

1. Open http://localhost:3001 in Chrome
2. Tap menu (3 dots) → **"Install app"** or **"Add to Home Screen"**
3. App icon appears on home screen

### On iOS

1. Open http://localhost:3001 in **Safari** (not Chrome)
2. Tap Share button → **"Add to Home Screen"**
3. Customize name if desired → **"Add"**

### On Desktop (Chrome/Edge)

1. Look for install icon in address bar
2. Click **"Install"**
3. App opens in standalone window

---

## ✅ Verification Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` file created with Supabase credentials
- [ ] Database schema run in Supabase
- [ ] Storage bucket `well-report-photos` created
- [ ] Storage policies set up
- [ ] Realtime enabled for `jobs` and `well_reports`
- [ ] Test user created
- [ ] Express server running on port 3003
- [ ] Next.js server running on port 3001
- [ ] Can login to PWA
- [ ] Can create/edit jobs in PWA
- [ ] Can upload photos
- [ ] Data syncs between PWA and admin site

---

## 🐛 Troubleshooting

If something isn't working, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and fixes.

---

## 📚 Next Steps

- Review [COMPLETE-FIELD-TECH-SETUP.md](./COMPLETE-FIELD-TECH-SETUP.md) for PWA-specific details
- Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if you encounter issues
- Customize the app for your needs

---

## 🔒 Security Notes

- **Never commit `.env.local`** to git (it's in `.gitignore`)
- **Service Role Key** has full database access - only use server-side
- **Anon Key** is safe for client-side use
- Regularly backup your Supabase database
- Use strong passwords for test users

---

## 📞 Need Help?

- Check the browser console (F12) for errors
- Check server terminal output for errors
- Review [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Verify all steps above were completed
