# 🚀 Deploy Everything to Vercel (Next.js + Express Backend)

Yes! You can deploy **both** your Next.js PWA and Express backend on Vercel! This is actually easier than using a separate platform.

## ✅ What Gets Deployed

- **Next.js PWA** - Field technician app (already working!)
- **Express API** - Admin website API endpoints (via serverless functions)
- **Admin HTML Pages** - Static files served from `public/` folder

## 🎯 Quick Setup

### Step 1: Move HTML Files to Public Folder

Vercel automatically serves files from the `public/` folder. Move your admin HTML files:

```bash
# Move admin HTML files to public folder
# (You can do this manually or I can help automate it)
```

Files to move:
- `admin-*.html` → `public/admin-*.html`
- `index.html` → `public/index.html` (if it's the main site)
- Other static HTML files

### Step 2: Update API Routes in HTML Files

Your HTML files reference `http://localhost:3003/api/...`. Update them to use relative paths:

**Before:**
```javascript
fetch('http://localhost:3003/api/jobs')
```

**After:**
```javascript
fetch('/api/jobs')  // Works on Vercel!
```

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, make sure you have:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for Express API)

### Step 4: Deploy

Just push to GitHub - Vercel will automatically deploy!

```bash
git add .
git commit -m "Add Express API to Vercel"
git push origin main
```

## 📁 File Structure

```
Well_Testing/
├── app/                    # Next.js PWA (field tech app)
├── api/                    # Express API (serverless functions)
│   └── [...].js           # Catch-all route for all API endpoints
├── public/                 # Static files (HTML, images, etc.)
│   ├── admin-*.html       # Admin pages
│   ├── index.html         # Main site
│   └── images/            # Images
├── components/            # React components
└── vercel.json            # Vercel configuration
```

## 🔧 How It Works

1. **Next.js Routes** (`/app/*`) → Handled by Next.js
2. **API Routes** (`/api/*`) → Handled by Express in `api/[...].js`
3. **Static Files** (`/public/*`) → Served automatically by Vercel

## ✅ Benefits

- ✅ **One platform** - Everything on Vercel
- ✅ **Free tier** - Generous free tier
- ✅ **Auto-deploy** - Deploys on every git push
- ✅ **HTTPS** - Automatic SSL certificates
- ✅ **CDN** - Fast global delivery
- ✅ **No separate hosting** - Simpler setup

## 🎉 Result

After deployment, you'll have:
- **Field Tech PWA:** `https://your-project.vercel.app/field-tech`
- **Admin Dashboard:** `https://your-project.vercel.app/admin-dashboard.html`
- **API Endpoints:** `https://your-project.vercel.app/api/jobs`, etc.

All on the same domain! 🚀

---

## 📝 Next Steps

1. Move HTML files to `public/` folder
2. Update API URLs in HTML files (remove `localhost:3003`)
3. Push to GitHub
4. Vercel will auto-deploy!

Want me to help move the files and update the URLs?

