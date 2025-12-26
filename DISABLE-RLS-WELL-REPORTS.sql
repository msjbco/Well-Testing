-- Disable Row Level Security on well_reports table
-- This allows the API (using service role key) to read/write reports without RLS blocking it
-- Run this in Supabase SQL Editor

ALTER TABLE well_reports DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'well_reports';
-- Should show rowsecurity = false

