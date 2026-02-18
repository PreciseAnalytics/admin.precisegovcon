# Vercel Deployment Debug Guide

## If You're Seeing Vercel Errors

Follow this step-by-step guide to identify and fix the issue.

---

## Step 1: Get the Error Message

1. Go to https://vercel.com/dashboard
2. Find your project: `precisegovcon-admin-portal`
3. Click on the failed deployment
4. Scroll down to "Build logs"
5. **Copy the complete error message** and paste it here

**Example error to look for:**
```
Error: Could not find required environment variable...
failed to compile
cannot find module...
```

---

## Step 2: Categorize the Error

Once you have the error message, it usually falls into one of these categories:

### A. Environment Variable Error
**Looks like**: `Could not find required environment variable "DATABASE_URL"`
**Fix**:
```
1. Go to Vercel Project Settings
2. Click "Environment Variables"
3. Add/verify these variables:
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
```

### B. Build Compilation Error
**Looks like**: `Expected `;` but found something else` or `Type 'X' is not assignable`
**Fix**:
```bash
# Run locally to reproduce
npm install
npm run build

# Look at the specific line numbers in error
# Should not happen with current code
```

### C. Database Connection Error
**Looks like**: `ECONNREFUSED` or `ENOTFOUND` with database
**Fix**:
```
1. Verify DATABASE_URL is correct in .env
2. Ensure database allows Vercel IP range
3. Check if database is running
4. Use production database, not local
```

### D. Missing Dependency Error
**Looks like**: `Cannot find module 'some-package'`
**Fix**:
```bash
# The package should be installed, but if not:
npm install <missing-package>
npm run build
git add package-lock.json
git commit -m "Add missing dependency"
git push
```

### E. Memory/Timeout Error
**Looks like**: `Build has timed out` or `JavaScript heap out of memory`
**Fix**:
```
Usually means infinite loop in code.
Check for:
- Circular dependencies
- Infinite loops in static generation
- Large data operations
```

---

## Step 3: Reproduce Locally

This is the most reliable way to debug:

```bash
# 1. Clone/pull latest code
cd ~/precisegovcon-admin-portal

# 2. Install dependencies
npm install

# 3. Create/verify .env file with production values
# DO NOT commit .env file
cp .env.example .env  # if .env.example exists
# Edit .env with your values

# 4. Try the same build Vercel runs
npm run build

# 5. If build succeeds, start the app
npm start

# 6. Test in browser
# Navigate to http://localhost:3000
# Try login, user creation, filtering, etc.
```

---

## Step 4: Check Environment Variables

### Required Variables
```
DATABASE_URL=postgresql://user:pass@host/dbname
NEXTAUTH_SECRET=<32+ character random string>
NEXTAUTH_URL=https://yourdomain.vercel.app
```

### Generate a NEXTAUTH_SECRET
```bash
# On Mac/Linux:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | Cut -c1-32
```

### Verify Variables in Vercel
```
1. Go to Vercel Dashboard
2. Select your project
3. Click "Settings"
4. Click "Environment Variables"
5. Verify each variable is there
6. Click "Redeploy" to trigger new build with new vars
```

---

## Step 5: Check Vercel Logs in Real-Time

If the build is still running:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Watch build logs
vercel logs <project-url> --follow
```

---

## Common Specific Errors & Fixes

### Error: `missing DATABASE_URL`
```bash
# Fix:
1. Go to Vercel Settings > Environment Variables
2. Add DATABASE_URL
3. Set it to your PRODUCTION database (not local)
4. Click "Redeploy" on the deployment
```

### Error: `ENOTFOUND database.example.com`
```
Your DATABASE_URL points to a server that:
- Doesn't exist
- Is not accessible from Vercel's servers
- Has wrong hostname

Solution:
- Use a cloud-hosted database (AWS RDS, Heroku Postgres, etc)
- Ensure database allows external connections
- Whitelist Vercel IP range if needed
```

### Error: `Cannot find module '@prisma/client'`
```bash
# Fix locally:
npm install @prisma/client prisma
npm run build

# Then commit and push:
git add package-lock.json
git commit -m "Ensure Prisma dependencies"
git push
```

### Error: `TypeScript error in [filename]`
```bash
# Check locally:
npm run build

# Fix the TypeScript error shown
# Commit and push:
git add .
git commit -m "Fix TypeScript error"
git push
```

---

## Step 6: Verify Deployment

Once deployment succeeds:

### 1. Check Site is Live
```
https://your-project.vercel.app
Should show: Login page with logo and "Precise Govcon Admin Portal"
```

### 2. Test Login
```
Use your test credentials to login
Should see: Dashboard with metrics and navigation
```

### 3. Check Console for Errors
```
1. Open DevTools (F12 or Cmd+Option+I)
2. Click "Console" tab
3. Look for red errors
4. Common non-breaking warnings are OK
```

### 4. Test Key Features
```
- Create a user
- Filter users by tier
- Filter users by status
- Switch view modes (Grid/List)
- Check icons display correctly
```

---

## Step 7: If Still Broken

### Option A: Check Git History
```bash
# See recent changes
git log --oneline -20

# If a recent commit broke it, revert
git revert <commit-hash>
git push
```

### Option B: Check GitHub/Vercel Integration
```
1. Go to Vercel Dashboard
2. Click "Settings"
3. Click "Git"
4. Verify GitHub repo is connected
5. Check "Automatic deployments" is enabled
```

### Option C: Manual Redeploy
```bash
# Using Vercel CLI
vercel --prod

# Or just push to main branch
git push origin main
```

---

## Step 8: Contact Support

If you're still stuck, provide:

1. **Error Message** (copy from Vercel logs)
2. **Steps to Reproduce** (what you were doing)
3. **Recent Changes** (git log output)
4. **Environment Variables** (just the names, not values)

Example:
```
Error: ECONNREFUSED database connection
Steps: Pushed changes, triggered deployment
Recent: Updated subscriptions/stats/route.ts
Vars: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
```

---

## Quick Reference: Common Fixes

| Problem | Solution |
|---------|----------|
| Build fails with no message | Go to Vercel, click deployment, scroll down for logs |
| Missing environment variable | Add to Vercel Settings > Environment Variables |
| Database connection error | Verify DATABASE_URL points to cloud database |
| TypeScript errors | Run `npm run build` locally to see exact errors |
| 404 on pages | Check routes exist and aren't using wrong layout |
| Blank page | Check browser console for JavaScript errors |
| Slow load | Check bundle size in build output |
| Builds keep failing | Check `.env` is in `.gitignore` (should not be committed) |

---

## Files to Reference

- **Build config**: `next.config.js` or `next.config.mjs`
- **Package deps**: `package.json` and `package-lock.json`
- **TypeScript**: `tsconfig.json`
- **Database**: `.env` (NOT in git)
- **Prisma**: `prisma/schema.prisma`
- **API routes**: `app/api/**`
- **Pages**: `app/dashboard/**`

---

## Success Indicators

When deployment is working:
- ✅ Vercel shows green checkmark
- ✅ Site loads at your Vercel URL
- ✅ Login page displays correctly
- ✅ Can create test user
- ✅ Can login with test user
- ✅ Dashboard metrics display
- ✅ No red errors in console
- ✅ Features work (filtering, etc.)

---

## Next Steps After Successful Deployment

Once deployment is working:
1. Test all features thoroughly
2. Monitor error rates in Vercel Analytics
3. Continue with Phase 1: CSV Export features
4. Keep git history clean with good commit messages

Good luck! 🚀
