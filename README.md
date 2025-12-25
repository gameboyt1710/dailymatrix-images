# The Daily Matrix - Image Hosting for Twitter/X

Upload an image → get a URL → paste in tweet → Twitter shows image as link preview.

## Deploy to Railway (with persistent storage)

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo" → select your repo
4. **Add a Volume for persistent storage:**
   - Click on your service
   - Go to **"Settings"** tab
   - Scroll down to **"Volumes"** section
   - Click **"+ New Volume"**
   - Mount Path: `/data`
   - Click **"Add"**
5. Add environment variables in **"Variables"** tab:
   ```
   BASE_URL=https://thedailymatrix.com
   STORAGE_PATH=/data
   ```
6. Railway will redeploy automatically
7. Add your custom domain in **Settings → Networking** if needed

## Deploy to Render (with persistent disk)

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) and sign in with GitHub
3. Click "New" → "Web Service" → connect your repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add a Disk for persistent storage:**
   - Scroll to **"Disks"** section
   - Click **"Add Disk"**
   - Name: `storage`
   - Mount Path: `/data`
   - Size: 1GB (free tier)
6. Add environment variables:
   ```
   BASE_URL=https://thedailymatrix.com
   STORAGE_PATH=/data
   ```
7. Click "Create Web Service"

## Local Testing

```bash
npm install
BASE_URL=http://localhost:3000 npm start
```

Then open http://localhost:3000
