# Add Service Role Key to .env.local

## Why?
The Express server needs the **Service Role Key** to bypass Row Level Security (RLS) when creating/updating jobs. The anon key requires user authentication, which the server doesn't have.

## Steps:

1. **Go to Supabase Dashboard**
   - Open your project: https://supabase.com/dashboard
   - Go to **Settings** → **API**

2. **Copy the Service Role Key**
   - Find the **"service_role" secret** key (NOT the anon key)
   - Click the eye icon to reveal it
   - Copy the entire key

3. **Add to .env.local**
   - Open `.env.local` in your project root
   - Add this line:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   - Replace `your_service_role_key_here` with the actual key you copied
   - **IMPORTANT**: Never commit this key to git! It has full database access.

4. **Restart Express Server**
   - Stop the server (Ctrl+C)
   - Run `npm start` again
   - You should see: `Using SERVICE_ROLE_KEY - RLS will be bypassed`

## Security Note
The service role key has **full access** to your database and bypasses all RLS policies. Only use it on the server-side (Express), never in client-side code (PWA).

## Current .env.local should have:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # <-- ADD THIS
```
