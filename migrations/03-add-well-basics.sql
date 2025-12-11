-- Add Well Basics, System Equipment, and Recommendations
-- Run this AFTER 01-initial-schema.sql
-- Run in Supabase SQL Editor

DO $$ 
BEGIN
  -- Add well_basics JSONB column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'well_basics'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN well_basics JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add system_equipment JSONB column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'system_equipment'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN system_equipment JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add recommendations TEXT column (for HTML content)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'well_reports' AND column_name = 'recommendations'
  ) THEN
    ALTER TABLE well_reports ADD COLUMN recommendations TEXT DEFAULT '';
  END IF;
END $$;
