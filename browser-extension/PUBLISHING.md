# Publishing to Extension Stores

## 📋 What You Need Before Publishing

### Required Materials:
- [ ] **Icons** (get from your artist friends!)
  - `icon16.png` (16x16px)
  - `icon48.png` (48x48px)
  - `icon128.png` (128x128px)
  - Tip: Create a 512x512px master icon, then scale down

- [ ] **Screenshots** for store listing
  - Chrome: 1280x800px or 640x400px
  - Firefox: 1280x800px recommended
  - Show: Twitter button in action, popup interface, image preview
  
- [ ] **Promotional Images** (optional but recommended)
  - Chrome: 440x280px small tile
  - Chrome: 920x680px or 1400x560px marquee

- [ ] **Privacy Policy** (required for Chrome)
  - I'll help you create one below!

### Store Requirements:
- **Chrome Web Store**: $5 one-time developer fee
- **Firefox Add-ons**: Free, but review takes 1-3 days
- **Edge Add-ons**: Free, uses same package as Chrome

---

## 🌐 Chrome Web Store Publishing

### Step 1: Create Developer Account
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Sign in with Google account
3. Pay $5 one-time registration fee
4. Accept terms

### Step 2: Prepare ZIP File
```bash
cd browser-extension
zip -r daily-matrix-extension.zip . -x "*.DS_Store" -x "README.md" -x "icons/README.md"
```

### Step 3: Upload & Configure
1. Click "New Item" in dashboard
2. Upload `daily-matrix-extension.zip`
3. Fill out store listing:

**Store Listing Details:**

- **Name**: The Daily Matrix - Protect Your Art
- **Summary**: Upload images from Twitter/X and get shareable links that protect your art from AI scraping
- **Description**:
```
🔥 Protect Your Art from AI Scraping

The Daily Matrix browser extension makes it incredibly easy to share your artwork on Twitter/X while protecting it from AI training datasets.

✨ FEATURES:

• In-Tweet Upload Button - A button appears directly in your Twitter/X composer
• Auto-Paste Links - Upload and the link instantly appears in your tweet
• Padding Toggle - Add black letterboxing for optimal Twitter card display
• Join the Rebellion - Submit your handle to our artist spotlight
• Privacy Focused - No tracking, no data collection

🎯 HOW IT WORKS:

1. Compose a tweet on Twitter/X
2. Click the "Daily Matrix" button in the toolbar
3. Select your image
4. Link automatically appears in your tweet
5. Post!

Your images are hosted on thedailymatrix.com servers instead of Twitter's native media, which helps avoid automated AI scraping tools like Grok.

🛡️ PRIVACY:

• No user data collection
• No tracking or analytics
• Open source code
• Only works when you click it

💪 SUPPORT ARTISTS:

This tool was built to help artists protect their work. It's free to use, with optional donations to support hosting costs.

Made with 🔥 by artists, for artists.
```

- **Category**: Social & Communication
- **Language**: English

**Screenshots Needed:**
1. Twitter composer with Daily Matrix button visible
2. Extension popup with upload area
3. Image preview page with CTA
4. Padding toggle demonstration

### Step 4: Privacy Policy
1. You need to host this somewhere (add to your website)
2. I'll create the content below

### Step 5: Submit for Review
- First review: 1-3 days
- Updates: Usually within 24 hours

---

## 🦊 Firefox Add-ons Publishing

### Step 1: Create Developer Account
1. Go to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
2. Sign in with Firefox account
3. Accept terms (no fee!)

### Step 2: Prepare ZIP File
Same as Chrome - the extension works for both!

### Step 3: Upload & Configure
1. Click "Submit a New Add-on"
2. Upload `daily-matrix-extension.zip`
3. Choose "On this site" (listed on AMO)
4. Fill out listing (similar to Chrome)

### Step 4: Review Process
- Usually 1-3 business days
- Manual review by Mozilla
- They'll check the code for security

---

## 📱 Microsoft Edge Add-ons (Bonus!)

### Same Package as Chrome!
1. Go to [Edge Add-ons Developer Dashboard](https://partner.microsoft.com/dashboard/microsoftedge/)
2. Register (free)
3. Upload same ZIP as Chrome
4. Fill out listing
5. Usually approved within 24-48 hours

---

## 📄 Privacy Policy Template

Create a page at `thedailymatrix.com/privacy` with this:

```markdown
# Privacy Policy for The Daily Matrix Extension

Last updated: December 26, 2025

## What We Collect

The Daily Matrix browser extension collects **no personal data**. 

### Data Storage
- **Padding Preference**: Stored locally in your browser using Chrome Storage API
- **Submitted Twitter Handles**: When you voluntarily submit your Twitter handle via the "Join the Rebellion" form, it is sent to our server and stored in our database

### Data We Don't Collect
- Browsing history
- Personal information
- Twitter credentials
- Image content (beyond what you voluntarily upload)
- Analytics or tracking data
- Cookies

## How The Extension Works

1. **Content Script**: Only runs on twitter.com and x.com. Adds an upload button to the tweet composer.
2. **Popup**: Allows manual uploads when you click the extension icon.
3. **Image Uploads**: When you select an image, it's uploaded directly to thedailymatrix.com via HTTPS.

## Data Processing

- Images uploaded through the extension are stored on our servers at thedailymatrix.com
- Image data is stored in a PostgreSQL database hosted on Railway
- We do not scan, analyze, or use your images for any purpose other than hosting
- You can request deletion by contacting us

## Third-Party Services

- **Railway**: Our hosting provider (thedailymatrix.com is hosted on Railway)
- No analytics services
- No advertising networks
- No third-party trackers

## Your Rights

You have the right to:
- Request deletion of images you've uploaded
- Request deletion of your submitted Twitter handle
- Use the service completely anonymously

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users by updating the "Last updated" date.

## Contact

Questions about privacy? Contact: [your email or Twitter handle]

## Open Source

This extension is open source. You can review the code at: https://github.com/gameboyt1710/dailymatrix-images
```

---

## 🎨 Tips for Your Artist Friends Making Icons

**What Works Best:**
- High contrast design
- Recognizable at 16x16 (super small!)
- Avoid thin lines or intricate details
- Use your brand blue (#1d9bf0)
- Consider: Matrix-style art, shield icon, or stylized "DM"

**Format:**
- PNG with transparency
- sRGB color space
- No animations

**Sizes to provide:**
- Master: 512x512px (for store listings)
- icon128.png
- icon48.png  
- icon16.png

---

## 🚀 Quick Checklist

Before submitting:
- [ ] Replace placeholder icons with real ones
- [ ] Test extension thoroughly on both Chrome and Firefox
- [ ] Take screenshots (Twitter button, popup, image page)
- [ ] Add privacy policy page to your website
- [ ] Prepare promotional images (optional)
- [ ] Create developer accounts
- [ ] Have $5 ready for Chrome Web Store

After approval:
- [ ] Announce on Twitter!
- [ ] Add "Get the Extension" link to your website
- [ ] Update README with store badges

---

## 📧 Store Listing Info Summary

**Name**: The Daily Matrix - Protect Your Art

**Short Description**: Upload images from Twitter/X and get shareable links that protect your art from AI scraping

**Website**: https://thedailymatrix.com

**Support Email**: [your email]

**Privacy Policy**: https://thedailymatrix.com/privacy

---

Ready to publish! Just need those icons and you're good to go! 🔥
