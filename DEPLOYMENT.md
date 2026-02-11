# GitHub Pages Deployment Guide

This project is configured to automatically deploy to GitHub Pages.

## Quick Setup

### 1. Push to GitHub

If you haven't already created a GitHub repository:

1. Go to https://github.com/new
2. Create a new repository named `entropic_noise`
3. **Don't** initialize with README (we already have one)

### 2. Push your code

Using **GitHub Desktop** (easiest):
1. Open GitHub Desktop
2. File → Add Local Repository
3. Select `c:\dev\entropic_noise`
4. Publish repository (or push if already connected)

**OR** using **Git command line** (if you have git installed):
```bash
git init
git add .
git commit -m "Initial commit with GitHub Pages deployment"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/entropic_noise.git
git push -u origin main
```

### 3. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under "Build and deployment":
   - Source: **GitHub Actions**
   - The workflow will automatically deploy on every push!

### 4. Wait for deployment

- First deployment takes ~2-3 minutes
- Check the **Actions** tab to see progress
- Once complete, your site will be live at:
  ```
  https://YOURUSERNAME.github.io/entropic_noise/
  ```

## What's Configured

✅ `.nojekyll` - Prevents Jekyll processing  
✅ `.github/workflows/deploy.yml` - Automatic deployment workflow  
✅ `.gitignore` - Ignores unnecessary files  

## Files Deployed

The workflow deploys everything in the `/dist` folder:
- `index.html` - Main app
- `entropic_noise.js` - Core logic
- `entropy_classes.js` - Walker classes
- `ui.js` - UI controls
- `style.css` - Styling
- `tweakpane.min.js` - UI library
- `preset_brush/` - All preset files
- `img/` - Sample images

## Updating Your Site

Every time you push to the `main` (or `master`) branch, GitHub will automatically:
1. Run the deployment workflow
2. Deploy the updated `/dist` folder
3. Update your live site in ~2-3 minutes

## Custom Domain (Optional)

If you have a custom domain:
1. Go to Settings → Pages
2. Add your custom domain
3. Configure DNS with your domain provider
4. GitHub will handle HTTPS automatically

## Troubleshooting

**Deployment failed?**
- Check the Actions tab for error details
- Make sure GitHub Pages is enabled in Settings
- Verify the source is set to "GitHub Actions"

**404 Error?**
- Wait a few minutes after first push
- Check that `dist/index.html` exists
- Clear your browser cache

**Changes not showing?**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Wait 2-3 minutes for GitHub to rebuild
- Check Actions tab to see if deployment completed

## Local Development

To test locally:
1. Open `dist/index.html` directly in a browser, OR
2. Use the included server: `.\tools\serve.ps1`

The live site will always match what's in your `/dist` folder!
