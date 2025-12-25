const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'https://thedailymatrix.com';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure data.json exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '{}', 'utf8');
}

// Load data from JSON file
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

// Save data to JSON file
function saveData(data) {
  const tempFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

// Generate a random ID
function generateId(length = 8) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// Allowed image extensions and MIME types
const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp'
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype];
    const id = generateId();
    req.generatedId = id;
    req.fileExt = ext;
    cb(null, `${id}${ext}`);
  }
});

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
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded or invalid file type.');
  }

  const id = req.generatedId;
  const filename = req.file.filename;

  // Load current data, add new record, save
  const data = loadData();
  data[id] = {
    id,
    filename,
    createdAt: new Date().toISOString()
  };
  saveData(data);

  res.redirect(`/success/${id}`);
});

// GET /success/:id - Show success page with shareable URL
app.get('/success/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const record = data[id];

  if (!record) {
    return res.status(404).send('Not found');
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
app.get('/i/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const record = data[id];

  if (!record) {
    return res.status(404).send('Not found');
  }

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
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Artwork">
  <meta name="twitter:description" content="Shared via The Daily Matrix">
  <meta name="twitter:image" content="${imageUrl}">
  
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; text-align: center; }
    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .caption { margin-top: 20px; color: #666; }
  </style>
</head>
<body>
  <img src="/img/${id}" alt="Artwork">
  <p class="caption">Shared via The Daily Matrix</p>
</body>
</html>`);
});

// GET /img/:id - Serve the actual image file
app.get('/img/:id', (req, res) => {
  const { id } = req.params;
  const data = loadData();
  const record = data[id];

  if (!record) {
    return res.status(404).send('Not found');
  }

  const filePath = path.join(UPLOADS_DIR, record.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Image not found');
  }

  // Determine content type from extension
  const ext = path.extname(record.filename).toLowerCase();
  const contentTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };

  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
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
