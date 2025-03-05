# LineupLens

LineupLens is a web application that helps music festival attendees discover which artists to prioritize based on their Spotify listening history. The app matches your liked songs on Spotify with festival lineups to identify which artists you're already familiar with.

## 🎵 Features

- Connect securely with your Spotify account
- View your matched artists from major music festivals
- Sort artists by number of liked songs
- View full festival lineups
- Completely client-side (no server storage of your data)

## 🎪 Supported Festivals

- EDC Las Vegas 2025
- North Coast 2025 (Phase 1)
- Coachella 2025
- (More coming soon!)

## 🚀 Live Demo

Check out the live application: [LineupLens](https://lineuplens.github.io/)

## 💻 Local Development

To run LineupLens locally:

1. Clone this repository
   ```
   git clone https://github.com/yourusername/LineupLens.github.io.git
   cd LineupLens.github.io
   ```

2. Set up the Spotify Developer Dashboard:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new app named "LineupLens"
   - Set the Redirect URI to `http://localhost:8000/`
   - Copy your Client ID

3. Update the configuration in `script.js`:
   ```javascript
   const CLIENT_ID = 'your-client-id-here';
   ```

4. Start a local web server:
   ```
   python -m http.server 8000
   ```
   (or use any other local web server)

5. Visit `http://localhost:8000` in your browser

## 🔒 Privacy

LineupLens respects your privacy:
- We don't store your Spotify data on any servers
- Processing happens in your browser
- Your access token is only stored temporarily in your browser session
- See our [Privacy Policy](privacy-policy.html) for more details

## ⚙️ Technical Details

LineupLens uses:
- Spotify Web API for authentication and data retrieval
- Client-side JavaScript for processing
- CSV files for festival lineup data
- Responsive design with CSS

## 👨‍💻 Created By

Built by Alex Kim

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📣 Disclaimer

LineupLens is not affiliated with Spotify. This app uses the Spotify API in compliance with [Spotify's Developer Terms](https://developer.spotify.com/terms).
