-- Add archived columns to jobs table if they don't exist
-- Run this in Supabase SQL Editor

DO $$ 
BEGIN
  -- Add archived column (boolean)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'archived'
  ) THEN
    ALTER TABLE jobs ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    CREATE INDEX IF NOT EXISTS idx_jobs_archived ON jobs(archived);
  END IF;
  
  -- Add archived_at column (timestamp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'jobs' 
  AND column_name IN ('archived', 'archived_at');
