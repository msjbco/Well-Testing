# 🔧 Fix Technicians Table - Missing Columns

## Problem
The `technicians` table in Supabase is missing required columns, causing tech creation to fail.

## Solution: Add Missing Columns

### Step 1: Run SQL Migration

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/ADD-TECHNICIANS-COLUMNS.sql`
5. Click **Run** (or press Ctrl+Enter)

This will add:
- `email` (TEXT)
- `phone` (TEXT)  
- `active` (BOOLEAN, defaults to true)
- `updated_at` (TIMESTAMP)
- Makes `user_id` nullable (optional)

### Step 2: Verify Columns Added

1. Go to **Table Editor** → `technicians` table
2. Click the **Definition** tab
3. You should see these columns:
   - `id` (uuid)
   - `user_id` (uuid, nullable)
   - `name` (text)
   - `email` (text)
   - `phone` (text)
   - `active` (boolean)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

### Step 3: Test Adding a Tech

1. Go to your live site: `/admin-techs.html`
2. Click "Add New Tech"
3. Fill in the form and save
4. It should work now! ✅

---

## Why This Happened

The original schema only created a basic `technicians` table with:
- `id`
- `user_id` 
- `name`
- `created_at`

But the application code expects additional fields:
- `email`
- `phone`
- `active`
- `updated_at`

The migration adds these missing columns.

---

## Quick SQL (Copy-Paste Ready)

```sql
-- Add missing columns to technicians table
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE technicians ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(active) WHERE active = true;
```

Just run this in Supabase SQL Editor!

