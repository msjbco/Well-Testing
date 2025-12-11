-- Initial Database Schema
-- Run this FIRST to create base tables
-- Run in Supabase SQL Editor

-- ============================================
-- 1. JOBS TABLE
-- ============================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_tech_id ON jobs(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);

-- ============================================
-- 2. WELL_REPORTS TABLE
-- ============================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_well_reports_job_id ON well_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_well_reports_flow_readings ON well_reports USING GIN (flow_readings);
CREATE INDEX IF NOT EXISTS idx_well_reports_water_quality ON well_reports USING GIN (water_quality);
CREATE INDEX IF NOT EXISTS idx_well_reports_photos ON well_reports USING GIN (photos);

-- ============================================
-- 3. TECHNICIANS TABLE (Optional)
-- ============================================

CREATE TABLE IF NOT EXISTS technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
