// Content script that adds the upload button to Twitter/X composer

// Wait for Twitter's dynamic content to load
let observer = null;
let buttonInjected = false;

function injectUploadButton() {
  // Twitter/X composer toolbar selector (updated for current Twitter UI)
  const toolbar = document.querySelector('[data-testid="toolBar"]');
  
  if (!toolbar || buttonInjected) {
    return;
  }
  
  console.log('Daily Matrix: Found Twitter composer toolbar');
  
  // Create our upload button
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'dailymatrix-upload-btn';
  uploadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
    <span style="font-size: 11px; margin-top: 2px;">Daily Matrix</span>
  `;
  uploadBtn.title = 'Upload image to Daily Matrix';
  uploadBtn.type = 'button';
  
  // Style the button to match Twitter's style
  uploadBtn.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    margin: 0 4px;
    background: transparent;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    color: rgb(29, 155, 240);
    transition: background-color 0.2s;
  `;
  
  // Hover effect
  uploadBtn.addEventListener('mouseenter', () => {
    uploadBtn.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
  });
  
  uploadBtn.addEventListener('mouseleave', () => {
    uploadBtn.style.backgroundColor = 'transparent';
  });
  
  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/png,image/jpeg,image/webp';
  fileInput.style.display = 'none';
  
  // Handle file selection
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('Daily Matrix: File selected:', file.name);
    
    // Show loading state
    uploadBtn.disabled = true;
    uploadBtn.style.opacity = '0.5';
    uploadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="dailymatrix-spinner">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.3"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="4" fill="none"/>
      </svg>
      <span style="font-size: 11px; margin-top: 2px;">Uploading...</span>
    `;
    
    try {
      // Upload to Daily Matrix
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('https://thedailymatrix.com/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const html = await response.text();
      
      // Extract the share URL from the success page redirect
      const urlMatch = html.match(/\/success\/([a-zA-Z0-9_-]+)/);
      if (!urlMatch) {
        throw new Error('Could not extract image URL');
      }
      
      const imageId = urlMatch[1];
      const shareUrl = `https://thedailymatrix.com/i/${imageId}`;
      
      console.log('Daily Matrix: Upload successful:', shareUrl);
      
      // Find the tweet composer text area and insert the link
      const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                       document.querySelector('[contenteditable="true"][role="textbox"]');
      
      if (tweetBox) {
        // Insert the URL at the cursor position
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // Create a text node with the URL
        const textNode = document.createTextNode(shareUrl + ' ');
        range.insertNode(textNode);
        
        // Move cursor after the inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event so Twitter recognizes the change
        tweetBox.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('Daily Matrix: Link pasted into tweet');
      }
      
      // Show success state
      uploadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span style="font-size: 11px; margin-top: 2px;">Uploaded!</span>
      `;
      
      // Reset after 2 seconds
      setTimeout(() => {
        resetButton();
        fileInput.value = ''; // Clear file input
      }, 2000);
      
    } catch (err) {
      console.error('Daily Matrix: Upload error:', err);
      
      // Show error state
      uploadBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span style="font-size: 11px; margin-top: 2px;">Failed</span>
      `;
      
      // Reset after 2 seconds
      setTimeout(() => {
        resetButton();
        fileInput.value = '';
      }, 2000);
    }
  });
  
  function resetButton() {
    uploadBtn.disabled = false;
    uploadBtn.style.opacity = '1';
    uploadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      <span style="font-size: 11px; margin-top: 2px;">Daily Matrix</span>
    `;
  }
  
  // Click button to trigger file input
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });
  
  // Insert button into toolbar (after the first child)
  if (toolbar.firstChild) {
    toolbar.insertBefore(uploadBtn, toolbar.firstChild.nextSibling);
    toolbar.insertBefore(fileInput, uploadBtn);
    buttonInjected = true;
    console.log('Daily Matrix: Upload button injected');
  }
}

// Observer to watch for Twitter's dynamic content
function startObserver() {
  observer = new MutationObserver((mutations) => {
    // Check if composer appeared
    if (!buttonInjected) {
      injectUploadButton();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    startObserver();
    injectUploadButton();
  });
} else {
  startObserver();
  injectUploadButton();
}

console.log('Daily Matrix extension loaded');
