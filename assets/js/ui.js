/**
 * UI Manager Module
 * 
 * Handles UI rendering and updates
 */

export class UIManager {
  constructor() {
    // Initialize UI manager
  }

  /**
   * Render a page
   * @param {string} page - Page name
   * @param {Object} data - Data for the page
   */
  renderPage(page, data) {
    switch (page) {
      case 'landing':
        this.renderLandingPage();
        break;
      case 'festivals':
        this.renderFestivalsPage(data);
        break;
      case 'results':
        this.renderResultsPage(data);
        break;
    }
  }

  /**
   * Render landing page
   */
  renderLandingPage() {
    // Landing page is static, no dynamic rendering needed
  }

  /**
   * Render festivals page
   * @param {Object} data - User data
   */
  renderFestivalsPage(data) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && data?.user) {
      userNameElement.textContent = data.user.display_name || 'music fan';
    }
  }

  /**
   * Render results page
   * @param {Object} data - Results data
   */
  renderResultsPage(data) {
    const { festival, matches, totalArtists, totalSongs, user } = data;

    // Update festival title
    const festivalTitle = document.getElementById('festival-title');
    if (festivalTitle && festival) {
      festivalTitle.textContent = `Your ${festival.name} Matches`;
    }

    // Update results title
    const resultsTitle = document.getElementById('results-title');
    if (resultsTitle && user) {
      const userName = user.display_name || 'Your';
      // Add apostrophe for possessive, but not for "Your"
      resultsTitle.textContent = userName === 'Your' 
        ? 'Your Top Artists' 
        : `${userName}'s Top Artists`;
    }

    // Update results description
    const resultsDescription = document.getElementById('results-description');
    if (resultsDescription) {
      const matchCount = matches?.length || 0;
      resultsDescription.textContent = 
        `Matched ${matchCount} out of ${totalArtists || 0} artists based on ${totalSongs || 0} songs in your library`;
    }

    // Display lineup image if available
    if (festival?.image) {
      const lineupImage = document.getElementById('lineup-image');
      const lineupContainer = document.getElementById('lineup-container');
      if (lineupImage && lineupContainer) {
        // Set image source (path is relative to public/ directory)
        lineupImage.src = festival.image;
        lineupImage.alt = `${festival.name} Lineup`;
        
        // Handle image load errors
        lineupImage.onerror = () => {
          console.warn(`Failed to load lineup image: ${festival.image}`);
          lineupContainer.classList.add('hidden');
        };
        
        // Show container when image loads successfully
        lineupImage.onload = () => {
          lineupContainer.classList.remove('hidden');
        };
        
        // If image is already loaded (cached), show it
        if (lineupImage.complete) {
          lineupContainer.classList.remove('hidden');
        }
      }
    } else {
      // Hide container if no image
      const lineupContainer = document.getElementById('lineup-container');
      if (lineupContainer) {
        lineupContainer.classList.add('hidden');
      }
    }

    // Render artist list
    this.renderArtistList(matches || []);
  }

  /**
   * Render artist list
   * @param {Array} matches - Matched artists
   */
  renderArtistList(matches) {
    const artistList = document.getElementById('artist-list');
    if (!artistList) return;

    artistList.innerHTML = ''; // Clear previous results

    if (matches.length === 0) {
      const noMatchesItem = document.createElement('li');
      noMatchesItem.classList.add('no-matches');
      noMatchesItem.textContent = 'No matches found. Try selecting a different festival!';
      artistList.appendChild(noMatchesItem);
      return;
    }

    matches.forEach((artist, index) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = this.createArtistItemHTML(artist);
      artistList.appendChild(listItem);
    });
  }

  /**
   * Create HTML for artist list item
   * @param {Object} artist - Artist data
   * @returns {string} HTML string
   */
  createArtistItemHTML(artist) {
    const { spotifyId, name, originalName, matchedName, likedSongs } = artist;
    
    // Show matched name as subtitle if different from original
    let subtitleHtml = '';
    if (matchedName && originalName !== matchedName) {
      subtitleHtml = `<span class="matched-name">(${matchedName})</span>`;
    }

    return `
      <div class="artist-item">
        <div class="artist-name">
          <a href="https://open.spotify.com/artist/${spotifyId}" target="_blank" rel="noopener noreferrer">
            <img src="assets/images/spotify-icon.png" alt="Spotify" class="spotify-icon">
            ${originalName || name}
          </a>
          ${subtitleHtml}
        </div>
        <div class="artist-count">${likedSongs} liked song${likedSongs === 1 ? '' : 's'}</div>
      </div>
    `;
  }

  /**
   * Show loading state
   * @param {string} message - Loading message
   * @param {Object} progress - Progress object {current, total} (deprecated - use message with progress)
   */
  showLoading(message = 'Loading...', progress = null) {
    const loading = document.getElementById('loading');
    const status = document.getElementById('loading-status');
    const progressElement = document.getElementById('loading-progress');

    if (loading) loading.classList.remove('hidden');
    if (status) status.textContent = message;

    // Hide progress element - progress is now included in the message
    if (progressElement) {
      progressElement.classList.add('hidden');
    }
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    const loading = document.getElementById('loading');
    const progressElement = document.getElementById('loading-progress');

    if (loading) loading.classList.add('hidden');
    if (progressElement) progressElement.classList.add('hidden');
  }

  /**
   * Update loading message
   * @param {string} message - New loading message
   */
  updateLoadingMessage(message) {
    const status = document.getElementById('loading-status');
    if (status) status.textContent = message;
  }

  /**
   * Update progress indicator (deprecated - progress now included in message)
   * @param {number} current - Current progress
   * @param {number} total - Total items
   */
  updateProgress(current, total) {
    // Progress is now included in the loading message, so this is a no-op
    // Kept for backwards compatibility
  }

  /**
   * Show error message
   * @param {Object} error - Error object
   */
  showError(error) {
    const errorDisplay = document.getElementById('error-display');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const errorRetry = document.getElementById('error-retry');

    if (errorDisplay) errorDisplay.classList.remove('hidden');
    if (errorTitle) errorTitle.textContent = error.title || 'Error';
    if (errorMessage) {
      errorMessage.textContent = error.message || 'An error occurred';
    }

    // Show retry button for recoverable errors
    if (errorRetry) {
      if (error.recoverable) {
        errorRetry.classList.remove('hidden');
        errorRetry.onclick = error.onRetry || null;
      } else {
        errorRetry.classList.add('hidden');
      }
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) errorDisplay.classList.add('hidden');
  }

  /**
   * Show empty state
   * @param {string} type - Type of empty state
   * @param {string} message - Custom message
   */
  showEmptyState(type, message) {
    const artistList = document.getElementById('artist-list');
    if (!artistList) return;

    artistList.innerHTML = '';

    const emptyItem = document.createElement('li');
    emptyItem.classList.add('no-matches');

    switch (type) {
      case 'no_matches':
        emptyItem.textContent = message || 'No matches found. Try selecting a different festival!';
        break;
      case 'no_songs':
        emptyItem.textContent = message || 'You don\'t have any liked songs. Like some songs on Spotify and try again!';
        break;
      case 'no_festivals':
        emptyItem.textContent = message || 'No festivals available.';
        break;
      default:
        emptyItem.textContent = message || 'No data available.';
    }

    artistList.appendChild(emptyItem);
  }
}
