# GymCentric Live Deployment Guide (Both Frontend + Backend on Vercel)

Your database (**MongoDB Atlas**) is already set up. Everything is configured so you can deploy **both Frontend + Backend together on Vercel** with 1 single deployment!

---

## Deploy Frontend + Backend Together on Vercel (100% Free)

1. **Allow Vercel IPs in MongoDB Atlas**:
   - In **MongoDB Atlas → Security → Network Access**, make sure `0.0.0.0/0` is **Active**.

2. **Push Code to GitHub** from the root `gym/` folder:
   ```powershell
   git init
   git add .
   git commit -m "GymCentric unified Vercel build"
   ```
   *(Your `backend/.env` and `node_modules/` are safely ignored by `.gitignore`.)*

3. **Import on [vercel.com](https://vercel.com)**:
   - Click **Add New Project** → select your GitHub repository.
   - **Root Directory:** leave as `.` (the root `gym/` folder — `vercel.json` handles both `/frontend/dist` and `/api/*` automatically!).
   - **Add Environment Variables** in Vercel Project Settings:
     - `NODE_ENV` = `production`
     - `MONGO_URI` = your Atlas URI from `backend/.env`
     - `JWT_SECRET` = any long random secret string
     - `JWT_EXPIRES_IN` = `30d`
   - Click **Deploy**!

4. **Test Live**:
   - Open `https://<your-project>.vercel.app` → both the React UI and `/api/dashboard` + `/api/auth` run on the same Vercel URL!
   - You can also verify `https://<your-project>.vercel.app/api/health`.
   - MongoDB Atlas TTL indexes continue auto-deleting 1-year old `payments`/`saaspayments` and month-end `gymledgerentries` automatically.
