# OpenPatch Vercel Setup – Very Clear Steps

Do these steps **in order**. Do not skip any step.

---

## PART 1: Get Your Database Connection String from Supabase

### Step 1.1: Open Supabase
- Go to: **https://supabase.com/dashboard**
- Log in
- Click on your project: **OpenPatch**

### Step 1.2: Go to Database Settings
- On the **left sidebar**, click the **gear icon** (⚙️) at the bottom
- This opens **Project Settings**
- Click **Database** in the left menu (under Project Settings)

### Step 1.3: Find the Connection String
- Scroll down until you see a section called **Connection string**
- You will see a box with text like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

### Step 1.4: Switch to Transaction Pooler (IMPORTANT)
- Look for a **dropdown** or **tabs** that say: **Direct** / **Session** / **Transaction**
- Click **Transaction** (or **Transaction pooler**)
- The connection string will change. The new one will have:
  - `pooler.supabase.com` in it (not `db.`)
  - Port **6543** (not 5432)

### Step 1.5: Copy the String and Add Your Password
- Click the **copy** button next to the connection string
- The string has `[YOUR-PASSWORD]` in it
- **Replace** `[YOUR-PASSWORD]` with your actual database password
- If you don't know your password: on the same page, click **Reset database password**, set a new one, then use that
- Example of what the final string looks like:
  ```
  postgresql://postgres.iirwmudxpzvopkzcrvtm:MyActualPassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  ```
- **Save this string somewhere** – you need it for the next part

---

## PART 2: Add Environment Variables to Vercel

### Step 2.1: Open Vercel
- Go to: **https://vercel.com/dashboard**
- Click on your project: **openpatch**

### Step 2.2: Go to Environment Variables
- Click **Settings** (top menu)
- In the left sidebar, click **Environment Variables**

### Step 2.3: Add DATABASE_URL
- Click the button: **Add New** (or **Add**)
- **Key** (or Name): type exactly: `DATABASE_URL`
- **Value**: paste the connection string you saved in Step 1.5 (the one with your real password)
- Under **Environments**, check **all three boxes**:
  - ✅ Production
  - ✅ Preview  
  - ✅ Development
- Click **Save**

### Step 2.4: Add OPENROUTER_API_KEY
- Click **Add New** again
- **Key**: type exactly: `OPENROUTER_API_KEY`
- **Value**: your key from https://openrouter.ai/keys (starts with `sk-or-`)
- Check **all three** environment boxes
- Click **Save**

### Step 2.5: Add ENCRYPTION_KEY
- Click **Add New** again
- **Key**: type exactly: `ENCRYPTION_KEY`
- **Value**: any random string that is **at least 32 characters**  
  Example: `openpatch-secret-key-32-chars-minimum`
- Check **all three** environment boxes
- Click **Save**

---

## PART 3: Create the Database Tables

### Step 3.1: Open Terminal
- Open Terminal (on Mac) or Command Prompt (on Windows)
- Go to your project folder:
  ```
  cd /Users/nyidagyal/Desktop/ai
  ```

### Step 3.2: Pull Vercel's Environment Variables (Optional but helpful)
- Run: `npx vercel env pull .env.production`
- If it asks to log in, follow the prompts
- If it asks which project, select **openpatch**

### Step 3.3: Push the Database Schema
- Run: `npx prisma db push`
- If it says DATABASE_URL is missing, run this instead (replace with YOUR connection string):
  ```
  DATABASE_URL="postgresql://postgres.iirwmudxpzvopkzcrvtm:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres" npx prisma db push
  ```
- You should see: **"Your database is now in sync with your schema"**

---

## PART 4: Add Redirect URL in Supabase

### Step 4.1: Go Back to Supabase
- Go to: **https://supabase.com/dashboard**
- Click your project: **OpenPatch**

### Step 4.2: Open Authentication Settings
- On the left sidebar, click **Authentication**
- Click **URL Configuration**

### Step 4.3: Add the Redirect URL
- Find the box: **Redirect URLs**
- Click **Add URL**
- Type exactly: `https://openpatch.vercel.app/**`
- Click **Save**

---

## PART 5: Redeploy on Vercel

### Step 5.1: Go to Deployments
- Go to: **https://vercel.com**
- Click your project: **openpatch**
- Click **Deployments** (top menu)

### Step 5.2: Redeploy
- Find the **latest** deployment (top of the list)
- Click the **three dots** (⋮) on the right side of that row
- Click **Redeploy**
- **Uncheck** the box that says "Use existing Build Cache"
- Click **Redeploy**

### Step 5.3: Wait
- Wait 2–3 minutes for the build to finish
- When it says **Ready** (green), you're done

---

## DONE

- Your app is at: **https://openpatch.vercel.app**
- Go to **https://openpatch.vercel.app/setup** to verify everything is configured
- Then go to **https://openpatch.vercel.app** to use the app

---

## If Something Fails

**Build still fails?**
1. Click the failed deployment
2. Click **Building** or **View Function Logs**
3. Scroll to the bottom
4. Copy the **red error message**
5. Share it so we can fix it

**Can't find Transaction pooler?**
- Use the Direct connection string instead (port 5432)
- It might still work

**Prisma says "can't reach database"?**
- Check that your password has no special characters that need escaping
- Try resetting your database password in Supabase and use the new one
