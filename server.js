const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
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
            created_at TIMESTAMP DEFAULT NOW()
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
    input[type="file"] { margin: 10px 0; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <h1>The Daily Matrix</h1>
  <p>Upload an image to get a shareable link for Twitter/X.</p>
  <form method="POST" action="/upload" enctype="multipart/form-data">
    <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required>
    <br>
    <button type="submit">Upload</button>
  </form>
</body>
</html>`);
});

// POST /upload - Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded or invalid file type.');
  }

  const id = generateId();
  const filename = req.file.originalname;
  const mimetype = req.file.mimetype;
  const data = req.file.buffer;

  // Store in database
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO images (id, filename, data, mimetype) VALUES ($1, $2, $3, $4)',
      [id, filename, data, mimetype]
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
  <title>Artwork - The Daily Matrix</title>
  
  <!-- Open Graph -->
  <meta property="og:title" content="Artwork">
  <meta property="og:description" content="Shared via The Daily Matrix">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Daily Matrix">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Artwork">
  <meta name="twitter:description" content="Shared via The Daily Matrix">
  <meta name="twitter:image" content="${imageUrl}">
  <meta name="twitter:image:src" content="${imageUrl}">
  
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
