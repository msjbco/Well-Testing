# 🔧 Server Troubleshooting Guide

## Current Issue: Connection Refused

If you're getting `ERR_CONNECTION_REFUSED`, the servers aren't running. Here's how to fix it:

---

## ✅ Solution 1: Start Express Server (Port 3001)

### Option A: Use PowerShell Script (Easiest)
```powershell
.\start-servers.ps1
```

### Option B: Manual Start
1. Open a **new terminal/command prompt**
2. Navigate to your project:
   ```powershell
   cd c:\Users\msjbc\Desktop\Sites\Well_Testing
   ```
3. Start the server:
   ```powershell
   npm start
   ```
   OR
   ```powershell
   node server.js
   ```

4. You should see:
   ```
   Server running on http://localhost:3001
   Data directory: C:\Users\msjbc\Desktop\Sites\Well_Testing\data
   ```

5. **Keep this terminal open** - the server runs in this window
6. Test it: Open http://localhost:3001 in your browser

---

## ✅ Solution 2: Start Next.js PWA (Port 3000)

### Important: Use a DIFFERENT terminal window!

1. Open a **second terminal/command prompt** (keep the Express server running)
2. Navigate to your project:
   ```powershell
   cd c:\Users\msjbc\Desktop\Sites\Well_Testing
   ```
3. Start Next.js:
   ```powershell
   npm run next:dev
   ```

4. You should see:
   ```
   ▲ Next.js 14.x.x
   - Local:        http://localhost:3000
   - Ready in X seconds
   ```

5. **Keep this terminal open** - Next.js runs in this window
6. Test it: Open http://localhost:3000 in your browser

---

## ❌ Common Errors & Fixes

### Error: "Cannot find module 'next'"
**Fix:** Run `npm install` to install all dependencies

### Error: "Port 3000 already in use"
**Fix:** Next.js will automatically use port 3001, 3002, etc. Check the terminal output for the actual port.

### Error: "EADDRINUSE: address already in use"
**Fix:** 
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr ":3001"
   ```
2. Kill the process or use a different port

### Error: "Module not found" or missing dependencies
**Fix:**
```powershell
npm install
```

### Error: Next.js won't start
**Possible causes:**
1. Missing `.env.local` file (not required for basic startup, but needed for Supabase)
2. TypeScript errors - check the terminal output
3. Missing `public/` directory files

**Fix:**
```powershell
# Check for errors
npm run next:dev

# If TypeScript errors, try:
npx tsc --noEmit
```

---

## 🎯 Quick Test Commands

### Test if Express server is running:
```powershell
Test-NetConnection -ComputerName localhost -Port 3001
```

### Test if Next.js is running:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

### Check what's using a port:
```powershell
netstat -ano | findstr ":3001"
```

### Kill a process by PID:
```powershell
taskkill /PID <process_id> /F
```

---

## 📋 Step-by-Step Startup Checklist

1. ✅ Open Terminal 1
   - Run: `npm start` or `node server.js`
   - Should see: "Server running on http://localhost:3001"
   - ✅ Test: http://localhost:3001 works

2. ✅ Open Terminal 2 (NEW terminal, keep Terminal 1 running)
   - Run: `npm run next:dev`
   - Should see: "Local: http://localhost:3000"
   - ✅ Test: http://localhost:3000 works

3. ✅ Both servers running?
   - Express: http://localhost:3001 ✅
   - Next.js: http://localhost:3000 ✅

---

## 🚨 Still Not Working?

### Check Node.js Installation:
```powershell
node --version
npm --version
```

Should show versions (e.g., v18.x.x, 9.x.x)

### Check if files exist:
```powershell
Test-Path server.js
Test-Path package.json
Test-Path app
```

### Reinstall dependencies:
```powershell
rm -r node_modules
npm install
```

### Check for syntax errors:
```powershell
node -c server.js
```

---

## 💡 Pro Tips

1. **Always use separate terminal windows** for each server
2. **Don't close the terminal** - the server runs in that window
3. **Check the terminal output** - errors will show there
4. **Use the PowerShell script** (`start-servers.ps1`) to start both at once

---

## 📞 Need More Help?

Check the terminal output for specific error messages. Common issues:
- Missing dependencies → `npm install`
- Port conflicts → Use different ports
- Syntax errors → Check the error message in terminal
- Missing files → Verify all files are in place
