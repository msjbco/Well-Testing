-- Add missing columns to technicians table
-- Run this in Supabase SQL Editor

-- Add email column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'email'
  ) THEN
    ALTER TABLE technicians ADD COLUMN email TEXT;
  END IF;
END $$;

-- Add phone column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'phone'
  ) THEN
    ALTER TABLE technicians ADD COLUMN phone TEXT;
  END IF;
END $$;

-- Add active column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'active'
  ) THEN
    ALTER TABLE technicians ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add updated_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE technicians ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Make user_id nullable (since techs might be created before user accounts)
DO $$ 
BEGIN
  ALTER TABLE technicians ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    -- Column might already be nullable, ignore error
    NULL;
END $$;

-- Create index on active for filtering
CREATE INDEX IF NOT EXISTS idx_technicians_active ON technicians(active) WHERE active = true;

