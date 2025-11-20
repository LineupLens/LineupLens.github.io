/**
 * Spotify API Client Module
 * 
 * Handles all Spotify Web API requests with rate limiting and error handling
 */

export class SpotifyAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  /**
   * Make API request with error handling and rate limiting
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} API response data
   */
  async makeRequest(url, options = {}) {
    const { accessToken = this.accessToken, ...fetchOptions } = options;

    if (!accessToken) {
      throw new Error('Access token required');
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...fetchOptions.headers
      }
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '3', 10);
      console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
      
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Retry the request
      return this.makeRequest(url, options);
    }

    // Handle errors
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.error_description || errorMessage;
      } catch (e) {
        // If response is not JSON, use status text
      }

      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (response.status === 403) {
        throw new Error('Access forbidden. Please check your permissions.');
      } else if (response.status >= 500) {
        throw new Error('Spotify API error. Please try again later.');
      } else {
        throw new Error(errorMessage);
      }
    }

    return response.json();
  }

  /**
   * Get current user's profile
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile() {
    const url = `${this.baseURL}/me`;
    return this.makeRequest(url);
  }

  /**
   * Get user's liked songs (paginated)
   * @param {Object} options - Fetch options
   * @param {number} options.limit - Number of items per page (max 50)
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<Object>} Paginated response with songs
   */
  async getLikedSongs(options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    const url = `${this.baseURL}/me/tracks?limit=${limit}&offset=${offset}`;
    return this.makeRequest(url);
  }

  /**
   * Fetch all liked songs (handles pagination automatically)
   * Optimized sequential approach - faster than parallel due to rate limit handling
   * @param {Function} onProgress - Optional progress callback (current, total)
   * @returns {Promise<Array>} All liked songs
   */
  async getAllLikedSongs(onProgress) {
    const allSongs = [];
    let nextUrl = `${this.baseURL}/me/tracks?limit=50`;
    let totalSongs = 0;
    let fetchedCount = 0;

    while (nextUrl) {
      try {
        const data = await this.makeRequest(nextUrl);
        
        allSongs.push(...data.items);
        totalSongs = data.total;
        fetchedCount += data.items.length;
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(fetchedCount, totalSongs);
        }

        // Get next page URL
        nextUrl = data.next;
        
        // No delay - let rate limiting handle itself if needed
        // The makeRequest function will handle rate limits automatically
      } catch (error) {
        console.error('Error fetching liked songs:', error);
        throw error;
      }
    }

    return allSongs;
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @param {string} clientId - Spotify client ID
   * @returns {Promise<Object>} New token data
   */
  async refreshAccessToken(refreshToken, clientId) {
    const tokenUrl = 'https://accounts.spotify.com/api/token';

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    });

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

    return response.json();
  }

  /**
   * Retry request with exponential backoff
   * @param {Function} requestFn - Function that returns a promise
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} baseDelay - Base delay in milliseconds
   * @returns {Promise<any>} Request result
   */
  async retryRequest(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry on authentication errors
        if (error.message.includes('Authentication failed') || 
            error.message.includes('401')) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
