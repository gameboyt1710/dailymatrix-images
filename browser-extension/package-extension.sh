#!/bin/bash
# Package the extension for submission to Chrome Web Store / Firefox Add-ons

echo "📦 Packaging The Daily Matrix Extension..."

# Remove any existing package
rm -f daily-matrix-extension.zip

# Create the zip file (excluding development files)
zip -r daily-matrix-extension.zip . \
  -x "*.DS_Store" \
  -x "README.md" \
  -x "PUBLISHING.md" \
  -x "package-extension.sh" \
  -x "icons/README.md" \
  -x "*.git*"

echo "✅ Package created: daily-matrix-extension.zip"
echo ""
echo "📊 Package contents:"
unzip -l daily-matrix-extension.zip
echo ""
echo "🚀 Next steps:"
echo "1. Replace placeholder icons in icons/ folder with real ones"
echo "2. Upload to Chrome Web Store: https://chrome.google.com/webstore/devconsole/"
echo "3. Upload to Firefox Add-ons: https://addons.mozilla.org/developers/"
echo ""
echo "📖 See PUBLISHING.md for full instructions"
