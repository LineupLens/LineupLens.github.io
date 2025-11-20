# LineupLens

**Match your Spotify liked songs with music festival lineups**

LineupLens is a personal tool for friends and family to discover which festival artists to prioritize by matching their Spotify listening history with festival lineups. The app provides personalized artist rankings based on the number of liked songs.

**Note:** This is a personal project for friends and family use only. Not intended for public distribution.

## 🎵 Features

- **Spotify Integration** - Connect securely with your Spotify account
- **Festival Matching** - Match your liked songs with festival lineups
- **Ranked Results** - Artists ranked by number of liked songs
- **Multiple Festivals** - Support for major music festivals
- **Privacy-First** - All processing happens in your browser
- **Mobile Responsive** - Works beautifully on all devices
- **Personal Use** - Designed for friends and family (not public distribution)

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Spotify account
- Local web server (for development)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/LineupLens/LineupLens.github.io.git
   cd LineupLens.github.io
   ```

2. **Configure Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
   - Create a new app
   - Copy your Client ID
   - Add redirect URI: `http://localhost:8000/`

3. **Update Configuration**
   - Open `config.js`
   - Update the development Client ID
   - For production, update the production Client ID

4. **Start Local Server**
   ```bash
   python3 -m http.server 8000
   ```

5. **Open in Browser**
   - Navigate to `http://localhost:8000`
   - Click "Connect with Spotify"
   - Start matching!

### Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions to GitHub Pages.

## 📁 Project Structure

```
LineupLens/
├── index.html         # Main HTML file
├── config.js          # Configuration (update with your Client ID)
├── assets/
│   ├── css/
│   │   └── main.css   # Main stylesheet
│   ├── js/            # JavaScript modules
│   └── images/        # Images and assets
├── data/
│   ├── festivals/     # Festival CSV data files
│   └── images/        # Festival lineup images
├── legal/             # Privacy Policy and Terms of Service
└── README.md          # This file
```

## 🛠️ Technology Stack

- **Frontend:** Vanilla JavaScript (ES6 Modules)
- **Styling:** CSS3 with CSS Variables
- **Storage:** IndexedDB + sessionStorage
- **API:** Spotify Web API
- **Hosting:** GitHub Pages

## 🎪 Supported Festivals

- Beyond Wonderland Chicago 2025
- Beyond Wonderland SoCal 2025
- Coachella 2025
- EDC Las Vegas 2025
- Electric Forest 2025
- Glastonbury 2025
- Hard Summer 2025
- Lollapalooza 2025
- North Coast 2025 (Phase 1)
- Sziget 2025
- Ultra Miami 2025

## 🔒 Privacy

LineupLens respects your privacy:
- All processing happens in your browser
- No server-side data storage
- Your data never leaves your device
- See [Privacy Policy](legal/privacy-policy.html) for details

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Created By

Alex Kim

## 📣 Disclaimer

LineupLens is not affiliated with Spotify. This app uses the Spotify API in compliance with [Spotify's Developer Terms](https://developer.spotify.com/terms).

## 🐛 Issues & Contributions

Found a bug or have a suggestion? Please open an issue on GitHub.
