# 🚀 How to Run Both Servers

You have two servers:
1. **Main Site (Express)** - Port 3003 - Your admin/website
2. **PWA Site (Next.js)** - Port 3001 - Field technician app

## ✅ Quick Start

### Option 1: Two Terminal Windows (Easiest)

**Terminal 1 - Main Site (Express):**
```powershell
npm start
```
This will run on `http://localhost:3003`

**Terminal 2 - PWA Site (Next.js):**
```powershell
npm run next:dev
```
This will run on `http://localhost:3001`

---

### Option 2: One Terminal (Background Process)

**Start Express server in background:**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"
```

**Then start Next.js:**
```powershell
npm run next:dev
```

---

## 📍 URLs

- **Main Site:** http://localhost:3003
- **PWA Site:** http://localhost:3001/login

---

## 🛑 To Stop Servers

- Press `Ctrl+C` in each terminal window
- Or close the terminal windows

---

That's it! Both sites will run simultaneously.
