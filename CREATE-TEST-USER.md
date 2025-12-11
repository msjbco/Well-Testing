# 👤 Creating a Test Technician User

You're getting a login error because there's no user account in Supabase yet. Here's how to create one:

## Option 1: Create User via Supabase Dashboard (Easiest)

### Step 1: Go to Authentication

1. In your Supabase dashboard, click **Authentication** in the left sidebar
2. Click **Users** tab

### Step 2: Create a New User

1. Click **"Add user"** or **"Create new user"** button
2. Fill in:
   - **Email**: `tech@example.com` (or any email you want)
   - **Password**: Choose a password (e.g., `password123`)
   - **Auto Confirm User**: ✅ Check this box (so you don't need to verify email)
3. Click **"Create user"**

### Step 3: Add User to Technicians Table (Optional but Recommended)

The app checks if a user is a technician. You can either:

**Option A: Add to technicians table** (Recommended)
1. Go to **Table Editor** in Supabase
2. Find the `technicians` table (or create it if it doesn't exist - see `SUPABASE_SCHEMA.sql`)
3. Click **"Insert row"**
4. Add:
   - `user_id`: Copy the user's UUID from the Authentication → Users page
   - `name`: "Test Technician" (or any name)
5. Click **"Save"**

**Option B: Set user metadata** (Alternative)
1. In Authentication → Users, click on your user
2. Go to **User Metadata** section
3. Add metadata:
   ```json
   {
     "role": "technician"
   }
   ```
   OR
   ```json
   {
     "is_technician": true
   }
   ```

### Step 4: Test Login

1. Go to your PWA login page: http://localhost:3000/login (or whatever port you're using)
2. Enter:
   - **Email**: The email you created (e.g., `tech@example.com`)
   - **Password**: The password you set
3. Click **Login**

---

## Option 2: Create User via SQL (Advanced)

If you prefer SQL, run this in the Supabase SQL Editor:

```sql
-- Create a test technician user
-- Replace 'tech@example.com' and 'your-password' with your values

-- First, create the user in auth.users (this is usually done via the dashboard)
-- Then add them to technicians table:

INSERT INTO technicians (user_id, name)
SELECT id, 'Test Technician'
FROM auth.users
WHERE email = 'tech@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

---

## Option 3: Sign Up via the App (If you add a signup page)

You could also add a signup page to your app, but for now, creating via the dashboard is easiest.

---

## Troubleshooting

### "Invalid login credentials"
- ✅ Check email is correct (case-sensitive)
- ✅ Check password is correct
- ✅ Make sure user exists in Authentication → Users
- ✅ Make sure user is confirmed (check "Auto Confirm User" when creating)

### "User is not a technician"
- ✅ Add user to `technicians` table, OR
- ✅ Set user metadata: `role: "technician"` or `is_technician: true`

### Still can't login?
1. Check browser console (F12) for errors
2. Check Supabase dashboard → Authentication → Users to see if user exists
3. Try creating a new user with a different email

---

## Quick Test Credentials

After creating a user, you can test with:
- **Email**: `tech@example.com` (or whatever you created)
- **Password**: `password123` (or whatever you set)

---

## Next Steps After Login Works

Once you can log in:
1. ✅ Test the flow entry page: `/field-tech/[jobId]/flow-entry`
2. ✅ Make sure you have a job in your `jobs` table to test with
3. ✅ Test saving flow readings
4. ✅ Test offline functionality

Need help with any of these steps? Let me know!
