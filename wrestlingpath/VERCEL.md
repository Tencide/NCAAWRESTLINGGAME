# Deploy to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with **GitHub**.
2. Click **Add New…** → **Project**.
3. **Import** the repo **Tencide/NCAA-WRESTLING-GAME**.
4. **Important:** Set **Root Directory** to **`wrestlingpath`** (click Edit next to it, enter `wrestlingpath`, confirm). If you leave this blank, the build will fail or you’ll get 404.
5. Leave **Build Command** as `npm run build`. Leave **Output Directory** blank (Next.js static export uses `out` automatically).
6. Click **Deploy**.

Your app will be at `https://your-project.vercel.app`. No `BASE_PATH` is needed on Vercel.

## If you get 404 NOT_FOUND

- In the Vercel dashboard, open your project → **Settings** → **General**.
- Under **Root Directory**, confirm it is **`wrestlingpath`** (not blank). Save if you change it.
- Go to **Deployments**, open the latest deployment, and check the **Building** log. The build must finish successfully and produce the `out` folder from the `wrestlingpath` directory.
- After fixing Root Directory, trigger a new deploy: **Deployments** → **…** on the latest → **Redeploy**.
