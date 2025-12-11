# Database Migrations

This folder contains SQL migration files for setting up and updating the Supabase database schema.

## Migration Order

Run these migrations **in order** in your Supabase SQL Editor:

1. **01-initial-schema.sql** - Creates base tables (jobs, well_reports, technicians)
2. **02-add-job-fields.sql** - Adds additional job fields (county, scheduledDate, etc.)
3. **03-add-well-basics.sql** - Adds well_basics, system_equipment, recommendations columns
4. **04-rls-policies.sql** - Sets up Row Level Security policies
5. **05-storage-policies.sql** - Sets up storage bucket policies (run after creating bucket)

## Quick Setup

1. Go to Supabase Dashboard → **SQL Editor**
2. Run each migration file in order (01, 02, 03, 04, 05)
3. Create storage bucket `well-report-photos` in Dashboard → Storage
4. Run migration 05 (storage policies)

## Notes

- All migrations use `IF NOT EXISTS` checks - safe to run multiple times
- If you see "already exists" errors, that's normal - the column/table already exists
- Always backup your database before running migrations in production

## Alternative: Single File Setup

If you prefer, you can use `SUPABASE_SCHEMA_COMPLETE.sql` which contains most of the schema in one file. However, the numbered migrations are recommended for better organization and easier troubleshooting.
