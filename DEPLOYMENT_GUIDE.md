# LineupLens Deployment Guide

## Overview

This guide covers deploying LineupLens to GitHub Pages for personal/friends use.

## Prerequisites

- GitHub account
- Git installed locally
- Spotify Developer account
- Spotify App created in Dashboard

## Step 1: Spotify App Configuration

### Create Production Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Click "Create App"
3. Fill in:
   - **App name:** `LineupLens`
   - **App description:** `Personal tool to find which festival artists match your Spotify liked songs`
   - **Redirect URI:** `https://YOUR_USERNAME.github.io/` (replace with your GitHub username)
   - **Website:** (optional) Your GitHub Pages URL
4. Click "Save"
5. Copy the **Client ID**

### Update Redirect URIs

In your Spotify App settings, add these redirect URIs:
- `https://YOUR_USERNAME.github.io/` (production)
- `http://localhost:8000/` (local development)

**Important:** The redirect URI must match exactly, including the trailing slash.

## Step 2: Update Production Configuration

1. Open `public/config.js`
2. Replace `YOUR_PRODUCTION_CLIENT_ID_HERE` with your actual Client ID from Step 1
3. Save the file

```javascript
SPOTIFY_CLIENT_ID: isProduction 
  ? 'YOUR_ACTUAL_CLIENT_ID'  // Replace this
  : '3aad6a64945f40f988872463af9012ee',
```

## Step 3: GitHub Repository Setup

### Option A: User/Organization Site (Recommended)

1. Create a new repository named `YOUR_USERNAME.github.io`
   - Replace `YOUR_USERNAME` with your GitHub username
   - This will automatically deploy from the `main` branch root

2. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io.git
   cd YOUR_USERNAME.github.io
   ```

3. Copy all files from your LineupLens project to this repository:
   ```bash
   # From your LineupLens directory
   cp -r public/* /path/to/YOUR_USERNAME.github.io/
   cp -r docs /path/to/YOUR_USERNAME.github.io/
   cp README.md /path/to/YOUR_USERNAME.github.io/
   cp .gitignore /path/to/YOUR_USERNAME.github.io/
   ```

### Option B: Project Site

1. Create a repository with any name (e.g., `LineupLens`)
2. Enable GitHub Pages in Settings → Pages
3. Select source: `main` branch
4. Select folder: `/ (root)` or `/docs` (if using docs folder)

## Step 4: Deploy to GitHub Pages

### Initial Deployment

1. **Commit all files:**
   ```bash
   git add .
   git commit -m "Initial deployment of LineupLens"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Wait for deployment:**
   - GitHub Pages typically deploys within 1-2 minutes
   - Check deployment status: Repository → Actions tab

4. **Access your site:**
   - User site: `https://YOUR_USERNAME.github.io`
   - Project site: `https://YOUR_USERNAME.github.io/REPO_NAME`

### Updating Deployment

For future updates:

```bash
git add .
git commit -m "Update: description of changes"
git push origin main
```

GitHub Pages will automatically redeploy.

## Step 5: Verify Deployment

### Checklist

- [ ] Site is accessible at your GitHub Pages URL
- [ ] HTTPS is enabled (GitHub Pages provides this automatically)
- [ ] "Connect with Spotify" button appears
- [ ] Clicking login redirects to Spotify
- [ ] After authorization, redirects back to your site
- [ ] Authentication works correctly
- [ ] Festival selection works
- [ ] Matching works correctly
- [ ] No console errors (check browser DevTools)

### Testing

1. **Test Authentication:**
   - Click "Connect with Spotify"
   - Authorize the app
   - Verify you're redirected back
   - Verify your name appears

2. **Test Core Features:**
   - Select a festival
   - Click "Find My Matches"
   - Verify results display correctly

3. **Test on Mobile:**
   - Open site on mobile device
   - Test all features
   - Verify responsive design works

## Step 6: Share with Friends

### Sharing Options

1. **Direct Link:**
   - Share your GitHub Pages URL: `https://YOUR_USERNAME.github.io`

2. **Instructions for Friends:**
   - They need a Spotify account
   - They need to authorize the app
   - They can use it with their own liked songs

### Important Notes

- **Rate Limits:** Each user has their own rate limit (10,000 requests/hour)
- **Personal Use:** This app is for personal/friends use only
- **No Public Distribution:** Due to Spotify API rate limits, not suitable for mass distribution

## Troubleshooting

### Site Not Loading

- **Check deployment status:** Repository → Actions tab
- **Verify repository name:** Must be `USERNAME.github.io` for user sites
- **Check branch:** Must be `main` branch
- **Wait a few minutes:** Deployment can take 1-2 minutes

### Authentication Not Working

- **Check redirect URI:** Must match exactly in Spotify Dashboard
- **Verify Client ID:** Must be correct in `config.js`
- **Check HTTPS:** GitHub Pages provides HTTPS automatically
- **Clear browser cache:** Try incognito/private mode

### CORS Errors

- **Verify API endpoints:** Should be `https://api.spotify.com`
- **Check HTTPS:** All requests must use HTTPS
- **Verify token:** Token must be valid

### CSV Files Not Loading

- **Check file paths:** Must be relative to root
- **Verify file exists:** Check `public/data/festivals/` directory
- **Check browser console:** Look for 404 errors

## Custom Domain (Optional)

If you want to use a custom domain:

1. **Add CNAME file:**
   ```
   Create: public/CNAME
   Content: yourdomain.com
   ```

2. **Configure DNS:**
   - Add CNAME record: `www` → `YOUR_USERNAME.github.io`
   - Or A records: `@` → GitHub Pages IPs

3. **Update Spotify Redirect URI:**
   - Add `https://yourdomain.com/` to redirect URIs in Spotify Dashboard

4. **Enable in GitHub:**
   - Settings → Pages → Custom domain
   - Enter your domain

## Maintenance

### Regular Updates

- Update festival CSV files as needed
- Update code and push to GitHub
- GitHub Pages automatically redeploys

### Monitoring

- Check GitHub Pages deployment status
- Monitor browser console for errors
- Collect feedback from friends

## Security Notes

- **Client ID is public:** This is safe - it's meant to be public
- **No secrets in code:** Never commit Client Secret (not needed for PKCE)
- **HTTPS enforced:** GitHub Pages provides HTTPS automatically
- **Tokens stored securely:** Tokens stored in sessionStorage (cleared on logout)

## Support

For issues or questions:
- Check browser console for errors
- Review GitHub Pages deployment logs
- Check Spotify Developer Dashboard for API issues

