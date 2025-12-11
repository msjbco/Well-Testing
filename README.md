# Well Testing Application

A comprehensive well testing management system with a Progressive Web App (PWA) for field technicians and an admin web interface.

## 🏗️ Architecture

This application consists of two main components:

### 1. **Express.js Backend** (Port 3003)
- Main admin website with HTML pages
- RESTful API for jobs, reports, and technicians
- Synchronizes data between local JSON storage and Supabase
- Located at: `http://localhost:3003`

### 2. **Next.js PWA** (Port 3001)
- Mobile-first Progressive Web App for field technicians
- Full offline support with automatic sync
- Real-time updates via Supabase Realtime
- Located at: `http://localhost:3001`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git (for cloning)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials (see [SETUP.md](./SETUP.md))

3. **Set up database:**
   - Run SQL migrations in Supabase (see [SETUP.md](./SETUP.md))

4. **Start both servers:**
   ```bash
   # Terminal 1: Express backend
   npm start
   
   # Terminal 2: Next.js PWA
   npm run next:dev
   ```

5. **Access the applications:**
   - Admin site: http://localhost:3003
   - PWA: http://localhost:3001

## 📱 Features

### Field Technician PWA
- ✅ Mobile-first design (iPhone/Android optimized)
- ✅ Offline-first with auto-sync
- ✅ Camera integration for photos
- ✅ Real-time job updates
- ✅ Flow test calculations
- ✅ Water quality data entry
- ✅ Installable PWA

### Admin Website
- ✅ Job management dashboard
- ✅ Report generation and preview
- ✅ Technician management
- ✅ Calendar view
- ✅ Map view of jobs
- ✅ Data synchronization with PWA

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and fixes
- **[COMPLETE-FIELD-TECH-SETUP.md](./COMPLETE-FIELD-TECH-SETUP.md)** - PWA-specific setup

## 🗄️ Database

The application uses **Supabase** (PostgreSQL) as the primary database with:
- `jobs` table - Job information
- `well_reports` table - Test results and data
- `technicians` table - User management
- Supabase Storage - Photo storage

## 🔄 Data Flow

1. **PWA** → Creates/updates data in Supabase
2. **Express Server** → Syncs Supabase ↔ Local JSON (for backup/compatibility)
3. **Admin Site** → Reads/writes via Express API → Supabase

## 🛠️ Tech Stack

- **Frontend (PWA)**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **PWA**: next-pwa, Service Workers

## 📁 Project Structure

```
Well_Testing/
├── app/                    # Next.js PWA routes
│   ├── field-tech/        # Field tech pages
│   └── login/             # Authentication
├── components/            # React components
├── lib/                   # Shared utilities
├── migrations/            # SQL migration files
├── scripts/              # Utility scripts
├── server.js             # Express backend
├── api.js                # Client-side API
└── admin-*.html          # Admin website pages
```

## 🔐 Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

## 📝 License

ISC

## 🤝 Support

For setup help, see [SETUP.md](./SETUP.md)  
For troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
