const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://thedailymatrix.com';

// Artist Spotlights - Update these to feature different artists!
const ARTIST_SPOTLIGHTS = [
  {
    handle: '@shinypants1710',
    link: 'https://twitter.com/shinypants1710'
  },
  // Add more artists here - just add their @handle and Twitter link
];

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please add a PostgreSQL database in Railway:');
  console.error('1. Click "+ New" in your Railway project');
  console.error('2. Select "Database" → "Add PostgreSQL"');
  console.error('3. Railway will automatically set DATABASE_URL');
  process.exit(1);
}

// PostgreSQL connection (Railway auto-provides DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Initialize database table
async function initDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS images (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            data BYTEA NOT NULL,
            mimetype TEXT NOT NULL,
            card_size TEXT DEFAULT 'large',
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        // Add card_size column if it doesn't exist (for existing tables)
        await client.query(`
          ALTER TABLE images 
          ADD COLUMN IF NOT EXISTS card_size TEXT DEFAULT 'large'
        `);
        
        console.log('✅ Database initialized successfully');
        return;
      } finally {
        client.release();
      }
    } catch (err) {
      retries--;
      console.error(`❌ Database init error (${5 - retries}/5):`, err.message);
      if (retries === 0) {
        console.error('Failed to connect to database after 5 attempts');
        console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
    }
  }
}

initDB();

// Use memory storage for multer (we'll store in DB)
const storage = multer.memoryStorage();

// Generate a random ID
function generateId(length = 8) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Allowed image extensions and MIME types
const ALLOWED_TYPES = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/webp': 'image/webp'
};

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, and WebP are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Serve static preview image
app.use(express.static(path.join(__dirname, 'public')));

