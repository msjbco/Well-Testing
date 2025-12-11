# 🚀 Deploy to Vercel - Step by Step Guide

## 📍 Where We Are

You have a **Next.js 14 PWA** application for field technicians that:
- ✅ Uses Supabase for database and authentication
- ✅ Has offline support with auto-sync
- ✅ Includes job management, flow testing, water quality, photos, and more
- ✅ Is ready to deploy (git is clean, vercel.json configured)

**Important Note:** Only the **Next.js PWA** will deploy to Vercel. The Express.js backend (port 3003) runs separately and won't be on Vercel. The PWA connects directly to Supabase, so it works independently.

---

## 🎯 Quick Deployment Steps

### Step 1: Push to GitHub (if not already)

Make sure your code is pushed to GitHub:

```bash
git push origin main
```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in (or create account)

2. **Click "Add New Project"**

3. **Import your GitHub repository:**
   - Select your `Well_Testing` repository
   - Click "Import"

4. **Configure Project Settings:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run next:build` (already in vercel.json)
   - **Output Directory:** `.next` (already in vercel.json)
   - **Install Command:** `npm install` (already in vercel.json)

5. **Add Environment Variables:**
   
   Click "Environment Variables" and add these:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   **Where to find these:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** → **API**
   - Copy the "Project URL" and "anon public" key

6. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (2-5 minutes)

#### Option B: Via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Add environment variables when prompted

---

## ✅ Post-Deployment Checklist

### 1. Verify Environment Variables

After deployment, check that environment variables are set:
- Go to your project in Vercel Dashboard
- Settings → Environment Variables
- Verify both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present

### 2. Test the Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Try logging in
3. Test creating/editing a job
4. Verify offline mode works

### 3. Update Supabase CORS (if needed)

If you get CORS errors:
1. Go to Supabase Dashboard → Settings → API
2. Add your Vercel domain to "Allowed Origins"
   - Example: `https://your-project.vercel.app`

### 4. Set Up Custom Domain (Optional)

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## 🔧 Troubleshooting

### Build Fails

**Error: "Module not found"**
- Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: "Environment variables missing"**
- Add them in Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding

### App Works But Can't Connect to Supabase

1. Check environment variables are set correctly
2. Verify Supabase project is active
3. Check Supabase RLS policies allow access
4. Check browser console for specific errors

### PWA Not Working

- Make sure `next-pwa` is installed (it is)
- Check that build completed successfully
- PWA features work best on HTTPS (Vercel provides this automatically)

---

## 📝 Important Notes

### What Deploys to Vercel

✅ **Next.js PWA** (the field tech app)
- All routes in `/app` directory
- PWA functionality
- Direct Supabase connection

❌ **Express Backend** (does NOT deploy)
- The Express server (`server.js`) runs on port 3003 locally
- This is separate and would need a different hosting solution (Railway, Render, etc.)
- The PWA doesn't need it - it connects directly to Supabase

### Environment Variables

**Required for Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**NOT needed on Vercel:**
- `SUPABASE_SERVICE_ROLE_KEY` - Only used by Express backend (server-side only)

### Build Configuration

Your `vercel.json` is already configured correctly:
```json
{
  "buildCommand": "npm run next:build",
  "devCommand": "npm run next:dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

---

## 🎉 You're Done!

Once deployed, your PWA will be live at:
- **Production:** `https://your-project.vercel.app`
- **Preview:** Each git push creates a preview deployment

The app will:
- ✅ Work offline
- ✅ Sync with Supabase when online
- ✅ Be installable as a PWA on mobile devices
- ✅ Have HTTPS automatically (required for PWA)

---

## 🔄 Updating After Deployment

Every time you push to `main`:
1. Vercel automatically builds and deploys
2. You get a new preview URL for each branch/PR
3. Production updates automatically

No manual deployment needed! 🚀

