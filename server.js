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

// GET / - Upload form
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Daily Matrix - Image Upload</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #333; }
    form { margin-top: 20px; }
    .form-group { margin: 15px 0; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input[type="file"] { margin: 5px 0; }
    input[type="radio"] { margin-right: 5px; }
    .radio-group { margin: 10px 0; }
    .radio-option { margin: 8px 0; }
    .help-text { font-size: 0.9em; color: #666; margin-top: 3px; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; margin-top: 10px; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>The Daily Matrix</h1>
  <p>Upload an image to get a shareable link for Twitter/X.</p>
  <form method="POST" action="/upload" enctype="multipart/form-data">
    <div class="form-group">
      <label>Select Image:</label>
      <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required>
    </div>

    <div class="form-group">
      <label>Card Size:</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="large" name="cardSize" value="large" checked>
          <label for="large" style="display: inline; font-weight: normal;">Large (2:1) - Big preview</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="square" name="cardSize" value="square">
          <label for="square" style="display: inline; font-weight: normal;">Square (1:1) - Smaller preview</label>
        </div>
      </div>
    </div>

    <div class="form-group">
      <label>Add Padding:</label>
      <div class="radio-group">
        <div class="radio-option">
          <input type="radio" id="noPadding" name="padding" value="no" checked>
          <label for="noPadding" style="display: inline; font-weight: normal;">No - Larger image, may crop</label>
        </div>
        <div class="radio-option">
          <input type="radio" id="yesPadding" name="padding" value="yes">
          <label for="yesPadding" style="display: inline; font-weight: normal;">Yes - Full image visible, smaller with bars</label>
        </div>
      </div>
    </div>

    <button type="submit">Upload</button>
  </form>
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

  // Get user preferences
  const cardSize = req.body.cardSize || 'large'; // 'large' or 'square'
  const addPadding = req.body.padding === 'yes';

  // Process image if padding is requested
  if (addPadding) {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const { width, height } = metadata;

      // Calculate target aspect ratio
      const targetRatio = cardSize === 'square' ? 1 : 2; // 1:1 or 2:1
      const currentRatio = width / height;

      let newWidth, newHeight, bgWidth, bgHeight;

      if (cardSize === 'square') {
        // Make it 1:1
        const maxDim = Math.max(width, height);
        bgWidth = bgHeight = maxDim;
        
        // Calculate scaled dimensions to fit
        if (width > height) {
          newWidth = maxDim;
          newHeight = Math.round(height * (maxDim / width));
        } else {
          newHeight = maxDim;
          newWidth = Math.round(width * (maxDim / height));
        }
      } else {
        // Make it 2:1 (wide)
        if (currentRatio > targetRatio) {
          // Image is wider than 2:1, fit to width
          bgWidth = width;
          bgHeight = Math.round(width / targetRatio);
          newWidth = width;
          newHeight = height;
        } else {
          // Image is taller than 2:1, fit to height
          bgHeight = height;
          bgWidth = Math.round(height * targetRatio);
          newWidth = width;
          newHeight = height;
        }
      }

      // Create canvas with black background and composite image
      imageBuffer = await sharp({
        create: {
          width: bgWidth,
          height: bgHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        }
      })
      .composite([{
        input: await image.resize(newWidth, newHeight, { fit: 'inside' }).toBuffer(),
        gravity: 'center'
      }])
      .png() // Convert to PNG for transparency support
      .toBuffer();

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
      [id, filename, imageBuffer, mimetype, cardSize]
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

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Success - The Daily Matrix</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    h1 { color: #28a745; }
    .url-box { background: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0; word-break: break-all; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
    button:hover { background: #0056b3; }
    .copied { background: #28a745; }
    a { color: #007bff; }
  </style>
</head>
<body>
  <h1>Upload Successful!</h1>
  <p>Your tweet link:</p>
  <div class="url-box" id="url">${shareUrl}</div>
  <button onclick="copyUrl()" id="copyBtn">Copy to Clipboard</button>
  <p style="margin-top: 20px;"><a href="${shareUrl}">Preview your link</a></p>
  <p><a href="/">Upload another image</a></p>
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

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT filename, mimetype, card_size FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const record = result.rows[0];
    const imageType = record.mimetype;
    const cardType = record.card_size === 'square' ? 'summary' : 'summary_large_image';

    const imageUrl = `${BASE_URL}/img/${id}`;
    const pageUrl = `${BASE_URL}/i/${id}`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image</title>
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="Image">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:secure_url" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${cardType}">
  <meta name="twitter:title" content="Image">
  <meta name="twitter:image" content="${imageUrl}">
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .caption { margin-top: 20px; color: #666; }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="Artwork">
  <p class="caption">Shared via The Daily Matrix</p>
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

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT data, mimetype FROM images WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }

    const record = result.rows[0];
    res.setHeader('Content-Type', record.mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(record.data);
  } catch (err) {
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
