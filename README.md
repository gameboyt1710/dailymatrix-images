# The Daily Matrix - Image Hosting for Twitter/X

Upload an image → get a URL → paste in tweet → Twitter shows image as link preview.

## Deploy to Railway (with PostgreSQL)

1. Push this folder to a GitHub repo
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo" → select your repo
4. **Add PostgreSQL database:**
   - In your project, click **"+ New"**
   - Select **"Database"** → **"Add PostgreSQL"**
   - Railway will auto-create a `DATABASE_URL` variable
5. Add environment variable in your service's **"Variables"** tab:
   ```
   BASE_URL=https://thedailymatrix.com
   ```
6. Railway will auto-redeploy
7. Add your custom domain in **Settings → Networking** if needed

## Local Testing (no database needed)

```bash
npm install
BASE_URL=http://localhost:3000 npm start
```

Then open http://localhost:3000

(Without DATABASE_URL, it will fail on upload - database is required)
