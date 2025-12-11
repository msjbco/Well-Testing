# Troubleshooting Guide

Common issues and their solutions for the Well Testing application.

---

## 🚨 Server Issues

### Express Server Won't Start

**Error:** `EADDRINUSE: address already in use :::3003`

**Solution:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr ":3003"
   ```
2. Kill the process or change the port in `server.js`
3. Or use a different port by setting `PORT` environment variable

**Error:** `Cannot find module 'dotenv'`

**Solution:**
```bash
npm install
```

**Error:** `supabaseUrl is required`

**Solution:**
- Check `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL`
- Restart the server after creating `.env.local`

---

### Next.js PWA Won't Start

**Error:** `Port 3000 is in use`

**Solution:**
- Next.js will automatically use the next available port (3001, 3002, etc.)
- Check the terminal output for the actual port
- Or specify a port: `PORT=3001 npm run next:dev`

**Error:** `'next' is not recognized`

**Solution:**
```bash
npm install
```

**Error:** `missing required error components`

**Solution:**
- Make sure `app/error.tsx` and `app/global-error.tsx` exist
- Restart the Next.js server

---

## 🔐 Authentication Issues

### "Invalid login credentials"

**Causes:**
- User doesn't exist in Supabase
- Email/password is incorrect
- User isn't confirmed

**Solution:**
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Check if user exists
3. If not, create a new user with **"Auto Confirm User"** checked
4. Verify email and password are correct (case-sensitive)

### "User is not a technician"

**Solution:**
1. Add user to `technicians` table in Supabase, OR
2. Set user metadata in Authentication → Users:
   ```json
   {
     "role": "technician"
   }
   ```

### Stuck on Login Screen

**Solution:**
1. Check browser console (F12) for errors
2. Verify Supabase credentials in `.env.local`
3. Clear browser cache and cookies
4. Try logging out and back in

---

## 📊 Database Issues

### "new row violates row-level security policy"

**Cause:** RLS policies are too restrictive or missing

**Solution:**
1. Run the RLS policies SQL from `migrations/04-rls-policies.sql`
2. Or run `FIX-STORAGE-POLICIES.sql` for storage issues
3. Verify user has proper permissions

### Jobs Not Syncing Between PWA and Admin Site

**Causes:**
- Express server not running
- Supabase credentials missing in `.env.local`
- RLS policies blocking access

**Solution:**
1. Check Express server is running: `npm start`
2. Verify `.env.local` has all three Supabase keys
3. Check server terminal for sync errors
4. Verify RLS policies allow read/write

### Archived Jobs Still Visible

**Solution:**
- PWA filters out archived jobs - verify `archived` column exists
- Check query includes: `archived = false` or `!job.archived`

---

## 📸 Photo Upload Issues

### "Bucket not found"

**Solution:**
1. Go to Supabase → **Storage**
2. Verify bucket `well-report-photos` exists
3. Check bucket name is exactly `well-report-photos` (case-sensitive)

### "Permission denied" or 403 Error

**Solution:**
1. Run storage policies SQL: `migrations/05-storage-policies.sql`
2. Verify user is authenticated
3. Check RLS is enabled on `storage.objects`

### Photos Upload But Show Broken Thumbnail

**Causes:**
- Saving blob URLs instead of public URLs
- Bucket not public
- CORS issues

**Solution:**
1. Make sure bucket is set to **Public**
2. Verify code fetches public URL after upload:
   ```javascript
   const { data } = await supabase.storage
     .from('well-report-photos')
     .getPublicUrl(path);
   ```
3. Check browser console for CORS errors

### Photos Not Syncing Between PWA and Admin Site

**Solution:**
1. Verify `server.js` has `uploadBase64PhotosToStorage` function
2. Check Express server is processing base64 photos
3. Verify photos are uploaded to Supabase Storage, not just saved as base64

---

## 🔄 Sync Issues

### Data Not Syncing

**Checklist:**
1. ✅ Express server running (`npm start`)
2. ✅ `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
3. ✅ Supabase credentials are correct
4. ✅ RLS policies allow access
5. ✅ Check server terminal for errors

### Real-Time Updates Not Working

**Solution:**
1. Go to Supabase → **Database** → **Replication**
2. Enable Realtime for:
   - `jobs` table
   - `well_reports` table
