# Fix 404 on Vercel – use static output

The build succeeds but the site 404s because Vercel is using the **Next.js** pipeline instead of serving the static **`out`** folder.

Do this **in the Vercel dashboard** (one time):

1. Open your project → **Settings** → **General**.
2. Under **Build & Development Settings**:
   - **Framework Preset:** change from **Next.js** to **Other**.
   - **Build Command:** `npm run build` (keep as is).
   - **Output Directory:** set to **`out`** (this is required).
   - **Root Directory:** `wrestlingpath` (if your app is in that subfolder).
3. **Save**.
4. Go to **Deployments** → **…** on the latest → **Redeploy**.

After redeploy, Vercel will run `npm run build`, then serve the contents of **`out`** (including `index.html` at `/`), and the 404 should go away.

Also ensure the repo you deploy (e.g. **Tencide/ncaawrestling**) has the latest `vercel.json` with `"outputDirectory": "out"` and push if needed.
