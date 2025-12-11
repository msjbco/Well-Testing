-- Add Additional Job Fields
-- Run this AFTER 01-initial-schema.sql
-- Run in Supabase SQL Editor

DO $$ 
BEGIN
  -- Add county column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'county'
  ) THEN
    ALTER TABLE jobs ADD COLUMN county TEXT;
  END IF;
  
  -- Add wellPermitNumber column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'wellPermitNumber'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "wellPermitNumber" TEXT;
  END IF;
  
  -- Add hasCistern column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'hasCistern'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "hasCistern" TEXT;
  END IF;
  
  -- Add equipmentInspection column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'equipmentInspection'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "equipmentInspection" TEXT;
  END IF;
  
  -- Add willBePresent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'willBePresent'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "willBePresent" TEXT;
  END IF;
  
  -- Add accessInstructions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'accessInstructions'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "accessInstructions" TEXT;
  END IF;
  
  -- Add scheduledDate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'scheduledDate'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "scheduledDate" TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add firstName and lastName columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'firstName'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "firstName" TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'lastName'
  ) THEN
    ALTER TABLE jobs ADD COLUMN "lastName" TEXT;
  END IF;
  
  -- Add archived column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'archived'
  ) THEN
    ALTER TABLE jobs ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_jobs_archived ON jobs(archived);
  END IF;
  
  -- Add archived_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;