3. Check browser console for connection errors
4. Verify RLS allows subscriptions

---

## 📱 PWA Issues

### PWA Not Installing

**Causes:**
- Missing icons
- Not using HTTPS (localhost is okay for dev)
- Service worker not registered

**Solution:**
1. Verify icons exist: `public/icon-192x192.png` and `public/icon-512x512.png`
2. Check `public/manifest.json` is valid
3. Use Chrome/Edge for best PWA support
4. Check DevTools → Application → Service Workers

### Offline Mode Not Working

**Solution:**
1. Verify Supabase client is configured for offline
2. Check service worker is registered
3. Test in Chrome DevTools → Network → Offline
4. Verify PWA is installed (not just in browser)

### Can't Access PWA from Mobile Device

**Solution:**
1. Find your computer's IP address:
   ```powershell
   ipconfig
   # Look for IPv4 Address
   ```
2. Make sure phone is on same WiFi network
3. Open `http://[your-ip]:3001` on phone
4. Check Windows Firewall isn't blocking port 3001

---

## 🎨 UI Issues

### Photo Grid Not Showing

**Causes:**
- JavaScript error preventing initialization
- DOM not ready when script runs
- Element not found

**Solution:**
1. Check browser console (F12) for errors
2. Verify `photoGrid` element exists in HTML
3. Try running `window.forceInitialize()` in console
4. Hard refresh page (Ctrl+Shift+R)

### Flow Test Intervals Not Showing

**Causes:**
- `addFlowRow` function not available
- Table body not initialized
- JavaScript error

**Solution:**
1. Check console for errors
2. Verify `flowTableBody` element exists
3. Try running `window.forceInitialize()` in console
4. Check `initFlowTable()` is being called

### Recommendations Editor Not Showing

**Causes:**
- Quill library not loaded
- Element not found
- JavaScript error

**Solution:**
1. Check console for Quill errors
2. Verify `recommendations-editor` element exists
3. Check Quill CDN is loading: `https://cdn.quilljs.com/1.3.6/quill.js`
4. Try running `initQuillEditor()` in console

---

## 🔧 Code Issues

### "Identifier 'X' has already been declared"

**Cause:** Duplicate variable/function declarations

**Solution:**
- Check for duplicate function definitions
- Remove redundant code
- Check file for syntax errors

### "Cannot read property 'X' of undefined"

**Cause:** Trying to access property on undefined object

**Solution:**
1. Add null checks: `if (obj && obj.property)`
2. Use optional chaining: `obj?.property`
3. Check object is initialized before use

### Functions Not Available Globally

**Cause:** Functions defined inside async IIFE or wrong scope

**Solution:**
- Move functions to global scope
- Use `window.functionName = function() {}`
- Ensure functions are defined before they're called

---

## 📋 Quick Diagnostic Commands

### Check if Servers Are Running

```powershell
# Express server
Test-NetConnection -ComputerName localhost -Port 3003

# Next.js server
Test-NetConnection -ComputerName localhost -Port 3001
```

### Check What's Using a Port

```powershell
netstat -ano | findstr ":3003"
```

### Kill Process by PID

```powershell
taskkill /PID <process_id> /F
```

### Test Supabase Connection

Run in browser console on PWA:
```javascript
const { data, error } = await supabase.from('jobs').select('count');
console.log('Connection:', error ? 'Failed' : 'Success', data);
```

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for JavaScript errors
2. **Check server terminal** for backend errors
3. **Verify all setup steps** in [SETUP.md](./SETUP.md) are complete
4. **Check Supabase dashboard** for database errors
5. **Review recent changes** - what was last modified?

---

## 📞 Common Error Messages

| Error | Solution |
|-------|----------|
| `ERR_CONNECTION_REFUSED` | Start the server |
| `supabaseUrl is required` | Check `.env.local` |
| `new row violates RLS` | Run RLS policies SQL |
| `Bucket not found` | Create storage bucket |
| `Permission denied` | Check storage policies |
| `Module not found` | Run `npm install` |
| `Port already in use` | Kill process or use different port |

---

## ✅ Prevention Tips

1. **Always backup** before making changes
2. **Test in development** before production
3. **Check console** regularly for warnings
4. **Keep dependencies updated**: `npm update`
5. **Document custom changes** you make
