# Next.js 14 + Supabase PWA Field Tech App

This is the Next.js 14 application with PWA support for field technicians to enter flow rate readings.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a `.env.local` file in the root directory:
```bash
cp .env.local.example .env.local
```

2. Add your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database Schema

Run the SQL in `SUPABASE_SCHEMA.sql` in your Supabase SQL editor to:
- Create/update the `well_reports` table with `flow_readings` JSONB column
- Ensure `jobs` table has required columns (address, client_name, jobId)
- Create `technicians` table for auth checks
- Set up Row Level Security (RLS) policies

### 4. Create PWA Icons

You need to create two icon files in the `public` directory:
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)

These should use your orange/green theme colors.

### 5. Run Development Server

```bash
npm run next:dev
```

The app will be available at `http://localhost:3000`

### 6. Build for Production

```bash
npm run next:build
npm run next:start
```

## Features

- ✅ Auth-protected routes (redirects to `/login` if not authenticated)
- ✅ Mobile-first design with large, thumb-friendly inputs
- ✅ Offline support with automatic sync when back online
- ✅ PWA installable on iOS and Android
- ✅ Live calculations (average GPM, sustained yield, peak flow)
- ✅ Toast notifications for save status
- ✅ High contrast design for outdoor use

## Route Structure

- `/login` - Technician login page
- `/field-tech/[jobId]/flow-entry` - Flow rate entry page

## Offline Support

The app uses Supabase's built-in offline queue. When offline:
- Changes are queued locally
- Toast notification shows "Saved locally - will sync when online"
- Automatic sync when connection is restored

## PWA Installation

Users can install the app on their devices:
- **iOS**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu → Install App

The app will work offline and sync when online.
