# 🔧 Fix Tech Delete "Unknown Error"

## Problem
Deleting a tech returns "Failed to delete tech: unknown error"

## Possible Causes

### 1. Row Level Security (RLS) Blocking Delete
Even though RLS shows as "disabled" in the UI, check if it's actually enabled:

**In Supabase SQL Editor, run:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'technicians';

-- If rowsecurity is true, disable it (for now)
ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;
```

### 2. Foreign Key Constraint
If `user_id` references `auth.users`, you might need to handle the cascade:

**Check constraints:**
```sql
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'technicians'::regclass;
```

### 3. Service Role Key Not Working
Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables.

## Quick Fix

**Option 1: Disable RLS on technicians table**
```sql
ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;
```

**Option 2: Add RLS policy to allow deletes**
```sql
-- Enable RLS
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

-- Allow service role to delete (bypasses RLS)
CREATE POLICY "Service role can delete technicians"
ON technicians
FOR DELETE
TO service_role
USING (true);
```

**Option 3: Check Vercel Logs**
After the improved error handling deploys, check Vercel function logs for the actual error message.

## After Fix

1. Wait for Vercel to redeploy (2-5 minutes)
2. Try deleting a tech again
3. Check browser console for detailed error
4. Check Vercel function logs if still failing

