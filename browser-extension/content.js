// Content script that adds the upload button to Twitter/X composer

// Track injected buttons by composer instance
const injectedComposers = new WeakSet();

function injectUploadButton() {
  // Find all composer toolbars (there can be multiple if drafts are open)
  const toolbars = document.querySelectorAll('[data-testid="toolBar"]');
  
  if (toolbars.length === 0) {
    return;
  }
  
  toolbars.forEach((toolbar) => {
    // Skip if we already injected buttons for this toolbar
    if (injectedComposers.has(toolbar)) {
      return;
    }
    
    console.log('Daily Matrix: Found new Twitter composer toolbar');
    
    // Create container for our buttons (will be inserted after toolbar)
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'dailymatrix-button-container';
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-top: 1px solid rgb(47, 51, 54);
      background: transparent;
    `;
    
    // Create our upload button
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'dailymatrix-upload-btn';
    uploadBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        <circle cx="12" cy="12" r="2"/>
      </svg>
      <span style="margin-left: 6px;">Daily Matrix Upload</span>
    `;
    uploadBtn.title = 'Upload image to Daily Matrix';
    uploadBtn.type = 'button';
    
    // Style the button
    uploadBtn.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 16px;
      background: rgb(29, 155, 240);
      border: none;
      border-radius: 9999px;
      cursor: pointer;
      color: white;
      font-size: 14px;
      font-weight: bold;
      transition: background-color 0.2s;
    `;
    
    // Hover effect
    uploadBtn.addEventListener('mouseenter', () => {
      uploadBtn.style.backgroundColor = 'rgb(26, 140, 216)';
    });
    
    uploadBtn.addEventListener('mouseleave', () => {
      uploadBtn.style.backgroundColor = 'rgb(29, 155, 240)';
    });
    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp';
    fileInput.style.display = 'none';
    
    // Create padding checkbox toggle
    const paddingToggle = document.createElement('label');
    paddingToggle.className = 'dailymatrix-padding-toggle';
    paddingToggle.innerHTML = `
      <input type="checkbox" class="dailymatrix-padding-check" style="margin-right: 6px; cursor: pointer; width: 16px; height: 16px;">
      <span style="font-size: 13px;">Add padding (2:1)</span>
    `;
    paddingToggle.style.cssText = `
      display: flex;
      align-items: center;
      font-size: 13px;
      color: rgb(231, 233, 234);
      cursor: pointer;
      user-select: none;
    `;
    
    const checkbox = paddingToggle.querySelector('input');
    
    // Load padding preference
    chrome.storage.local.get(['addPadding'], (result) => {
      checkbox.checked = result.addPadding || false;
    });
    
    // Save padding preference when changed
    checkbox.addEventListener('change', () => {
      chrome.storage.local.set({ addPadding: checkbox.checked });
    });
    
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
      // Get padding preference from storage
      let addPadding = false;
      try {
        const result = await chrome.storage.local.get(['addPadding']);
        addPadding = result.addPadding || false;
      } catch (err) {
        console.log('Daily Matrix: Storage not available, using default padding setting');
      }
      
      // Upload to Daily Matrix API
      const formData = new FormData();
      formData.append('image', file);
      formData.append('padding', addPadding);
      
      const response = await fetch('https://thedailymatrix.com/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Daily Matrix: Upload error:', errorText);
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      const shareUrl = data.url;
      
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
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <span style="margin-left: 6px;">Daily Matrix Upload</span>
      `;
    }
    
    // Click button to trigger file input
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    // Assemble the button container
    buttonContainer.appendChild(uploadBtn);
    buttonContainer.appendChild(paddingToggle);
    buttonContainer.appendChild(fileInput);
    
    // Insert button container after the toolbar
    // Try multiple insertion strategies
    if (toolbar.parentElement) {
      toolbar.parentElement.insertBefore(buttonContainer, toolbar.nextSibling);
      injectedComposers.add(toolbar);
      console.log('Daily Matrix: Upload button and padding toggle injected');
    } else {
      console.log('Daily Matrix: Could not find toolbar parent for insertion');
    }
  });
}

// Observer to watch for Twitter's dynamic content
function startObserver() {
  const observer = new MutationObserver((mutations) => {
    // Check if composer appeared or changed
    injectUploadButton();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also run periodically to catch any missed composers
  setInterval(injectUploadButton, 1000);
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
