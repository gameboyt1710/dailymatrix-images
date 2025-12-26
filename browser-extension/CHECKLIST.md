# 🚀 Extension Publishing Checklist

## Before Submitting

### Icons (GET FROM YOUR ARTIST FRIENDS! 🎨)
- [ ] icon16.png (16x16px) - Browser toolbar small icon
- [ ] icon48.png (48x48px) - Extension management page
- [ ] icon128.png (128x128px) - Extension management page & Chrome Web Store
- [ ] icon512.png (512x512px) - **Chrome Web Store listing only** (not in extension, just for the store page)
- [ ] (Optional) Custom SVG icon for the tweet composer button

**Icon Tips:**
- High contrast, recognizable at small sizes
- Use brand blue (#1d9bf0)
- PNG with transparency
- No thin lines or tiny text
- icon512.png is ONLY for the Chrome Web Store product page, not included in the extension package

### Composer Button Icon (Optional)
Want a custom icon for the upload button in tweets? Create a file:
- [ ] `icons/button-icon.svg` - Icon shown in the tweet composer button (20x20px recommended)
- If not provided, the extension uses a default icon

### Screenshots (Take these yourself)
- [ ] Twitter composer with Daily Matrix button visible
- [ ] Extension popup showing upload interface
- [ ] Extension popup showing padding toggle
- [ ] Image preview page with "Make Your Own" CTA
- [ ] (Optional) Gif/video showing the full workflow

**Screenshot specs:**
- 1280x800px or 640x400px
- PNG or JPG
- Show actual usage

### Store Materials
- [ ] Privacy policy is live at thedailymatrix.com/privacy
- [ ] Test extension on Chrome
- [ ] Test extension on Firefox
- [ ] Read through PUBLISHING.md
- [ ] Have $5 ready for Chrome Web Store fee

### Developer Accounts
- [ ] Chrome Web Store developer account created
- [ ] Firefox Add-ons developer account created
- [ ] (Optional) Microsoft Edge Add-ons account

## Packaging

```bash
cd browser-extension
./package-extension.sh
```

This creates `daily-matrix-extension.zip` ready to upload!

## After Approval

- [ ] Tweet about it! 📢
- [ ] Add extension badge to website
- [ ] Add "Get Extension" link to homepage
- [ ] Share in artist communities
- [ ] Celebrate! 🎉

## Store Links (After Publishing)

- Chrome: `https://chrome.google.com/webstore/detail/[your-id]`
- Firefox: `https://addons.mozilla.org/firefox/addon/[your-slug]`
- Edge: `https://microsoftedge.microsoft.com/addons/detail/[your-id]`

---

**Current Status**: 
✅ Extension code complete
✅ Privacy policy live
⏳ Waiting for icons
⏳ Need screenshots
⏳ Need to submit

**Timeline:**
- Chrome: Review takes 1-3 days
- Firefox: Review takes 1-3 days
- Edge: Review takes 24-48 hours

Good luck! 🔥
