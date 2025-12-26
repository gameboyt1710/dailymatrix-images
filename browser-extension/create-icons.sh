#!/bin/bash
# Simple script to create placeholder icon images using ImageMagick
# Run: chmod +x create-icons.sh && ./create-icons.sh

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick not found. Installing..."
    echo "On macOS: brew install imagemagick"
    echo "On Ubuntu: sudo apt-get install imagemagick"
    echo ""
    echo "Or create your own icons manually:"
    echo "  - icon16.png (16x16px)"
    echo "  - icon48.png (48x48px)"
    echo "  - icon128.png (128x128px)"
    exit 1
fi

echo "Creating placeholder icons..."

# Create 128x128 base icon (black background with blue circle and "DM" text)
convert -size 128x128 xc:black \
  -fill "#1d9bf0" -draw "circle 64,64 64,10" \
  -fill white -pointsize 48 -gravity center -annotate +0+0 "DM" \
  icon128.png

# Resize for other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png

echo "✅ Icons created: icon16.png, icon48.png, icon128.png"
echo "Feel free to replace these with your own custom icons!"
