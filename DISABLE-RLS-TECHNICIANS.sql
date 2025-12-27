-- Disable Row Level Security on technicians table
-- This allows the service role key to delete techs without RLS blocking it
-- Run this in Supabase SQL Editor

ALTER TABLE technicians DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'technicians';
-- Should show rowsecurity = false

