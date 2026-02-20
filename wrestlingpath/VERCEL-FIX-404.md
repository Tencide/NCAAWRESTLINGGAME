# Fix 404 on Vercel – checklist

The build succeeds but the site 404s. Do **all** of the following, then redeploy.

## 1. Vercel dashboard (Project → Settings → General)

Under **Build & Development Settings**, set exactly:

| Setting | Value |
|--------|--------|
| **Framework Preset** | **Other** (not Next.js) |
| **Build Command** | `npm run build` |
| **Output Directory** | `out` |
| **Root Directory** | `wrestlingpath` (if your repo has the app in that folder; leave blank if the repo root is the app) |

Click **Save**.

## 2. Root Directory

- If your repo has a **wrestlingpath** folder (and package.json is inside it), Root Directory = **wrestlingpath**.
- If your repo root **is** the Next.js app (package.json at root), leave Root Directory **blank**.

## 3. Redeploy

**Deployments** → **…** on the latest deployment → **Redeploy** (don’t “Use existing Build Cache” if you can uncheck it).

## 4. Repo has the latest code

Ensure the repo Vercel deploys from has:

- **vercel.json** with `"outputDirectory": "out"` and `"rewrites"` (so `/` and unknown paths serve `index.html`).
- Push any local changes and let Vercel redeploy from the new commit.

If it still 404s, open the latest deployment → **Building** log and confirm the build runs from the correct directory and that the **Deploying** step mentions the `out` output. Share that log if needed.
