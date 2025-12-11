# 👶 Baby Steps: Deploy Express Backend to Vercel

Follow these steps **one at a time**. Don't move to the next step until the current one is done!

---

## ✅ Step 1: Update API Base URL

**What:** Change `api.js` to use relative URLs instead of `localhost:3003`

**How:**
1. Open `api.js` in your editor
2. Find line 2: `const API_BASE_URL = 'http://localhost:3003/api';`
3. Change it to: `const API_BASE_URL = '/api';`
4. Save the file

**Why:** This makes it work on Vercel (no localhost needed)

---

## ✅ Step 2: Create Public Folder Structure

**What:** Make sure the `public` folder is ready

**How:**
1. The `public` folder already exists (it has `manifest.json` in it)
2. That's it! ✅

---

## ✅ Step 3: Move HTML Files to Public Folder

**What:** Move all your HTML files to the `public` folder so Vercel can serve them

**How:**
1. **Move these files** from root to `public/` folder:
   - `admin-*.html` (all 9 admin files)
   - `index.html`
   - `find-my-report.html`
   - Any other HTML files you want on the website

2. **Keep these in root** (don't move):
   - `next.config.js`
   - `package.json`
   - `server.js` (we're not using this on Vercel)
   - `vercel.json`
   - All folders: `app/`, `components/`, `lib/`, etc.

**Tip:** You can drag and drop in your file explorer, or use these commands:

```powershell
# Move admin HTML files
Move-Item admin-*.html public/

# Move other HTML files
Move-Item index.html public/
Move-Item find-my-report.html public/
```

---

## ✅ Step 4: Move Static Assets to Public

**What:** Move CSS, JS, and image files that HTML files need

**How:**
1. **Move `api.js`** to `public/` folder:
   ```powershell
   Move-Item api.js public/
   ```

2. **Move `style.css`** to `public/` folder:
   ```powershell
   Move-Item style.css public/
   ```

3. **Move `script.js`** to `public/` folder (if it exists):
   ```powershell
   Move-Item script.js public/
   ```

4. **Move `images` folder** to `public/` folder:
   ```powershell
   Move-Item images public/
   ```

5. **Move `js` folder** to `public/` folder (if it exists):
   ```powershell
   Move-Item js public/
   ```

**Why:** HTML files reference these files, so they need to be in the same place

---

## ✅ Step 5: Update HTML File Paths (if needed)

**What:** Check if HTML files reference files correctly

**How:**
1. Open one of your admin HTML files (like `public/admin-dashboard.html`)
2. Look for references like:
   - `<script src="api.js">` ✅ (this is fine - same folder)
   - `<link href="style.css">` ✅ (this is fine - same folder)
   - `<img src="images/...">` ✅ (this is fine - same folder)

3. If you see paths like `../api.js` or `./api.js`, that's also fine!

**Most likely:** Everything will work as-is since files are in the same folder now!

---

## ✅ Step 6: Test Locally (Optional but Recommended)

**What:** Make sure everything still works before deploying

**How:**
1. Start your Next.js dev server:
   ```powershell
   npm run next:dev
   ```

2. Open `http://localhost:3000/admin-dashboard.html` in your browser

3. Check the browser console (F12) for any errors

4. Try clicking around - does the admin dashboard load?

**Note:** The API won't work on localhost:3000 yet (it needs Vercel), but the pages should load!

---

## ✅ Step 7: Commit and Push

**What:** Save all your changes and push to GitHub

**How:**
1. Check what changed:
   ```powershell
   git status
   ```

2. Add all changes:
   ```powershell
   git add -A
   ```

3. Commit:
   ```powershell
   git commit -m "Move HTML files to public and update API URLs for Vercel"
   ```

4. Push:
   ```powershell
   git push origin main
   ```

---

## ✅ Step 8: Wait for Vercel to Deploy

**What:** Vercel will automatically deploy your changes

**How:**
1. Go to your Vercel dashboard
2. You should see a new deployment starting
3. Wait 2-5 minutes
4. When it says "Ready" ✅, click on it

---

## ✅ Step 9: Test Your Live Site

**What:** Make sure everything works on Vercel

**How:**
1. Your site will be at: `https://your-project.vercel.app`

2. Try these URLs:
   - `https://your-project.vercel.app/admin-dashboard.html`
   - `https://your-project.vercel.app/admin-login.html`
   - `https://your-project.vercel.app/find-my-report.html`
   - `https://your-project.vercel.app/field-tech` (Next.js PWA)

3. Open browser console (F12) and check for errors

4. Try using the admin dashboard - does it load jobs? Can you create a job?

---

## 🎉 Done!

If everything works, you're all set! Both your Next.js PWA and Express backend are now on Vercel.

---

## 🆘 If Something Breaks

**Problem:** Pages don't load
- **Fix:** Check that files are in `public/` folder
- **Fix:** Check browser console for 404 errors

**Problem:** API calls fail
- **Fix:** Make sure `api.js` has `API_BASE_URL = '/api'` (not localhost)
- **Fix:** Check Vercel logs for API errors

**Problem:** Images don't show
- **Fix:** Make sure `images/` folder is in `public/` folder
- **Fix:** Check image paths in HTML files

---

## 📝 Summary Checklist

- [ ] Updated `api.js` to use `/api` instead of `localhost:3003`
- [ ] Moved all HTML files to `public/` folder
- [ ] Moved `api.js` to `public/` folder
- [ ] Moved `style.css` to `public/` folder
- [ ] Moved `images/` folder to `public/` folder
- [ ] Moved other static files (js/, script.js, etc.) to `public/`
- [ ] Committed and pushed to GitHub
- [ ] Checked Vercel deployment
- [ ] Tested live site

---

**Ready? Start with Step 1!** 🚀

