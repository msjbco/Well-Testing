-- Row Level Security (RLS) Policies
-- Run this AFTER 01-initial-schema.sql
-- Run in Supabase SQL Editor

-- Enable RLS on all tables
ALTER TABLE well_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Technicians can read jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can create jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can update assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can manage well reports" ON well_reports;
DROP POLICY IF EXISTS "Users can read their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Users can create jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Users can manage well reports" ON well_reports;

-- Simplified RLS: Allow authenticated users to read all jobs
-- (Access control is handled at application level via assigned_tech_id)
CREATE POLICY "Users can read their assigned jobs"
  ON jobs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      assigned_tech_id = auth.uid() 
      OR assigned_tech_id IS NULL
    )
  );

-- Allow authenticated users to create jobs
CREATE POLICY "Users can create jobs"
  ON jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND assigned_tech_id = auth.uid()
  );

-- Allow authenticated users to update their assigned jobs
CREATE POLICY "Users can update their assigned jobs"
  ON jobs
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      assigned_tech_id = auth.uid() 
      OR assigned_tech_id IS NULL
    )
  );

-- Allow authenticated users to manage well reports for their assigned jobs
CREATE POLICY "Users can manage well reports"
  ON well_reports
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = well_reports.job_id
      AND (
        jobs.assigned_tech_id = auth.uid() 
        OR jobs.assigned_tech_id IS NULL
      )
    )
  );
