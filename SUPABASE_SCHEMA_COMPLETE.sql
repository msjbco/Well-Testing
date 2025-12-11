-- Complete Supabase Schema for Field Tech PWA
-- Run this in your Supabase SQL Editor
-- This includes all tables, columns, and policies needed

-- ============================================
-- 1. JOBS TABLE ENHANCEMENTS
-- ============================================

-- Add assigned_tech_id to jobs table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'assigned_tech_id'
  ) THEN
    ALTER TABLE jobs ADD COLUMN assigned_tech_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_jobs_assigned_tech_id ON jobs(assigned_tech_id);
  END IF;
END $$;

-- Add status column to jobs if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'status'
  ) THEN
    ALTER TABLE jobs ADD COLUMN status TEXT DEFAULT 'in-progress';
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  END IF;
END $$;

-- Add additional job fields
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'email'
  ) THEN
    ALTER TABLE jobs ADD COLUMN email TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'phone'
  ) THEN
    ALTER TABLE jobs ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'city'
  ) THEN
    ALTER TABLE jobs ADD COLUMN city TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'state'
  ) THEN
    ALTER TABLE jobs ADD COLUMN state TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'zip'
  ) THEN
    ALTER TABLE jobs ADD COLUMN zip TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'role'
  ) THEN
    ALTER TABLE jobs ADD COLUMN role TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'notes'
  ) THEN
    ALTER TABLE jobs ADD COLUMN notes TEXT;
  END IF;
END $$;

-- ============================================
-- 2. WELL_REPORTS TABLE ENHANCEMENTS
-- ============================================

-- Ensure well_reports table exists
CREATE TABLE IF NOT EXISTS well_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  flow_readings JSONB DEFAULT '[]'::jsonb,
  water_quality JSONB DEFAULT '{}'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id)
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'flow_readings'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN flow_readings JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'water_quality'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN water_quality JSONB DEFAULT '{}'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_well_reports_water_quality ON well_reports USING GIN (water_quality);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'photos'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN photos JSONB DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_well_reports_photos ON well_reports USING GIN (photos);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'notes'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN notes TEXT DEFAULT '';
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_well_reports_job_id ON well_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_well_reports_flow_readings ON well_reports USING GIN (flow_readings);

-- ============================================
-- 3. TECHNICIANS TABLE
-- ============================================

-- Create technicians table if it doesn't exist
CREATE TABLE IF NOT EXISTS technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE well_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Technicians can read jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can create jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can update assigned jobs" ON jobs;
DROP POLICY IF EXISTS "Technicians can manage well reports" ON well_reports;

-- Technicians can read all jobs (or just their assigned ones)
CREATE POLICY "Technicians can read jobs"
  ON jobs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
  );

-- Technicians can create jobs (assigned to themselves)
CREATE POLICY "Technicians can create jobs"
  ON jobs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
    AND assigned_tech_id = auth.uid()
  );

-- Technicians can update their assigned jobs
CREATE POLICY "Technicians can update assigned jobs"
  ON jobs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
    )
    AND (assigned_tech_id = auth.uid() OR assigned_tech_id IS NULL)
  );

-- Technicians can manage well reports for their assigned jobs
CREATE POLICY "Technicians can manage well reports"
  ON well_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM technicians 
      WHERE technicians.user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = well_reports.job_id
        AND (jobs.assigned_tech_id = auth.uid() OR jobs.assigned_tech_id IS NULL)
      )
    )
  );

-- ============================================
-- 5. STORAGE BUCKET SETUP
-- ============================================

-- Note: Storage buckets must be created in Supabase Dashboard → Storage
-- Bucket name: well-report-photos
-- Public: Yes (or use signed URLs)
-- File size limit: 10MB (adjust as needed)
-- Allowed MIME types: image/*, application/pdf

-- Storage policy (run after creating bucket):
-- CREATE POLICY "Technicians can upload photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'well-report-photos' AND
--   EXISTS (
--     SELECT 1 FROM technicians 
--     WHERE technicians.user_id = auth.uid()
--   )
-- );

-- CREATE POLICY "Technicians can read photos"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'well-report-photos' AND
--   EXISTS (
--     SELECT 1 FROM technicians 
--     WHERE technicians.user_id = auth.uid()
--   )
-- );

-- ============================================
-- 6. ENABLE REALTIME (if not already enabled)
-- ============================================

-- Realtime is enabled by default in Supabase
-- Make sure it's enabled in Dashboard → Database → Replication
-- Tables to replicate: jobs, well_reports

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('jobs', 'well_reports', 'technicians');

-- Verify columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'well_reports';
