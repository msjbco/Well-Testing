# 📱 How to View the PWA (Progressive Web App)

## Two Servers Running

You now have **two separate applications**:

### 1. Original Website (Express Server)
- **Port:** 3001
- **URL:** http://localhost:3001
- **Purpose:** Your original HTML/Express website
- **Status:** ✅ Running

### 2. Next.js PWA Field Tech App
- **Port:** 3000 (or custom port)
- **URL:** http://localhost:3000
- **Purpose:** New PWA for field technicians
- **Status:** Start with `npm run next:dev`

---

## 🚀 Starting the PWA

### Step 1: Start Next.js Dev Server

```bash
npm run next:dev
```

This will start the Next.js app on **http://localhost:3000**

> **Note:** If port 3000 is already in use, Next.js will automatically use the next available port (3001, 3002, etc.) and tell you which one.

### Step 2: Open in Browser

1. Open your browser and go to: **http://localhost:3000**
2. You'll be redirected to `/login` if not authenticated
3. After login, navigate to: `/field-tech/[jobId]/flow-entry`

---

## 📱 Installing the PWA on Your Device

### On Desktop (Chrome/Edge)

1. Open http://localhost:3000 in Chrome or Edge
2. Look for the **install icon** in the address bar (or menu)
3. Click "Install" or "Add to Home Screen"
4. The app will open in a standalone window

### On Android

1. Open http://localhost:3000 in Chrome
2. Tap the **menu** (3 dots) in the top right
3. Select **"Install app"** or **"Add to Home Screen"**
4. The app icon will appear on your home screen
5. Tap it to open the PWA in standalone mode

### On iOS (iPhone/iPad)

1. Open http://localhost:3000 in **Safari** (not Chrome)
2. Tap the **Share button** (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Customize the name if desired
5. Tap **"Add"**
6. The app icon will appear on your home screen

---

## 🔍 Testing PWA Features

### Check PWA Status

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section - should show your app details
4. Check **Service Workers** - should show registered worker
5. Check **Storage** - should show cached files

### Test Offline Mode

1. Open the PWA
2. Open Chrome DevTools (F12)
3. Go to **Network** tab
4. Check **"Offline"** checkbox
5. Try navigating - the app should still work!
6. Try saving flow data - it will queue and sync when back online

### Test on Mobile Device

**Option A: Same Network (Recommended)**
1. Find your computer's local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
2. On your phone, connect to the same WiFi network
3. Open: `http://[your-ip]:3000` (e.g., `http://192.168.1.100:3000`)
4. Install the PWA as described above

**Option B: Localhost Tunnel (Advanced)**
- Use tools like `ngrok` or `localtunnel` to create a public URL
- Example: `npx localtunnel --port 3000`

---

## 🎯 Quick Access Routes

Once the PWA is running:

- **Login:** http://localhost:3000/login
- **Flow Entry:** http://localhost:3000/field-tech/[jobId]/flow-entry
  - Replace `[jobId]` with an actual job ID from your database

---

## ⚠️ Important Notes

### Before PWA Works Properly:

1. **Icons Required:** Make sure `icon-192x192.png` and `icon-512x512.png` exist in `public/` directory
   - Use `scripts/setup-pwa-icons.html` to generate them

2. **HTTPS Required for Full PWA Features:**
   - Localhost works for development
   - For production, you need HTTPS
   - Some PWA features (like install prompt) may be limited on HTTP

3. **Supabase Setup:**
   - Create `.env.local` with your Supabase credentials
   - Run `SUPABASE_SCHEMA.sql` in your Supabase project

### Troubleshooting

**PWA not installing?**
- Make sure icons exist in `public/` directory
- Check browser console for errors
- Try in Chrome/Edge (best PWA support)

**Can't access from phone?**
- Make sure both devices are on same WiFi
- Check Windows Firewall isn't blocking port 3000
- Try using your computer's IP address instead of localhost

**Service worker not registering?**
- Clear browser cache
- Check `next.config.js` has PWA enabled
- Make sure you're not in incognito mode

---

## 🎨 PWA Features to Test

✅ **Offline Support** - Works without internet  
✅ **Install Prompt** - Can be installed on device  
✅ **Standalone Mode** - Opens without browser UI  
✅ **Fast Loading** - Cached resources load instantly  
✅ **Auto Sync** - Data syncs when connection restored  

---

## 📊 Current Status

- ✅ Express server running on port 3001
- ⚠️ Next.js PWA needs to be started: `npm run next:dev`
- ⚠️ Icons need to be created (use `scripts/setup-pwa-icons.html`)
- ⚠️ Supabase needs to be configured (`.env.local`)

Once all steps are complete, the PWA will be fully functional!
