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
  {
    handle: '@cute_and_dumb',
    link: 'https://twitter.com/cute_and_dumb'
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
        
        // Create artist submissions table for the rebellion list
        await client.query(`
          CREATE TABLE IF NOT EXISTS artist_submissions (
            id SERIAL PRIMARY KEY,
            twitter_handle TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            submitted_at TIMESTAMP DEFAULT NOW(),
            reviewed_at TIMESTAMP
          )
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

// Body parser for JSON
app.use(express.json());

// CORS headers for browser extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// GET / - Upload form
app.get('/', async (req, res) => {
  // Load approved artists from database
  const client = await pool.connect();
  let approvedArtists = [];
  
  try {
    const result = await client.query(
      "SELECT twitter_handle FROM artist_submissions WHERE status = 'approved' ORDER BY reviewed_at DESC"
    );
    
    // Convert to artist objects with auto-generated links
    approvedArtists = result.rows.map(row => ({
      handle: row.twitter_handle,
      link: `https://x.com/${row.twitter_handle.slice(1)}` // Remove @ and create x.com link
    }));
    
    // Combine with hardcoded artists (keep your original ones)
    approvedArtists = [...ARTIST_SPOTLIGHTS, ...approvedArtists];
  } catch (err) {
    console.error('Error loading approved artists:', err);
    // Fall back to hardcoded list if database fails
    approvedArtists = [...ARTIST_SPOTLIGHTS];
  } finally {
    client.release();
  }
  
  // Generate artist spotlight HTML
  const artistSpotlightHTML = approvedArtists.length > 0 ? `
  <div class="artist-spotlight">
    <h2>Featured Artists</h2>
    <div class="artist-links">
      ${approvedArtists.map(artist => `
        <a href="${artist.link}" target="_blank" rel="noopener noreferrer" class="artist-handle">${artist.handle}</a>
      `).join('')}
    </div>
  </div>
  ` : '';

  // Generate infinite scrolling waterfall on the sides
  // Repeat the list enough times to ensure continuous scrolling
  const repeatCount = 8;
  const repeatedArtists = Array(repeatCount).fill(approvedArtists).flat();
  
  const floatingHTML = approvedArtists.length > 0 
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
  <meta property="og:image" content="${BASE_URL}/preview.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${BASE_URL}/">
  <meta name="twitter:title" content="Protect Your Art from Grok AI">
  <meta name="twitter:description" content="Upload images and share them on X/Twitter without Grok's edit feature. Your art stays protected.">
  <meta name="twitter:image" content="${BASE_URL}/preview.jpg">
  
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
  
  <div style="text-align: center; margin-top: 40px; padding: 20px; opacity: 0.7; font-size: 0.9em;">
    <p>This service is free and ad-free. Hosting costs money though!</p>
    <p>☕ <a href="https://buymeacoffee.com/Shinypants" target="_blank" rel="noopener noreferrer" style="color: var(--link-color);">Buy me a coffee</a> if you find this useful</p>
  </div>
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

// POST /api/upload - API endpoint for browser extension (returns JSON)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const id = generateId();
  const filename = req.file.originalname;
  let imageBuffer = req.file.buffer;
  let mimetype = req.file.mimetype;

  // Check if padding was requested
  const addPadding = req.body.padding === 'true' || req.body.padding === true;

  // Process image if padding is requested
  if (addPadding) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width, height } = metadata;

      const targetRatio = 2;
      const currentRatio = width / height;

      let bgWidth, bgHeight;

      if (currentRatio > targetRatio) {
        bgWidth = width;
        bgHeight = Math.round(width / targetRatio);
      } else {
        bgHeight = height;
        bgWidth = Math.round(height * targetRatio);
      }

      const resizedImage = await image.resize(bgWidth, bgHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }).png().toBuffer();

      imageBuffer = resizedImage;
      mimetype = 'image/png';
    } catch (err) {
      console.error('Image processing error:', err);
    }
  }

  // Store in database
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO images (id, filename, data, mimetype, card_size) VALUES ($1, $2, $3, $4, $5)',
      [id, filename, imageBuffer, mimetype, 'large']
    );
    
    const shareUrl = `${BASE_URL}/i/${id}`;
    res.json({ 
      success: true, 
      id: id,
      url: shareUrl 
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Upload failed' });
  } finally {
    client.release();
  }
});

