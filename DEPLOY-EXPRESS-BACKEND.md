# 🚀 Deploy Express Backend (Admin Website) Online

The Express backend serves your admin website with HTML pages and API endpoints. Since Vercel is for Next.js/serverless, we need a different hosting platform for the Express server.

## 🎯 Recommended Options

### Option 1: Railway (Easiest) ⭐ Recommended
- **Free tier:** $5/month credit (usually enough for small apps)
- **Pros:** Very easy setup, automatic deployments from GitHub
- **Best for:** Quick deployment with minimal configuration

### Option 2: Render (Free Tier Available)
- **Free tier:** Yes (with limitations)
- **Pros:** Free tier available, good for testing
- **Cons:** Free tier spins down after inactivity

### Option 3: Fly.io
- **Free tier:** Yes
- **Pros:** Good performance, global edge network
- **Cons:** Slightly more complex setup

---

## 🚂 Option 1: Deploy to Railway (Recommended)

### Step 1: Prepare Your Code

The server is already configured to use `process.env.PORT` (updated in server.js).

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easiest)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `Well_Testing` repository

### Step 3: Configure Railway

1. **Railway will auto-detect Node.js** - this is good!

2. **Set Environment Variables:**
   - Click on your service → Variables tab
   - Add these variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     PORT=3000
     ```
   - **Note:** Railway will set PORT automatically, but you can override it

3. **Configure Start Command:**
   - Go to Settings → Deploy
   - **Start Command:** `npm start`
   - Railway will auto-detect this from package.json

4. **Deploy:**
   - Railway will automatically deploy when you connect the repo
   - Or click "Deploy" manually
   - Wait 2-5 minutes for deployment

### Step 4: Get Your URL

1. After deployment, Railway will give you a URL like:
   - `https://your-project.up.railway.app`
2. Your admin site will be live at this URL!

### Step 5: Custom Domain (Optional)

1. In Railway → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions

---

## 🎨 Option 2: Deploy to Render

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up (free tier available)
3. Click "New +" → "Web Service"

### Step 2: Connect Repository

1. Connect your GitHub account
2. Select `Well_Testing` repository
3. Render will auto-detect Node.js

### Step 3: Configure Service

**Basic Settings:**
- **Name:** `well-testing-admin` (or your choice)
- **Environment:** `Node`
- **Build Command:** `npm install` (or leave blank)
- **Start Command:** `npm start`
- **Plan:** Free (or paid for better performance)

**Environment Variables:**
Click "Add Environment Variable" and add:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note:** Render will automatically set `PORT` - your server uses `process.env.PORT || 3003`

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for deployment (3-5 minutes)
3. Your site will be at: `https://your-service.onrender.com`

**Important:** Free tier services spin down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds.

---

## 🪰 Option 3: Deploy to Fly.io

### Step 1: Install Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex
```

### Step 2: Login

```bash
fly auth login
```

### Step 3: Create Fly App

```bash
cd C:\Users\msjbc\Desktop\Sites\Well_Testing
fly launch
```

Follow the prompts:
- App name: `well-testing-admin` (or your choice)
- Region: Choose closest to you
- Don't deploy a Postgres database (you're using Supabase)
- Don't deploy a Redis instance

### Step 4: Configure Environment Variables

```bash
fly secrets set NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Deploy

```bash
fly deploy
```

Your site will be at: `https://your-app.fly.dev`

---

## ✅ Post-Deployment Checklist

### 1. Test Your Admin Site

Visit your deployed URL and test:
- ✅ Admin login page loads
- ✅ Dashboard displays
- ✅ Can view jobs
- ✅ API endpoints work

### 2. Update API URLs (if needed)

If your frontend HTML files reference `http://localhost:3003`, you may need to update them to use your new URL. Check:
- `admin-*.html` files
- `api.js` file

### 3. CORS Configuration

If you get CORS errors, you may need to update CORS settings in `server.js`. The server should already handle this, but verify.

### 4. Environment Variables

Make sure all three Supabase variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (important for server-side operations)

---

## 🔧 Troubleshooting

### Server Won't Start

**Error: "Port already in use"**
- Railway/Render/Fly set PORT automatically - your server uses `process.env.PORT || 3003`
- This should work automatically

**Error: "Cannot find module"**
- Make sure `package.json` has all dependencies
- Platform should run `npm install` automatically

### CORS Errors

If you see CORS errors:
1. Check `server.js` CORS configuration
2. Make sure your frontend is using the correct API URL
3. Update CORS origins if needed

### Environment Variables Not Working

1. Verify variables are set in platform dashboard
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding/changing variables

### Data Directory Issues

The server uses a `data/` directory for local JSON storage. On cloud platforms:
- This directory is ephemeral (resets on redeploy)
- **Solution:** The server syncs with Supabase, so data is safe
- Local JSON is just a backup/cache

---

## 📝 Important Notes

### What Gets Deployed

✅ **Express Server** (`server.js`)
- Serves admin HTML pages
- Provides REST API endpoints
- Syncs with Supabase

✅ **Admin HTML Pages**
- `admin-*.html` files
- Static assets (images, CSS, JS)

❌ **Next.js PWA** (already on Vercel)
- This stays on Vercel
- Field tech app is separate

### Data Storage

- **Primary:** Supabase (persistent, shared)
- **Local:** `data/` directory (ephemeral on cloud, used for backup/sync)

### Port Configuration

- **Local:** Port 3003
- **Cloud:** Uses `process.env.PORT` (set automatically by platform)
- Server code: `const PORT = process.env.PORT || 3003;` ✅

---

## 🎉 You're Done!

Once deployed, you'll have:
- ✅ **Admin Website:** `https://your-backend-url.com`
- ✅ **Field Tech PWA:** `https://your-vercel-url.vercel.app`

Both connect to the same Supabase database, so data is synchronized!

---

## 🔄 Updating After Deployment

### Railway
- Auto-deploys on git push to main branch
- Or manually trigger from dashboard

### Render
- Auto-deploys on git push (if configured)
- Or manually trigger from dashboard

### Fly.io
```bash
fly deploy
```

---

## 💡 Recommendation

**Start with Railway** - it's the easiest and most straightforward for Express apps. The $5/month credit is usually enough for small applications, and setup takes just a few minutes.

Good luck! 🚀

