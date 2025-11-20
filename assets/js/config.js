/**
 * LineupLens Configuration
 * 
 * IMPORTANT: Update these values with your Spotify App credentials
 * Get your Client ID from: https://developer.spotify.com/dashboard/
 * 
 * NOTE: This app is for personal/friends use only due to Spotify API rate limits.
 * Extended quota mode is not available for individual developers.
 */

// Detect environment (development vs production)
const isProduction = window.location.hostname !== 'localhost' && 
                     window.location.hostname !== '127.0.0.1';

// Configuration object
window.CONFIG = {
  // Spotify Client ID
  // Replace with your actual Client ID from Spotify Developer Dashboard
  SPOTIFY_CLIENT_ID: isProduction 
    ? '3aad6a64945f40f988872463af9012ee'
    : '3aad6a64945f40f988872463af9012ee',
  
  // Redirect URI (must match exactly what's configured in Spotify Dashboard)
  SPOTIFY_REDIRECT_URI: window.location.origin + '/',
  
  // Scopes required for the application
  SPOTIFY_SCOPES: 'user-library-read user-read-email user-read-private',
  
  // API Base URL
  SPOTIFY_API_BASE: 'https://api.spotify.com/v1',
  SPOTIFY_AUTH_BASE: 'https://accounts.spotify.com',
  
  // App Information
  APP_NAME: 'LineupLens',
  APP_VERSION: '2.0.0'
};

// Validation
if (!window.CONFIG.SPOTIFY_CLIENT_ID || 
    window.CONFIG.SPOTIFY_CLIENT_ID.includes('YOUR_')) {
  console.warn('⚠️ Spotify Client ID not configured! Please update config.js');
}

