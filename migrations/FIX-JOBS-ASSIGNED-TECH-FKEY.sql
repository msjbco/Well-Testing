-- Fix foreign key constraint for jobs.assigned_tech_id
-- The constraint currently references auth.users(id) but should reference technicians(id)
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_assigned_tech_id_fkey;

-- Step 2: Clean up any invalid assigned_tech_id values
-- Set assigned_tech_id to NULL for any jobs where the tech doesn't exist in technicians table
UPDATE jobs
SET assigned_tech_id = NULL
WHERE assigned_tech_id IS NOT NULL
  AND assigned_tech_id NOT IN (SELECT id FROM technicians);

-- Step 3: Add the correct foreign key constraint that references technicians(id)
ALTER TABLE jobs 
ADD CONSTRAINT jobs_assigned_tech_id_fkey 
FOREIGN KEY (assigned_tech_id) 
REFERENCES technicians(id) 
ON DELETE SET NULL;

-- Step 4: Verify the constraint was created correctly
SELECT 
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conname = 'jobs_assigned_tech_id_fkey';

