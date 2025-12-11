-- Step 1A: Create the jobs table first (if it doesn't exist)
-- Run this BEFORE running SUPABASE_SCHEMA_FIELD_TECH.sql

-- Create jobs table with all required columns
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT,
  client_name TEXT,
  "jobId" TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  role TEXT,
  notes TEXT,
  status TEXT DEFAULT 'in-progress',
  assigned_tech_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_tech_id ON jobs(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- That's it! Now you can run SUPABASE_SCHEMA_FIELD_TECH.sql