// GET /success/:id - Show success page with shareable URL
app.get('/success/:id', async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  let approvedArtists = [];
  
  try {
    const result = await client.query('SELECT id FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }
    
    // Load approved artists
    const artistResult = await client.query(
      "SELECT twitter_handle FROM artist_submissions WHERE status = 'approved' ORDER BY reviewed_at DESC"
    );
    approvedArtists = artistResult.rows.map(row => ({
      handle: row.twitter_handle,
      link: `https://x.com/${row.twitter_handle.slice(1)}`
    }));
    approvedArtists = [...ARTIST_SPOTLIGHTS, ...approvedArtists];
  } catch (err) {
    return res.status(500).send('Database error');
  } finally {
    client.release();
  }

  const shareUrl = `${BASE_URL}/i/${id}`;

  // Pick a random artist to feature
  const randomArtist = approvedArtists.length > 0 
    ? approvedArtists[Math.floor(Math.random() * approvedArtists.length)]
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

  <div style="text-align: center; margin-top: 40px; padding: 20px; opacity: 0.7; font-size: 0.85em;">
    <p>☕ <a href="https://buymeacoffee.com/Shinypants" target="_blank" rel="noopener noreferrer" style="color: var(--link-color);">Support this service</a> - hosting isn't free!</p>
  </div>

  <div style="margin-top: 60px; padding: 30px; background: var(--bg); border: 2px solid var(--border); border-radius: 8px;">
    <h3 style="margin-top: 0;">🔥 Join the Rebellion</h3>
    <p style="margin-bottom: 20px; opacity: 0.8;">Add your Twitter handle to our artist spotlight - show you won't back down against AI!</p>
    <form id="rebellionForm" style="display: flex; gap: 10px; align-items: center;">
      <input 
        type="text" 
        id="twitterHandle" 
        placeholder="@yourhandle" 
        style="flex: 1; padding: 12px; border: 2px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 1em;"
        required
      />
      <button type="submit" style="padding: 12px 24px; background: var(--link-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold;">
        Submit
      </button>
    </form>
    <div id="rebellionMessage" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
  </div>

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

    // Handle rebellion form submission
    document.getElementById('rebellionForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const handle = document.getElementById('twitterHandle').value.trim();
      const message = document.getElementById('rebellionMessage');
      
      // Basic validation
      if (!handle.startsWith('@')) {
        message.textContent = '⚠️ Handle must start with @';
        message.style.background = '#ff000020';
        message.style.display = 'block';
        return;
      }
      
      try {
        const response = await fetch('/api/submit-artist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          message.textContent = '✅ ' + data.message;
          message.style.background = '#00ff0020';
          message.style.display = 'block';
          document.getElementById('twitterHandle').value = '';
        } else {
          message.textContent = '⚠️ ' + data.error;
          message.style.background = '#ff000020';
          message.style.display = 'block';
        }
      } catch (err) {
        message.textContent = '❌ Failed to submit. Try again later.';
        message.style.background = '#ff000020';
        message.style.display = 'block';
      }
    });
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
  <meta property="og:title" content=".">
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

// POST /api/submit-artist - Submit artist handle for rebellion list
app.post('/api/submit-artist', async (req, res) => {
  const { handle } = req.body;
  
  // Validate handle
  if (!handle || !handle.startsWith('@') || handle.length < 2 || handle.length > 16) {
    return res.status(400).json({ error: 'Invalid Twitter handle' });
  }
  
  const cleanHandle = handle.toLowerCase().trim();
  
  const client = await pool.connect();
  try {
    // Check if already submitted
    const existing = await client.query(
      'SELECT status FROM artist_submissions WHERE LOWER(twitter_handle) = $1',
      [cleanHandle]
    );
    
    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      if (status === 'pending') {
        return res.status(400).json({ error: 'Already submitted! Awaiting review.' });
      } else if (status === 'approved') {
        return res.status(400).json({ error: 'You\'re already in the rebellion list!' });
      }
    }
    
    // Insert new submission
    await client.query(
      'INSERT INTO artist_submissions (twitter_handle, status) VALUES ($1, $2)',
      [cleanHandle, 'pending']
    );
    
    res.json({ message: 'Submitted! Your handle will be reviewed soon.' });
  } catch (err) {
    console.error('Artist submission error:', err);
    res.status(500).json({ error: 'Failed to submit' });
  } finally {
    client.release();
  }
});

