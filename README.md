# The Daily Matrix - Image Hosting for Twitter/X

Upload an image → get a URL → paste in tweet → Twitter shows image as link preview.

## Setup Cloudinary (Required for Production)

1. Sign up for free at [cloudinary.com](https://cloudinary.com)
2. Get your **CLOUDINARY_URL** from the dashboard (looks like: `cloudinary://key:secret@cloud_name`)
3. Add it as an environment variable in Railway

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo" → select your repo
4. Go to your project → "Variables" tab → add:
   ```
   BASE_URL=https://thedailymatrix.com
   CLOUDINARY_URL=cloudinary://your_key:your_secret@your_cloud_name
   ```
   (or use the Railway-provided domain like `https://yourapp.up.railway.app`)
5. Railway auto-detects Node.js and runs `npm start`
6. Add your custom domain in Settings if needed

## Deploy to Render

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) and sign in with GitHub
3. Click "New" → "Web Service" → connect your repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables:
   ```
   BASE_URL=https://thedailymatrix.com
   CLOUDINARY_URL=cloudinary://your_key:your_secret@your_cloud_name
   ```
6. Click "Create Web Service"
7. Add custom domain in Settings if needed

## Local Testing

```bash
npm install
BASE_URL=http://localhost:3000 npm start
```

Then open http://localhost:3000
