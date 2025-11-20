/**
 * CSV Parser Module
 * 
 * Handles CSV file parsing and validation using PapaParse
 */

export class CSVParser {
  constructor() {
    // Check if PapaParse is available
    if (typeof Papa === 'undefined') {
      console.warn('PapaParse not loaded. Loading from CDN...');
      this.loadPapaParse();
    }
  }

  /**
   * Load PapaParse from CDN if not available
   */
  loadPapaParse() {
    return new Promise((resolve, reject) => {
      if (typeof Papa !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load PapaParse'));
      document.head.appendChild(script);
    });
  }

  /**
   * Fetch and parse CSV file from URL
   * @param {string} url - CSV file URL
   * @param {boolean} noCache - If true, bypass browser cache
   * @returns {Promise<Array>} Parsed CSV data
   */
  async fetchAndParse(url, noCache = false) {
    // Ensure PapaParse is loaded
    if (typeof Papa === 'undefined') {
      await this.loadPapaParse();
    }

    // If noCache is true, fetch manually with cache control, then parse
    if (noCache) {
      try {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();
        
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
            transform: (value) => value.trim(),
            complete: (results) => {
              if (results.errors.length > 0) {
                console.warn('CSV parsing warnings:', results.errors);
              }
              resolve(results.data);
            },
            error: (error) => {
              reject(new Error(`Failed to parse CSV: ${error.message}`));
            }
          });
        });
      } catch (error) {
        throw new Error(`Failed to fetch CSV: ${error.message}`);
      }
    }

    // Default: use PapaParse's built-in download
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        }
      });
    });
  }

  /**
   * Validate CSV data structure
   * @param {Array} data - Parsed CSV data
   * @returns {boolean} True if valid
   */
  validateCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }

    // Check required columns
    const requiredColumns = ['Original Name', 'Matched Name', 'Spotify ID'];
    const firstRow = data[0];
    const headers = Object.keys(firstRow);

    for (const column of requiredColumns) {
      if (!headers.includes(column)) {
        console.error(`Missing required column: ${column}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate required columns exist
   * @param {Array<string>} headers - Column headers
   * @returns {boolean} True if all required columns present
   */
  validateRequiredColumns(headers) {
    const required = ['Original Name', 'Matched Name', 'Spotify ID'];
    return required.every(col => headers.includes(col));
  }

  /**
   * Validate Spotify ID format
   * @param {string} id - Spotify ID to validate
   * @returns {boolean} True if valid format
   */
  validateSpotifyID(id) {
    if (!id || typeof id !== 'string') {
      return false;
    }
    // Spotify IDs are 22 alphanumeric characters
    return /^[A-Za-z0-9]{22}$/.test(id.trim());
  }

  /**
   * Transform parsed CSV rows to festival data format
   * @param {Array} rows - Parsed CSV rows
   * @returns {Object} Festival data object
   */
  transformToFestivalData(rows) {
    const artistIds = [];
    const artistDetails = {};

    // Valid match types that should be included
    const validMatchTypes = ['exact', 'yes', 'c', 'add'];

    for (const row of rows) {
      const spotifyId = row['Spotify ID']?.trim();
      const originalName = row['Original Name']?.trim();
      const matchedName = row['Matched Name']?.trim();
      const matchType = row['Match Type']?.trim().toLowerCase();

      // Skip rows without Spotify ID
      if (!spotifyId || spotifyId === 'null' || spotifyId === '') {
        continue;
      }

      // Only include rows with valid match types
      // Valid types: "exact", "yes", "c" (corrected), "add" (manually added)
      if (matchType && !validMatchTypes.includes(matchType)) {
        console.log(`Skipping row with invalid match type: ${originalName} (Match Type: ${matchType})`);
        continue;
      }

      // Validate Spotify ID format
      if (!this.validateSpotifyID(spotifyId)) {
        console.warn(`Invalid Spotify ID format: ${spotifyId} for artist: ${originalName}`);
        continue;
      }

      // Add to artist IDs array (avoid duplicates)
      if (!artistIds.includes(spotifyId)) {
        artistIds.push(spotifyId);
      }

      // Store artist details
      artistDetails[spotifyId] = {
        originalName: originalName || matchedName || 'Unknown Artist',
        matchedName: matchedName || originalName || 'Unknown Artist',
        matchType: matchType || 'unknown'
      };
    }

    return {
      artistIds,
      artistDetails
    };
  }

  /**
   * Parse CSV file from URL and transform to festival data
   * @param {string} url - CSV file URL
   * @param {boolean} noCache - If true, bypass browser cache
   * @returns {Promise<Object>} Festival data object
   */
  async parseCSV(url, noCache = false) {
    try {
      // Fetch and parse CSV
      const rows = await this.fetchAndParse(url, noCache);

      // Validate CSV structure
      if (!this.validateCSV(rows)) {
        throw new Error('Invalid CSV structure. Missing required columns.');
      }

      // Transform to festival data format
      const festivalData = this.transformToFestivalData(rows);

      if (festivalData.artistIds.length === 0) {
        throw new Error('No valid artists found in CSV file.');
      }

      return festivalData;
    } catch (error) {
      console.error('CSV parsing error:', error);
      throw new Error(`Failed to parse CSV file: ${error.message}`);
    }
  }
}
