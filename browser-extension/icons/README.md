# Icons Folder

This folder contains placeholder icons for the browser extension.

## Current Icons:
- `icon16.svg` - 16x16 placeholder (blue square with "DM")
- `icon48.svg` - 48x48 placeholder (blue square with "DM")
- `icon128.svg` - 128x128 placeholder (blue square with "DM")

## Replace Later:

To replace with your own custom icons:

1. Create PNG files in these sizes:
   - `icon16.png` (16x16px) - Browser toolbar small icon
   - `icon48.png` (48x48px) - Extension management page
   - `icon128.png` (128x128px) - Extension management page & Chrome Web Store
   - `icon512.png` (512x512px) - **Chrome Web Store listing only** (not packaged in extension ZIP)

2. Place them in this folder

3. Update `manifest.json` to use `.png` instead of `.svg`:
   ```json
   "icons": {
     "16": "icons/icon16.png",
     "48": "icons/icon48.png",
     "128": "icons/icon128.png"
   }
   ```

## Optional: Custom Composer Button Icon

Want a custom icon for the upload button that appears in tweets?

1. Create `button-icon.svg` (20x20px recommended)
2. Place it in this folder
3. The extension will automatically use it if present
4. If not provided, uses default upload icon

The button icon should be:
- Simple and recognizable at small sizes
- SVG format for crisp rendering
- Works well in light and dark themes

## Design Tips:
- Use a simple, recognizable design
- Make sure it looks good at small sizes (16x16)
- Use your brand colors (#1d9bf0 blue is good!)
- Keep it high contrast for visibility

## Tools to Create Icons:
- [Figma](https://figma.com) - Free design tool
- [Canva](https://canva.com) - Easy templates
- [Icon Kitchen](https://icon.kitchen) - Generate all sizes at once
- [Photopea](https://photopea.com) - Free Photoshop alternative

The current SVG placeholders work fine, so take your time to design something cool! 🎨
