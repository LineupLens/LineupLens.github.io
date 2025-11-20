/**
 * Authentication Module
 * 
 * Handles Spotify OAuth authentication using Authorization Code Flow with PKCE
 */

import { StorageManager } from './storage.js';

export class AuthManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.storage = new StorageManager();
    this.config = window.CONFIG || {};
  }

  /**
   * Generate a random code verifier for PKCE
   * @returns {string} Code verifier
   */
  generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Generate code challenge from verifier
   * @param {string} verifier - Code verifier
   * @returns {Promise<string>} Code challenge
   */
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  /**
   * Base64 URL encode
   * @param {Uint8Array} array - Array to encode
   * @returns {string} Base64 URL encoded string
   */
  base64UrlEncode(array) {
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate random state for CSRF protection
   * @returns {string} Random state string
   */
  generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Initiate Spotify login
   * @returns {Promise<void>}
   */
  async initiateLogin() {
    try {
      // Generate PKCE codes
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateState();

      // Store verifier and state in sessionStorage
      this.storage.saveSession('pkce_verifier', codeVerifier);
      this.storage.saveSession('oauth_state', state);

      // Build authorization URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: this.config.SPOTIFY_CLIENT_ID,
        scope: this.config.SPOTIFY_SCOPES || 'user-library-read user-read-email user-read-private',
        redirect_uri: this.config.SPOTIFY_REDIRECT_URI,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state: state
      });

      const authUrl = `${this.config.SPOTIFY_AUTH_BASE || 'https://accounts.spotify.com'}/authorize?${params.toString()}`;

      // Redirect to Spotify authorization
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating login:', error);
      throw new Error('Failed to initiate login. Please try again.');
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Promise<void>}
   */
  async handleCallback(code, state) {
    try {
      // Verify state
      const storedState = this.storage.getSession('oauth_state');
      if (!storedState || storedState !== state) {
        throw new Error('Invalid state parameter. Possible CSRF attack.');
      }

      // Get code verifier
      const codeVerifier = this.storage.getSession('pkce_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please try logging in again.');
      }

      // Exchange code for token
      const tokens = await this.exchangeCodeForToken(code, codeVerifier);

      // Store tokens
      this.saveTokens(tokens);

      // Clear temporary OAuth data
      this.storage.clearSession('pkce_verifier');
      this.storage.clearSession('oauth_state');

      return tokens;
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code
   * @param {string} codeVerifier - Code verifier
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code, codeVerifier) {
    const tokenUrl = `${this.config.SPOTIFY_AUTH_BASE || 'https://accounts.spotify.com'}/api/token`;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.config.SPOTIFY_REDIRECT_URI,
      client_id: this.config.SPOTIFY_CLIENT_ID,
      code_verifier: codeVerifier
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error_description || `Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code. Please try again.');
    }
  }

  /**
   * Save tokens to storage and state
   * @param {Object} tokens - Token object
   */
  saveTokens(tokens) {
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);

    // Save to sessionStorage
    this.storage.saveSession('spotify_access_token', tokens.accessToken);
    this.storage.saveSession('spotify_refresh_token', tokens.refreshToken);
    this.storage.saveSession('spotify_token_expires_at', expiresAt);

    // Update state
    this.state.setState({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: expiresAt
    });
  }

  /**
   * Get stored tokens
   * @returns {Object|null} Tokens or null
   */
  getStoredTokens() {
    const accessToken = this.storage.getSession('spotify_access_token');
    const refreshToken = this.storage.getSession('spotify_refresh_token');
    const expiresAt = this.storage.getSession('spotify_token_expires_at');

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt
    };
  }

  /**
   * Check if token is expired
   * @param {number} expiresAt - Expiration timestamp
   * @returns {boolean} True if expired
   */
  isTokenExpired(expiresAt) {
    if (!expiresAt) return true;
    // Add 5 minute buffer
    return Date.now() >= (expiresAt - 5 * 60 * 1000);
  }

  /**
   * Refresh access token
   * @returns {Promise<string>} New access token
   */
  async refreshToken() {
    const tokens = this.getStoredTokens();
    
    if (!tokens || !tokens.refreshToken) {
      throw new Error('No refresh token available. Please log in again.');
    }

    const tokenUrl = `${this.config.SPOTIFY_AUTH_BASE || 'https://accounts.spotify.com'}/api/token`;

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: this.config.SPOTIFY_CLIENT_ID
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error_description || `Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const expiresAt = Date.now() + (data.expires_in * 1000);

      // Update tokens
      this.storage.saveSession('spotify_access_token', data.access_token);
      this.storage.saveSession('spotify_token_expires_at', expiresAt);

      // Update refresh token if provided
      if (data.refresh_token) {
        this.storage.saveSession('spotify_refresh_token', data.refresh_token);
      }

      // Update state
      this.state.setState({
        accessToken: data.access_token,
        tokenExpiresAt: expiresAt,
        refreshToken: data.refresh_token || tokens.refreshToken
      });

      return data.access_token;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, user needs to log in again
      this.logout();
      throw new Error('Token refresh failed. Please log in again.');
    }
  }

  /**
   * Get valid access token (refreshes if needed)
   * @returns {Promise<string>} Valid access token
   */
  async getAccessToken() {
    const tokens = this.getStoredTokens();

    if (!tokens) {
      return null;
    }

    // Check if token is expired
    if (this.isTokenExpired(tokens.expiresAt)) {
      try {
        return await this.refreshToken();
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return tokens.accessToken;
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>} True if authenticated
   */
  async isAuthenticated() {
    const token = await this.getAccessToken();
    return token !== null;
  }

  /**
   * Logout user
   */
  logout() {
    // Clear tokens from storage
    this.storage.clearSession('spotify_access_token');
    this.storage.clearSession('spotify_refresh_token');
    this.storage.clearSession('spotify_token_expires_at');

    // Clear state
    this.state.clear();

    // Redirect to landing page
    window.location.href = window.location.origin;
  }
}
