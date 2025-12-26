# Daily Matrix Browser Extension

A browser extension that makes uploading images to Daily Matrix super easy!

## Features

### 🎯 Two Ways to Upload:

1. **In-Tweet Upload Button** (Twitter/X only)
   - Adds a "Daily Matrix" button directly in the tweet composer
   - Click → select image → link automatically pastes into your tweet
   - Perfect for quick uploads while composing tweets

2. **Extension Popup** (Works anywhere)
   - Click the extension icon in your toolbar
   - Drag & drop or click to upload
   - Copy the link and paste wherever you want

## Installation

### Chrome/Edge/Brave:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `browser-extension` folder
6. Done! The extension is now active

### Firefox:

1. Download or clone this repository
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `browser-extension` folder and select `manifest.json`
5. Done! (Note: Firefox temporary extensions are removed when you close the browser)

For permanent Firefox installation, you'll need to sign it through Mozilla's Add-on store.

## How to Use

### On Twitter/X:
1. Start composing a tweet
2. Look for the "Daily Matrix" button next to the image/GIF buttons
3. Click it and select your image
4. The link will automatically be pasted into your tweet!
5. Tweet it!

### Anywhere Else:
1. Click the Daily Matrix extension icon in your browser toolbar
2. Drag & drop an image or click to browse
3. Wait for upload to complete
4. Click "Copy Link"
5. Paste it wherever you want!

## Icon Placeholder

Currently using placeholder icons. To add proper icons:
- Create `icon16.png` (16x16px)
- Create `icon48.png` (48x48px)  
- Create `icon128.png` (128x128px)

Place them in the `browser-extension` folder.

## Tech Details

- **Manifest Version**: 3 (latest standard)
- **Permissions**: Only what's needed (activeTab + host permissions for Twitter and Daily Matrix)
- **No tracking**: Extension doesn't collect any data
- **No external dependencies**: Pure vanilla JavaScript

## Privacy

This extension:
- ✅ Only works on Twitter/X and when you click it
- ✅ Uploads directly to thedailymatrix.com (your server)
- ✅ Doesn't track or collect any user data
- ✅ Doesn't require account login
- ✅ Open source - you can read the code!

## Support

Issues? Contact [@shinypants1710](https://twitter.com/shinypants1710) or visit [thedailymatrix.com](https://thedailymatrix.com)

---

Made with 🔥 to protect artists from AI scraping
