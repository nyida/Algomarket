# Vercel Setup Guide – Step by Step

Follow these steps to get OpenPatch deployed on Vercel.

---

## Step 1: Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a project (or use an existing one)
3. Wait for it to finish provisioning

---

## Step 2: Supabase integration in Vercel

1. Open your Vercel project → **Settings** → **Integrations**
2. Click **Browse Marketplace**
3. Search for **Supabase** → **Add Integration**
4. Select your Vercel project and Supabase project
5. Click **Add Integration**

This should add `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, and auth vars.

---

## Step 3: Add environment variables

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add these variables (check **Production**, **Preview**, and **Build** for each):

| Name | Value | Where to get it |
|------|-------|-----------------|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` | Supabase → **Settings** → **Database** → **Connection string** → **URI** (use **Transaction** pooler, port **6543**) |
| `OPENROUTER_API_KEY` | `sk-or-...` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `ENCRYPTION_KEY` | Any 32+ character string | e.g. `openpatch-my-secret-key-32-chars` |

**Important:** For `DATABASE_URL`, replace `[password]` with your Supabase database password. Get the full URI from Supabase → Settings → Database → Connection string.

---

## Step 4: Create database tables

1. In a terminal:
   ```bash
   cd /path/to/ai
   npx vercel link
   npx vercel env pull .env.production
   ```
2. Then run:
   ```bash
   DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d= -f2-)" npx prisma db push
   ```
   Or copy `DATABASE_URL` from `.env.production` and run:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma db push
   ```

---

## Step 5: Supabase redirect URL

1. Supabase → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add: `https://openpatch.vercel.app/**`
3. Save

---

## Step 6: Redeploy

1. Vercel → **Deployments**
2. Click the ⋮ menu on the latest deployment
3. **Redeploy** (uncheck **Use existing Build Cache**)

---

## If the build still fails

1. Click the failed deployment
2. Open **Building** or **Build Logs**
3. Scroll to the bottom and find the red error line
4. Share that error message for debugging

Common issues:
- **"DATABASE_URL is missing"** → Add it manually in Step 3
- **"prisma: command not found"** → The build command may need `npx prisma`
- **Integration vars not at Build** → Manually add `DATABASE_URL` and ensure it’s available for **Build**
