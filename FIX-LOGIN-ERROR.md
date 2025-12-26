# 🔧 Fix "Failed to Fetch" Login Error

## Problem
The field tech PWA login gives "Failed to Fetch" error. This is almost always because **Supabase environment variables are missing in Vercel**.

## ✅ Solution: Add Environment Variables to Vercel

### Step 1: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (the long key under "Project API keys")

### Step 2: Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your **Well_Testing** project
3. Go to **Settings** → **Environment Variables**
4. Add these 3 variables:

   **Variable 1:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - **Environment:** Production, Preview, Development (select all)

   **Variable 2:**
   - **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon/public key
   - **Environment:** Production, Preview, Development (select all)

   **Variable 3:**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your Supabase service_role key (from Settings → API → service_role secret)
   - **Environment:** Production, Preview, Development (select all)
   - ⚠️ **Important:** This is a secret key - never expose it in client code!

5. Click **Save** for each variable

### Step 3: Redeploy

After adding the environment variables:

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-5 minutes)

### Step 4: Test

1. Visit your Vercel URL: `https://your-project.vercel.app/login`
2. Try logging in again
3. The "Failed to Fetch" error should be gone!

---

## 🔍 How to Verify Environment Variables Are Set

### Option 1: Check Vercel Dashboard
- Go to Settings → Environment Variables
- You should see all 3 variables listed

### Option 2: Check Build Logs
- Go to Deployments → Latest deployment → Build Logs
- Look for any warnings about missing environment variables

### Option 3: Add Debug Code (Temporary)
Add this to `app/login/page.tsx` temporarily to check:

```typescript
useEffect(() => {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌');
  console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌');
}, []);
```

Then check browser console when you visit the login page.

---

## 🐛 Other Possible Issues

### Issue 2: CORS Error
If you see a CORS error in the browser console:
- Check Supabase Dashboard → Settings → API
- Make sure your Vercel domain is in the allowed origins (or use wildcard `*`)

### Issue 3: Network Error
- Check if Supabase is accessible: Visit your Supabase URL in a browser
- Check browser console for specific error messages
- Try a different network/device

### Issue 4: Wrong Supabase Project
- Make sure you're using the correct Supabase project
- Verify the URL matches your project

---

## ✅ Quick Checklist

- [ ] Environment variables added to Vercel
- [ ] All 3 variables set (URL, ANON_KEY, SERVICE_ROLE_KEY)
- [ ] Variables set for all environments (Production, Preview, Development)
- [ ] Redeployed after adding variables
- [ ] Tested login again

---

## 📞 Still Not Working?

If it still doesn't work after adding environment variables:

1. **Check browser console** - Look for specific error messages
2. **Check Vercel function logs** - Go to Deployments → Functions → View logs
3. **Verify Supabase is accessible** - Try accessing your Supabase project URL directly
4. **Check Supabase Auth settings** - Make sure email/password auth is enabled

---

**Most Common Fix:** Just add the environment variables to Vercel and redeploy! 🚀

