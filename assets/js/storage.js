/**
 * Storage Module
 * 
 * Handles browser storage (sessionStorage + IndexedDB)
 * Provides abstraction for persistent data storage
 */

export class StorageManager {
  constructor() {
    this.dbName = 'lineuplens_db';
    this.dbVersion = 1;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize IndexedDB database
   * @returns {Promise<void>}
   */
  async initDB() {
    if (this.initialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for liked songs
        if (!db.objectStoreNames.contains('likedSongs')) {
          const songsStore = db.createObjectStore('likedSongs', { keyPath: 'trackId' });
          songsStore.createIndex('byArtistId', 'artistIds', { multiEntry: true });
          songsStore.createIndex('bySyncedAt', 'syncedAt', { unique: false });
        }

        // Create object store for sync metadata
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }

        // Create object store for festival data
        if (!db.objectStoreNames.contains('festivalData')) {
          db.createObjectStore('festivalData', { keyPath: 'festivalId' });
        }
      };
    });
  }

  /**
   * Save session data to sessionStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  saveSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save session data:', error);
      throw error;
    }
  }

  /**
   * Get session data from sessionStorage
   * @param {string} key - Storage key
   * @returns {*} Stored value or null
   */
  getSession(key) {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to get session data:', error);
      return null;
    }
  }

  /**
   * Clear session data
   * @param {string} key - Storage key (optional, clears all if not provided)
   */
  clearSession(key) {
    try {
      if (key) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Failed to clear session data:', error);
    }
  }

  /**
   * Save liked songs to IndexedDB
   * @param {Array} songs - Array of song objects
   * @returns {Promise<void>}
   */
  async saveLikedSongs(songs) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['likedSongs'], 'readwrite');
      const store = transaction.objectStore('likedSongs');
      const syncedAt = Date.now();

      // Transform songs to storage format
      const songsToStore = songs.map(item => ({
        trackId: item.track.id,
        trackName: item.track.name,
        artistIds: item.track.artists.map(a => a.id),
        artistNames: item.track.artists.map(a => a.name),
        albumName: item.track.album?.name || '',
        addedAt: new Date(item.added_at).getTime(),
        syncedAt: syncedAt
      }));

      let completed = 0;
      let errors = 0;

      songsToStore.forEach(song => {
        const request = store.put(song);
        request.onsuccess = () => {
          completed++;
          if (completed + errors === songsToStore.length) {
            if (errors === 0) {
              resolve();
            } else {
              reject(new Error(`Failed to save ${errors} songs`));
            }
          }
        };
        request.onerror = () => {
          errors++;
          if (completed + errors === songsToStore.length) {
            reject(new Error(`Failed to save ${errors} songs`));
          }
        };
      });

      if (songsToStore.length === 0) {
        resolve();
      }
    });
  }

  /**
   * Get liked songs from IndexedDB
   * @returns {Promise<Array>} Array of song objects
   */
  async getLikedSongs() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['likedSongs'], 'readonly');
      const store = transaction.objectStore('likedSongs');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get sync metadata
   * @returns {Promise<Object|null>} Sync metadata or null
   */
  async getSyncMetadata() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncMetadata'], 'readonly');
      const store = transaction.objectStore('syncMetadata');
      const request = store.get('lastSync');

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update sync metadata
   * @param {Object} metadata - Metadata object
   * @returns {Promise<void>}
   */
  async updateSyncMetadata(metadata) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
      const store = transaction.objectStore('syncMetadata');
      const request = store.put({
        key: 'lastSync',
        value: {
          lastSyncTime: metadata.lastSyncTime || Date.now(),
          totalSongs: metadata.totalSongs || 0,
          lastFetchedPage: metadata.lastFetchedPage || null
        }
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save festival data to IndexedDB
   * @param {string} festivalId - Festival identifier
   * @param {Object} data - Festival data
   * @returns {Promise<void>}
   */
  async saveFestivalData(festivalId, data) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['festivalData'], 'readwrite');
      const store = transaction.objectStore('festivalData');
      const request = store.put({
        festivalId: festivalId,
        artistIds: data.artistIds || [],
        artistDetails: data.artistDetails || {},
        loadedAt: Date.now()
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get festival data from IndexedDB
   * @param {string} festivalId - Festival identifier
   * @returns {Promise<Object|null>} Festival data or null
   */
  async getFestivalData(festivalId) {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['festivalData'], 'readonly');
      const store = transaction.objectStore('festivalData');
      const request = store.get(festivalId);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? {
          artistIds: result.artistIds,
          artistDetails: result.artistDetails
        } : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear all IndexedDB data
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ['likedSongs', 'syncMetadata', 'festivalData'],
        'readwrite'
      );

      let completed = 0;
      const total = 3;

      ['likedSongs', 'syncMetadata', 'festivalData'].forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }
}