// GET / - Upload form
app.get('/', (req, res) => {
  // Generate artist spotlight HTML
  const artistSpotlightHTML = ARTIST_SPOTLIGHTS.length > 0 ? `
  <div class="artist-spotlight">
    <h2>Featured Artists</h2>
    <div class="artist-links">
      ${ARTIST_SPOTLIGHTS.map(artist => `
        <a href="${artist.link}" target="_blank" rel="noopener noreferrer" class="artist-handle">${artist.handle}</a>
      `).join('')}
    </div>
  </div>
  ` : '';

  // Generate infinite scrolling waterfall on the sides
  // Repeat the list enough times to ensure continuous scrolling
  const repeatCount = 8;
  const repeatedArtists = Array(repeatCount).fill(ARTIST_SPOTLIGHTS).flat();
  
  const floatingHTML = ARTIST_SPOTLIGHTS.length > 0 
    ? `
    <div class="artist-waterfall left">
      ${repeatedArtists.map((artist, i) => {
        const offset = Math.random() * 250; // Random offset between 0 and 300px
        const verticalGap = 30 + Math.random() * 40; // Random gap between 40-90px
        return `
        <a href="${artist.link}" target="_blank" rel="noopener noreferrer" 
           style="transform: translateX(${offset}px); margin-bottom: ${verticalGap}px">${artist.handle}</a>
      `;
      }).join('')}
    </div>
    <div class="artist-waterfall right">
      ${repeatedArtists.map((artist, i) => {
        const offset = Math.random() * 250; // Random offset between 0 and 150px
        const verticalGap = 30 + Math.random() * 40; // Random gap between 20-60px
        return `
        <a href="${artist.link}" target="_blank" rel="noopener noreferrer" 
           style="transform: translateX(-${offset}px); margin-bottom: ${verticalGap}px">${artist.handle}</a>
      `;
      }).join('')}
    </div>
    `
    : '';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Upload for X/Twitter - Protect Your Art from Grok AI</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${BASE_URL}/">
  <meta property="og:title" content="Protect Your Art from Grok AI">
  <meta property="og:description" content="Upload images and share them on X/Twitter without Grok's edit feature. Your art stays protected.">
  <meta property="og:image" content="${BASE_URL}/preview.png">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${BASE_URL}/">
  <meta name="twitter:title" content="Protect Your Art from Grok AI">
  <meta name="twitter:description" content="Upload images and share them on X/Twitter without Grok's edit feature. Your art stays protected.">
  <meta name="twitter:image" content="${BASE_URL}/preview.png">
  
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
      --heading-color: #1a1a1a;
      --border-color: #e0e0e0;
      --info-bg: #f5f5f5;
      --input-bg: #ffffff;
      --button-bg: #007bff;
      --button-hover: #0056b3;
      --secondary-text: #666666;
      --link-color: #1d9bf0;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
        --heading-color: #ffffff;
        --border-color: #404040;
        --info-bg: #2a2a2a;
        --input-bg: #2a2a2a;
        --button-bg: #0d6efd;
        --button-hover: #0b5ed7;
        --secondary-text: #a0a0a0;
        --link-color: #1d9bf0;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: background-color 0.3s, color 0.3s;
      position: relative;
      min-height: 100vh;
    }

    .container {
      max-width: 650px;
      margin: 30px auto;
      position: relative;
      z-index: 1;
    }

    h1 {
      color: var(--heading-color);
      margin-bottom: 10px;
    }

    .info-box {
      background: var(--info-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }

    .info-box h2 {
      margin-top: 0;
      font-size: 1.1em;
      color: var(--heading-color);
    }

    .info-box ol {
      margin: 10px 0;
      padding-left: 20px;
    }

    .info-box li {
      margin: 8px 0;
      color: var(--text-color);
    }

    .info-box .note {
      font-size: 0.9em;
      color: var(--secondary-text);
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid var(--border-color);
    }

    form {
      background: var(--info-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 25px;
      margin-top: 20px;
    }

    .form-group {
      margin: 20px 0;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: var(--text-color);
    }

    input[type="file"] {
      margin: 5px 0;
      padding: 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--input-bg);
      color: var(--text-color);
      width: 100%;
      box-sizing: border-box;
    }

    input[type="radio"] {
      margin-right: 8px;
    }

    .radio-group {
      margin: 10px 0;
    }

    .radio-option {
      margin: 10px 0;
      padding: 10px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .radio-option:hover {
      background-color: var(--bg-color);
    }

    .radio-option label {
      display: inline;
      font-weight: normal;
      cursor: pointer;
    }

    button {
      background: var(--button-bg);
      color: white;
      border: none;
      padding: 12px 24px;
      cursor: pointer;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 1em;
      font-weight: 500;
      transition: background-color 0.2s;
      width: 100%;
    }

    button:hover {
      background: var(--button-hover);
    }

    /* Infinite scrolling waterfall of artist handles on the sides */
    @keyframes scroll-down {
      0% {
        transform: translateY(-100%);
      }
      100% {
        transform: translateY(100vh);
      }
    }

    .artist-waterfall {
      position: fixed;
      z-index: 0;
      display: flex;
      flex-direction: column;
      animation: scroll-down 35s linear infinite;
    }

    .artist-waterfall.left {
      left: 3%;
      top: 0;
    }

    .artist-waterfall.right {
      right: 3%;
      top: 0;
      animation-delay: -17s;
    }

    .artist-waterfall a {
      color: #1d9bf0;
      text-decoration: none;
      font-size: 1em;
      font-weight: 500;
      text-shadow: 0 0 10px rgba(29, 155, 240, 0.3);
      transition: all 0.2s;
      white-space: nowrap;
    }

    .artist-waterfall a:hover {
      text-decoration: underline;
      text-shadow: 0 0 20px rgba(29, 155, 240, 0.6);
      transform: scale(1.1);
    }

    @media (max-width: 1200px) {
      .artist-waterfall {
        display: none;
      }
    }

    .artist-spotlight {
      margin: 30px 0;
      padding: 20px;
      text-align: center;
    }

    .artist-spotlight h2 {
      margin-top: 0;
      font-size: 0.9em;
      color: var(--secondary-text);
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .artist-links {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;
    }

    .artist-handle {
      color: var(--link-color);
      text-decoration: none;
      font-size: 0.95em;
      transition: opacity 0.2s;
    }

    .artist-handle:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  ${floatingHTML}
  
  <div class="container">
    <h1>X/Twitter Image Preview</h1>
    
    <div class="info-box">
      <h2>How it works</h2>
      <ol>
        <li>Upload your image</li>
        <li>Get a unique URL</li>
        <li>Post that URL on Twitter/X</li>
        <li>Your image appears as a preview card</li>
      </ol>
      <div class="note">
        <strong>Why?</strong> When you post images directly to X, they can be edited by Grok AI. 
        By hosting your image here and sharing the link instead, your art stays protected.
      </div>
    </div>

  <form method="POST" action="/upload" enctype="multipart/form-data">
    <div class="form-group">
      <label>Select Image:</label>
      <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required>
    </div>

    <div class="form-group">
      <label>Add Padding:</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="noPadding" name="padding" value="no" checked>
          <label for="noPadding">No - Larger image, may crop</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="yesPadding" name="padding" value="yes">
          <label for="yesPadding">Yes - Full image visible, smaller with bars</label>
        </div>
      </div>
    </div>

    <button type="submit">Upload</button>
  </form>

  ${artistSpotlightHTML}
  </div>
</body>
</html>`);
});

// Add body parser for form fields
app.use(express.urlencoded({ extended: true }));

// POST /upload - Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded or invalid file type.');
  }

  const id = generateId();
  const filename = req.file.originalname;
  let mimetype = req.file.mimetype;
  let imageBuffer = req.file.buffer;

  // Always use large card format (2:1 aspect ratio)
  const addPadding = req.body.padding === 'yes';

  // Process image if padding is requested
  if (addPadding) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width, height } = metadata;

      // Calculate target aspect ratio (2:1 for large cards)
      const targetRatio = 2;
      const currentRatio = width / height;

      let bgWidth, bgHeight;

      // Create 2:1 aspect ratio canvas
      if (currentRatio > targetRatio) {
        // Image is wider than 2:1, add padding top/bottom
        bgWidth = width;
        bgHeight = Math.round(width / targetRatio);
      } else {
        // Image is taller than 2:1, add padding left/right
        bgHeight = height;
        bgWidth = Math.round(height * targetRatio);
      }

      // Resize the image to fit within the canvas while maintaining aspect ratio
      const resizedImage = await image.resize(bgWidth, bgHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }).png().toBuffer();

      imageBuffer = resizedImage;

      mimetype = 'image/png';
    } catch (err) {
      console.error('Image processing error:', err);
      // Fall back to original image if processing fails
    }
  }

  // Store in database with card size preference
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO images (id, filename, data, mimetype, card_size) VALUES ($1, $2, $3, $4, $5)',
      [id, filename, imageBuffer, mimetype, 'large']
    );
    res.redirect(`/success/${id}`);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).send('Upload failed');
  } finally {
    client.release();
  }
});

// GET /success/:id - Show success page with shareable URL
app.get('/success/:id', async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }
  } catch (err) {
    return res.status(500).send('Database error');
  } finally {
    client.release();
  }

  const shareUrl = `${BASE_URL}/i/${id}`;

  // Pick a random artist to feature
  const randomArtist = ARTIST_SPOTLIGHTS.length > 0 
    ? ARTIST_SPOTLIGHTS[Math.floor(Math.random() * ARTIST_SPOTLIGHTS.length)]
    : null;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Success</title>
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
      --heading-color: #28a745;
      --box-bg: #f4f4f4;
      --border-color: #e0e0e0;
      --button-bg: #007bff;
      --button-hover: #0056b3;
      --button-success: #28a745;
      --link-color: #1d9bf0;
      --secondary-text: #666666;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
        --heading-color: #4ade80;
        --box-bg: #2a2a2a;
        --border-color: #404040;
        --button-bg: #0d6efd;
        --button-hover: #0b5ed7;
        --button-success: #22c55e;
        --link-color: #1d9bf0;
        --secondary-text: #a0a0a0;
      }
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 650px;
      margin: 50px auto;
      padding: 20px;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: background-color 0.3s, color 0.3s;
    }

    h1 {
      color: var(--heading-color);
    }

    .url-box {
      background: var(--box-bg);
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      word-break: break-all;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.95em;
    }

    button {
      background: var(--button-bg);
      color: white;
      border: none;
      padding: 12px 24px;
      cursor: pointer;
      border-radius: 6px;
      font-size: 1em;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    button:hover {
      background: var(--button-hover);
    }

    button.copied {
      background: var(--button-success);
    }

    a {
      color: var(--link-color);
      text-decoration: none;
      transition: opacity 0.2s;
    }

    a:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    p {
      margin: 15px 0;
    }

    .artist-feature {
      margin-top: 30px;
      padding: 15px;
      text-align: center;
    }

    .artist-feature h3 {
      margin: 0 0 10px 0;
      font-size: 0.85em;
      color: var(--secondary-text);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .artist-feature a {
      color: var(--link-color);
      text-decoration: none;
      font-size: 1em;
    }

    .artist-feature a:hover {
      text-decoration: underline;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <h1>Upload Successful!</h1>
  <p>Your tweet link:</p>
  <div class="url-box" id="url">${shareUrl}</div>
  <button onclick="copyUrl()" id="copyBtn">Copy to Clipboard</button>
  <p style="margin-top: 20px;"><a href="${shareUrl}">Preview your link</a></p>
  <p><a href="/">Upload another image</a></p>

  ${randomArtist ? `
  <div class="artist-feature">
    <h3>✨ Featured Artist</h3>
    <a href="${randomArtist.link}" target="_blank" rel="noopener noreferrer">${randomArtist.handle}</a>
  </div>
  ` : ''}

  <script>
    function copyUrl() {
      const url = document.getElementById('url').textContent;
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy to Clipboard';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>`);
});

// GET /i/:id - Image page with Open Graph meta tags (this is what Twitter reads)
app.get('/i/:id', async (req, res) => {
  const { id } = req.params;
  
  // Log when Twitter's bot accesses this
  const userAgent = req.get('User-Agent') || 'Unknown';
  console.log(`📄 /i/${id} accessed by: ${userAgent}`);

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT filename, mimetype FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const record = result.rows[0];
    const imageType = record.mimetype;

    const imageUrl = `${BASE_URL}/img/${id}`;
    const pageUrl = `${BASE_URL}/i/${id}`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image</title>
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${imageUrl}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Image">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
      }
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      text-align: center;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: background-color 0.3s, color 0.3s;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="Artwork">
</body>
</html>`);
  } catch (err) {
    res.status(500).send('Database error');
  } finally {
    client.release();
  }
});

// GET /img/:id - Serve the actual image file
app.get('/img/:id', async (req, res) => {
  const { id } = req.params;
  
  // Log when Twitter's bot accesses the image
  const userAgent = req.get('User-Agent') || 'Unknown';
  console.log(`🖼️  /img/${id} accessed by: ${userAgent}`);

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT data, mimetype FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const record = result.rows[0];
    
    console.log(`✅ Image found: ${record.mimetype}, size: ${record.data.length} bytes`);
    
    res.setHeader('Content-Type', record.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Content-Length', record.data.length);
    res.send(record.data);
  } catch (err) {
    console.error('❌ Image serve error:', err);
    res.status(500).send('Database error');
  } finally {
    client.release();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) {
    return res.status(400).send(`Upload error: ${err.message}`);
  }
  if (err.message) {
    return res.status(400).send(err.message);
  }
  res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
