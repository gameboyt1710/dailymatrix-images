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
5. Add environment variables in your service's **"Variables"** tab:
   ```
   BASE_URL=https://thedailymatrix.com
   ADMIN_PASSWORD=your_secure_password_here
   ```
6. Railway will auto-redeploy
7. Add your custom domain in **Settings → Networking** if needed

## Admin Panel - Artist Rebellion List

Users can submit their Twitter handles to join the "rebellion list" (artist spotlight waterfall). You need to manually approve submissions.

### Access the Admin Panel

1. Go to `https://thedailymatrix.com/admin`
2. Enter your `ADMIN_PASSWORD` when prompted (set in Railway environment variables)
3. Review pending submissions
4. Click "✅ Approve" to add artists to the spotlight
5. When you approve someone, check your Railway logs - it will print:
   ```
   ✅ APPROVED: @username - Add this to ARTIST_SPOTLIGHTS array!
   ```
6. Manually add the approved handle to the `ARTIST_SPOTLIGHTS` array in `server.js` (lines 14-25)
7. Push to GitHub to redeploy with the new artist in the waterfall

**Note:** The approval system stores submissions in the database, but the waterfall still uses the hardcoded `ARTIST_SPOTLIGHTS` array. This gives you control over who appears on the site.

## Local Testing (no database needed)

```bash
npm install
BASE_URL=http://localhost:3000 npm start
```

Then open http://localhost:3000

(Without DATABASE_URL, it will fail on upload - database is required)
