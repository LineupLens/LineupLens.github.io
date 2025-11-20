/**
 * LineupLens - Main Application Controller
 * 
 * Entry point for the application. Coordinates between modules and handles navigation.
 */

import { StateManager } from './state.js';
import { AuthManager } from './auth.js';
import { SpotifyAPI } from './api.js';
import { StorageManager } from './storage.js';
import { CSVParser } from './csv-parser.js';
import { Matcher } from './matcher.js';
import { UIManager } from './ui.js';

/**
 * Main App Class
 */
class App {
  constructor() {
    this.state = new StateManager();
    this.auth = new AuthManager(this.state);
    this.storage = new StorageManager();
    this.csvParser = new CSVParser();
    this.matcher = new Matcher();
    this.ui = new UIManager();
    this.api = null; // Will be initialized when we have an access token
    
    // Festival configuration (alphabetically ordered by name)
    this.festivalConfig = {
      beyondchi: {
        csv: 'data/festivals/beyondchi_spotify_matches.csv',
        name: 'Beyond Wonderland Chicago 2025',
        image: 'data/images/beyondchi_2025_lineup.jpg'
      },
      beyondsocal: {
        csv: 'data/festivals/beyondsocal_spotify_matches.csv',
        name: 'Beyond Wonderland SoCal 2025',
        image: 'data/images/beyondsocal_2025_lineup.jpg'
      },
      coachella: {
        csv: 'data/festivals/coachella_spotify_matches.csv',
        name: 'Coachella 2025',
        image: 'data/images/coachella_2025_lineup.jpg'
      },
      edclv: {
        csv: 'data/festivals/edc_spotify_matches.csv',
        name: 'EDC Las Vegas 2025',
        image: 'data/images/edclv_2025_lineup.png'
      },
      eforest: {
        csv: 'data/festivals/eforest_spotify_matches.csv',
        name: 'Electric Forest 2025',
        image: 'data/images/eforest_2025_lineup.jpg'
      },
      glastonbury: {
        csv: 'data/festivals/glastonbury_spotify_matches.csv',
        name: 'Glastonbury 2025',
        image: 'data/images/glastonbury_2025_lineup.jpg'
      },
      hard: {
        csv: 'data/festivals/hardsummer_spotify_matches.csv',
        name: 'Hard Summer 2025',
        image: 'data/images/hard_2025_lineup.png'
      },
      lolla: {
        csv: 'data/festivals/lolla_spotify_matches.csv',
        name: 'Lollapalooza 2025',
        image: 'data/images/lolla_2025_lineup.png'
      },
      northcoast: {
        csv: 'data/festivals/ncmf_spotify_matches.csv',
        name: 'North Coast 2025 (Phase 1)',
        image: 'data/images/northcoast_2025_lineup.png'
      },
      sziget: {
        csv: 'data/festivals/sziget_spotify_matches.csv',
        name: 'Sziget 2025',
        image: 'data/images/sziget_2025_lineup.webp'
      },
      ultra: {
        csv: 'data/festivals/ultra_spotify_matches.csv',
        name: 'Ultra Miami 2025',
        image: 'data/images/ultra_2025_lineup.png'
      }
    };
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('LineupLens v2.0 - Initializing...');
    
    try {
      // Check for OAuth callback
      await this.handleOAuthCallback();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Check authentication status
      await this.checkAuthentication();
      
      // Initialize storage
      await this.storage.initDB();
      
      console.log('App initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      this.handleError(error);
    }
  }

  /**
   * Handle OAuth callback from Spotify
   */
  async handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      this.handleError(new Error(`Authentication failed: ${error}`));
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Handle OAuth callback
    if (code && state) {
      try {
        this.showLoading('Completing authentication...');
        await this.auth.handleCallback(code, state);
        
        // Fetch user profile
        const accessToken = await this.auth.getAccessToken();
        this.api = new SpotifyAPI(accessToken);
        const user = await this.api.getUserProfile();
        
        // Update state
        this.state.setState({
          user: user,
          isAuthenticated: true
        });
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Navigate to festivals page
        this.navigateTo('festivals');
        this.hideLoading();
      } catch (error) {
        console.error('OAuth callback error:', error);
        this.handleError(error);
        this.hideLoading();
      }
    }
  }

