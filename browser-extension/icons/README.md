# Icons Folder

This folder contains placeholder icons for the browser extension.

## Current Icons:
- `icon16.svg` - 16x16 placeholder (blue square with "DM")
- `icon48.svg` - 48x48 placeholder (blue square with "DM")
- `icon128.svg` - 128x128 placeholder (blue square with "DM")

## Replace Later:

To replace with your own custom icons:

1. Create PNG files in these sizes:
   - `icon16.png` (16x16px)
   - `icon48.png` (48x48px)
   - `icon128.png` (128x128px)

2. Place them in this folder

3. Update `manifest.json` to use `.png` instead of `.svg`:
   ```json
   "icons": {
     "16": "icons/icon16.png",
     "48": "icons/icon48.png",
     "128": "icons/icon128.png"
   }
   ```

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