// GET /admin - Admin page for reviewing artist submissions (simple password protection)
app.get('/admin', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin - Artist Submissions</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #000000;
      --border: #e0e0e0;
      --link-color: #1d9bf0;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #000000;
        --text: #ffffff;
        --border: #333333;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 1000px;
      margin: 50px auto;
      padding: 20px;
      background-color: var(--bg);
      color: var(--text);
    }
    
    h1 { margin-bottom: 30px; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    th {
      background: var(--border);
      font-weight: bold;
    }
    
    button {
      padding: 8px 16px;
      margin-right: 5px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    
    .approve { background: #00ff00; color: black; }
    .reject { background: #ff0000; color: white; }
    .pending { opacity: 0.6; }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: bold;
    }
    
    .status-pending { background: #ffaa00; color: black; }
    .status-approved { background: #00ff00; color: black; }
    .status-rejected { background: #ff0000; color: white; }
  </style>
</head>
<body>
  <div id="loginForm" style="display: none;">
    <h1>🔥 Admin Login</h1>
    <form onsubmit="handleLogin(event)" style="max-width: 400px; margin: 50px auto;">
      <input 
        type="password" 
        id="passwordInput" 
        placeholder="Enter admin password" 
        style="width: 100%; padding: 12px; border: 2px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 1em; margin-bottom: 10px;"
        required
      />
      <button type="submit" style="width: 100%; padding: 12px; background: var(--link-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: bold;">
        Login
      </button>
      <div id="loginError" style="color: #ff0000; margin-top: 10px; display: none;"></div>
    </form>
  </div>

  <div id="adminPanel" style="display: none;">
    <h1>🔥 Rebellion List - Artist Submissions</h1>
    <p>Review and approve artists to add them to the spotlight waterfall. <button onclick="logout()" style="padding: 6px 12px; background: #ff0000; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Logout</button></p>
    
    <div id="submissions">Loading...</div>
  </div>
  
  <script>
    let adminPassword = localStorage.getItem('adminPassword');
    
    function handleLogin(e) {
      e.preventDefault();
      adminPassword = document.getElementById('passwordInput').value;
      localStorage.setItem('adminPassword', adminPassword);
      checkAuth();
    }
    
    function logout() {
      localStorage.removeItem('adminPassword');
      adminPassword = null;
      document.getElementById('adminPanel').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
    }
    
    async function checkAuth() {
      if (!adminPassword) {
        document.getElementById('loginForm').style.display = 'block';
        return;
      }
      
      try {
        const response = await fetch('/api/admin/submissions', {
          headers: { 'Authorization': \`Bearer \${adminPassword}\` }
        });
        
        if (!response.ok) {
          document.getElementById('loginError').textContent = '❌ Invalid password';
          document.getElementById('loginError').style.display = 'block';
          localStorage.removeItem('adminPassword');
          document.getElementById('loginForm').style.display = 'block';
          return;
        }
        
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadSubmissions();
      } catch (err) {
        document.getElementById('loginError').textContent = '❌ Connection error';
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('loginForm').style.display = 'block';
      }
    }
    
    async function loadSubmissions() {
      try {
        const response = await fetch('/api/admin/submissions', {
          headers: { 'Authorization': \`Bearer \${adminPassword}\` }
        });
        
        if (!response.ok) {
          document.getElementById('submissions').innerHTML = '<p>❌ Unauthorized or error loading submissions</p>';
          localStorage.removeItem('adminPassword');
          return;
        }
        
        const data = await response.json();
        
        if (data.submissions.length === 0) {
          document.getElementById('submissions').innerHTML = '<p>No submissions yet!</p>';
          return;
        }
        
        const table = \`
          <table>
            <thead>
              <tr>
                <th>Twitter Handle</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              \${data.submissions.map(s => \`
                <tr class="\${s.status === 'pending' ? '' : 'pending'}">
                  <td><a href="https://twitter.com/\${s.twitter_handle.slice(1)}" target="_blank">\${s.twitter_handle}</a></td>
                  <td><span class="status-badge status-\${s.status}">\${s.status}</span></td>
                  <td>\${new Date(s.submitted_at).toLocaleString()}</td>
                  <td>
                    \${s.status === 'pending' ? \`
                      <button class="approve" onclick="updateStatus(\${s.id}, 'approved')">✅ Approve</button>
                      <button class="reject" onclick="updateStatus(\${s.id}, 'rejected')">❌ Reject</button>
                    \` : '—'}
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        \`;
        
        document.getElementById('submissions').innerHTML = table;
      } catch (err) {
        document.getElementById('submissions').innerHTML = '<p>❌ Error loading submissions</p>';
      }
    }
    
    async function updateStatus(id, status) {
      try {
        const response = await fetch(\`/api/admin/submissions/\${id}\`, {
          method: 'PATCH',
          headers: {
            'Authorization': \`Bearer \${adminPassword}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        });
        
        if (response.ok) {
          loadSubmissions();
        } else {
          alert('Failed to update status');
        }
      } catch (err) {
        alert('Error updating status');
      }
    }
    
    // Check auth on page load
    checkAuth();
    
    // Auto-refresh submissions every 10s if logged in
    setInterval(() => {
      if (adminPassword && document.getElementById('adminPanel').style.display !== 'none') {
        loadSubmissions();
      }
    }, 10000);
  </script>
</body>
</html>
  `);
});

// GET /api/admin/submissions - Get all submissions (admin only)
app.get('/api/admin/submissions', async (req, res) => {
  const auth = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  
  if (!auth || auth !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM artist_submissions ORDER BY submitted_at DESC'
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error('Admin submissions error:', err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/submissions/:id - Approve or reject submission (admin only)
app.patch('/api/admin/submissions/:id', async (req, res) => {
  const auth = req.headers.authorization;
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  
  if (!auth || auth !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const client = await pool.connect();
  try {
    // Update status
    await client.query(
      'UPDATE artist_submissions SET status = $1, reviewed_at = NOW() WHERE id = $2',
      [status, id]
    );
    
    // Log the action
    if (status === 'approved') {
      const result = await client.query(
        'SELECT twitter_handle FROM artist_submissions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length > 0) {
        const handle = result.rows[0].twitter_handle;
        console.log(`✅ APPROVED: ${handle} - Now appearing in artist waterfall!`);
      }
    } else if (status === 'rejected') {
      const result = await client.query(
        'SELECT twitter_handle FROM artist_submissions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length > 0) {
        const handle = result.rows[0].twitter_handle;
        console.log(`❌ REJECTED: ${handle}`);
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Admin update error:', err);
    res.status(500).json({ error: 'Database error' });
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