  /**
   * Check authentication status and restore session
   */
  async checkAuthentication() {
    try {
      const isAuthenticated = await this.auth.isAuthenticated();
      
      if (isAuthenticated) {
        const accessToken = await this.auth.getAccessToken();
        this.api = new SpotifyAPI(accessToken);
        
        // Get user profile if not in state
        if (!this.state.getState().user) {
          const user = await this.api.getUserProfile();
          this.state.setState({ user: user });
        }
        
        // Navigate to appropriate page
        const state = this.state.getState();
        const currentPage = state.currentPage;
        
        if (currentPage === 'landing') {
          this.navigateTo('festivals');
        } else if (currentPage === 'results' && state.currentFestival) {
          // If on results page, restore it first
          this.navigateTo('results');
          // Then reload matches in background to reflect any changes (don't await to avoid blocking)
          // Use setTimeout to ensure navigation completes first
          setTimeout(() => {
            this.reloadMatches(state.currentFestival).catch(err => {
              console.error('Background reload error:', err);
            });
          }, 100);
        } else {
          this.navigateTo(currentPage);
        }
      } else {
        this.navigateTo('landing');
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      this.navigateTo('landing');
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Landing page - Spotify login button
    const loginButton = document.getElementById('spotify-login');
    if (loginButton) {
      loginButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.auth.initiateLogin();
      });
    }

    // Festivals page - Generate results button
    const generateButton = document.getElementById('generate-results');
    if (generateButton) {
      generateButton.addEventListener('click', () => {
        this.handleGenerateResults();
      });
    }

    // Results page - Back button
    const backButton = document.getElementById('back-to-festivals');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.navigateTo('festivals');
      });
    }

    // Lineup image click to enlarge
    const lineupImage = document.getElementById('lineup-image');
    if (lineupImage) {
      lineupImage.addEventListener('click', function() {
        window.open(this.src, '_blank');
      });
    }

    // Error dismiss button
    const errorDismiss = document.getElementById('error-dismiss');
    if (errorDismiss) {
      errorDismiss.addEventListener('click', () => {
        this.hideError();
      });
    }

    // Logout button
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        this.auth.logout();
      });
    }

    // Populate festival dropdown
    this.populateFestivalDropdown();
  }

  /**
   * Populate festival dropdown (alphabetically sorted)
   */
  populateFestivalDropdown() {
    const dropdown = document.getElementById('festival-dropdown');
    if (!dropdown) return;

    // Clear existing options (except first)
    while (dropdown.children.length > 1) {
      dropdown.removeChild(dropdown.lastChild);
    }

    // Convert to array and sort alphabetically by name
    const festivals = Object.entries(this.festivalConfig)
      .map(([id, config]) => ({ id, ...config }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Add festival options in alphabetical order
    festivals.forEach(festival => {
      const option = document.createElement('option');
      option.value = festival.id;
      option.textContent = festival.name;
      dropdown.appendChild(option);
    });
  }

  /**
   * Reload matches for a festival (used when refreshing on results page)
   * @param {string} festivalId - Festival identifier
   */
  async reloadMatches(festivalId) {
    try {
      // Make sure API is initialized
      if (!this.api) {
        const accessToken = await this.auth.getAccessToken();
        this.api = new SpotifyAPI(accessToken);
      }
      
      // Load festival data (force refresh to get latest CSV changes)
      const festivalData = await this.loadFestivalData(festivalId, true);
      
      // Fetch liked songs
      const likedSongs = await this.fetchLikedSongs();
      
      // Match artists
      const matches = this.matcher.matchArtists(likedSongs, festivalData);
      
      // Update state
      this.state.setState({
        matches: matches,
        currentFestival: festivalId
      });
      
      // Display results
      this.displayResults(festivalId, matches, festivalData, likedSongs.length);
    } catch (error) {
      console.error('Error reloading matches:', error);
      // Don't show error to user on background reload, just log it
    }
  }

  /**
   * Handle generate results button click
   */
  async handleGenerateResults() {
    const dropdown = document.getElementById('festival-dropdown');
    const festivalId = dropdown?.value;

    if (!festivalId) {
      alert('Please select a festival');
      return;
    }

    try {
      this.showLoading('Loading festival data...');
      this.state.setState({ 
        currentFestival: festivalId,
        isLoading: true,
        loadingMessage: 'Loading festival data...'
      });

      // Load festival data (force refresh to get latest CSV changes)
      const festivalData = await this.loadFestivalData(festivalId, true);
      
      // Fetch liked songs
      this.updateLoadingMessage('Fetching your liked songs...');
      const likedSongs = await this.fetchLikedSongs();
      
      // Match artists
      this.updateLoadingMessage('Finding your matches...');
      const matches = this.matcher.matchArtists(likedSongs, festivalData);
      
      // Update state
      this.state.setState({
        matches: matches,
        isLoading: false
      });
      
      // Display results
      this.displayResults(festivalId, matches, festivalData, likedSongs.length);
      
      // Navigate to results page
      this.navigateTo('results');
      this.hideLoading();
    } catch (error) {
      console.error('Error generating results:', error);
      this.handleError(error);
      this.hideLoading();
    }
  }

  /**
   * Load festival data (from CSV or cache)
   * @param {string} festivalId - Festival identifier
   * @param {boolean} forceRefresh - Force reload from CSV (bypass cache)
   */
  async loadFestivalData(festivalId, forceRefresh = false) {
    const config = this.festivalConfig[festivalId];
    if (!config) {
      throw new Error(`Festival not found: ${festivalId}`);
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = await this.storage.getFestivalData(festivalId);
      if (cached) {
        // Also store in state for quick access
        const state = this.state.getState();
        this.state.setState({
          festivals: {
            ...state.festivals,
            [festivalId]: cached
          }
        });
        return cached;
      }
    }

    // Load from CSV (with cache busting to ensure fresh data)
    const csvUrl = config.csv + (forceRefresh ? `?t=${Date.now()}` : '');
    const festivalData = await this.csvParser.parseCSV(csvUrl, forceRefresh);
    
    // Cache the data
    await this.storage.saveFestivalData(festivalId, festivalData);
    
    // Also store in state for quick access
    const state = this.state.getState();
    this.state.setState({
      festivals: {
        ...state.festivals,
        [festivalId]: festivalData
      }
    });
    
    return festivalData;
  }

  /**
   * Fetch liked songs (from API or cache)
   */
  async fetchLikedSongs() {
    if (!this.api) {
      throw new Error('Not authenticated');
    }

    // Check cache first
    const cached = await this.storage.getLikedSongs();
    const syncMetadata = await this.storage.getSyncMetadata();
    
    // If we have cached songs and they're recent (less than 1 hour old), use cache
    if (cached && cached.length > 0 && syncMetadata) {
      const cacheAge = Date.now() - syncMetadata.lastSyncTime;
      const oneHour = 60 * 60 * 1000;
      
      if (cacheAge < oneHour) {
        console.log(`Using cached songs (${cached.length} songs, ${Math.round(cacheAge / 1000 / 60)} minutes old)`);
        this.updateLoadingMessage(`Using cached songs (${cached.length} total)`);
        
        // Update state with cached songs
        this.state.setState({ likedSongs: cached });
        return cached;
      }
    }
    
    // Fetch fresh from API (optimized sequential - no delays, rate limits handled automatically)
    this.updateLoadingMessage('Fetching your liked songs...');
    const songs = await this.api.getAllLikedSongs((current, total) => {
      // Combine message and progress into one line
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      const message = `Loading liked songs... ${current} of ${total} (${percentage}%)`;
      this.updateLoadingMessage(message);
      const progress = { current, total };
      this.state.setState({ progress });
    });

    // Save to cache
    await this.storage.saveLikedSongs(songs);
    await this.storage.updateSyncMetadata({
      lastSyncTime: Date.now(),
      totalSongs: songs.length,
      lastFetchedPage: null
    });

    // Update state
    this.state.setState({ likedSongs: songs });

    return songs;
  }

  /**
   * Navigate to a specific page
   * @param {string} page - Page name ('landing', 'festivals', 'results')
   */
  navigateTo(page) {
    // Hide all pages
    document.getElementById('landing-page')?.classList.add('hidden');
    document.getElementById('festivals-page')?.classList.add('hidden');
    document.getElementById('results-page')?.classList.add('hidden');
    
    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
      pageElement.classList.remove('hidden');
      this.state.setState({ currentPage: page });
      
      // Update UI based on page
      if (page === 'festivals') {
        this.updateFestivalsPage();
      } else if (page === 'results') {
        // Results page is updated when results are generated
        const state = this.state.getState();
        if (state.matches && state.matches.length > 0 && state.currentFestival) {
          const config = this.festivalConfig[state.currentFestival];
          const festivalData = state.festivals[state.currentFestival];
          if (config && festivalData) {
            this.displayResults(
              state.currentFestival,
              state.matches,
              festivalData,
              state.likedSongs.length || 0
            );
          }
        }
      }
    }
  }

  /**
   * Update festivals page UI
   */
  updateFestivalsPage() {
    const state = this.state.getState();
    this.ui.renderFestivalsPage({ user: state.user });
    
    // Restore selected festival if we have one
    if (state.currentFestival) {
      const dropdown = document.getElementById('festival-dropdown');
      if (dropdown) {
        dropdown.value = state.currentFestival;
      }
    }
  }

  /**
   * Display results on results page
   * @param {string} festivalId - Festival ID
   * @param {Array} matches - Matched artists
   * @param {Object} festivalData - Festival data
   * @param {number} totalSongs - Total number of liked songs
   */
  displayResults(festivalId, matches, festivalData, totalSongs) {
    const config = this.festivalConfig[festivalId];
    const state = this.state.getState();

    this.ui.renderResultsPage({
      festival: config,
      matches: matches,
      totalArtists: festivalData.artistIds?.length || 0,
      totalSongs: totalSongs,
      user: state.user
    });
  }

  /**
   * Show loading indicator
   * @param {string} message - Loading message
   * @param {Object} progress - Progress object
   */
  showLoading(message = 'Loading...', progress = null) {
    this.ui.showLoading(message, progress);
    this.state.setState({ 
      isLoading: true,
      loadingMessage: message,
      progress: progress
    });
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.ui.hideLoading();
    this.state.setState({ 
      isLoading: false,
      loadingMessage: '',
      progress: null
    });
  }

  /**
   * Update loading message
   * @param {string} message - New loading message
   */
  updateLoadingMessage(message) {
    this.ui.updateLoadingMessage(message);
    this.state.setState({ loadingMessage: message });
  }

  /**
   * Show error message
   * @param {Error} error - Error object
   */
  showError(error) {
    this.ui.showError({
      title: 'Error',
      message: error.message || 'An error occurred',
      recoverable: false
    });
    
    this.state.setState({ 
      error: { 
        message: error.message || 'An error occurred', 
        type: 'error' 
      } 
    });
  }

  /**
   * Hide error message
   */
  hideError() {
    this.ui.hideError();
    this.state.setState({ error: null });
  }

  /**
   * Handle application errors
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('App Error:', error);
    this.showError(error);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
  
  // Make app globally available for debugging
  window.app = app;
});
