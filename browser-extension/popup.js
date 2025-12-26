// Popup script for standalone upload (when clicking the extension icon)

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const result = document.getElementById('result');
const resultUrl = document.getElementById('resultUrl');
const copyBtn = document.getElementById('copyBtn');
const errorDiv = document.getElementById('error');
const paddingToggle = document.getElementById('paddingToggle');

// Load padding preference
chrome.storage.local.get(['addPadding'], (result) => {
  paddingToggle.checked = result.addPadding || false;
});

// Save padding preference when changed
paddingToggle.addEventListener('change', () => {
  chrome.storage.local.set({ addPadding: paddingToggle.checked });
});

// Click to upload
uploadArea.addEventListener('click', () => {
  fileInput.click();
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragging');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragging');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragging');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// File input change
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

// Copy button
copyBtn.addEventListener('click', () => {
  const url = resultUrl.textContent;
  navigator.clipboard.writeText(url).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy Link';
    }, 2000);
  });
});

async function handleFile(file) {
  // Validate file type
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('Please select a PNG, JPG, or WebP image');
    return;
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    showError('File is too large. Maximum size is 10MB');
    return;
  }
  
  // Hide previous results/errors
  result.classList.remove('show');
  errorDiv.classList.remove('show');
  uploadArea.style.display = 'none';
  loading.classList.add('show');
  
  try {
    // Upload to Daily Matrix API
    const formData = new FormData();
    formData.append('image', file);
    formData.append('padding', paddingToggle.checked);
    
    const response = await fetch('https://thedailymatrix.com/api/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    const shareUrl = data.url;
    
    // Show result
    loading.classList.remove('show');
    result.classList.add('show');
    resultUrl.textContent = shareUrl;
    
    // Reset file input
    fileInput.value = '';
    
  } catch (err) {
    console.error('Upload error:', err);
    loading.classList.remove('show');
    uploadArea.style.display = 'block';
    showError('Upload failed. Please try again.');
    fileInput.value = '';
  }
}

function showError(message) {
  errorDiv.textContent = '❌ ' + message;
  errorDiv.classList.add('show');
  setTimeout(() => {
    errorDiv.classList.remove('show');
  }, 4000);
}
