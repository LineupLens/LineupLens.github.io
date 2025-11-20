/**
 * State Management Module
 * 
 * Centralized application state management with persistence
 */

export class StateManager {
  constructor() {
    this.state = {
      // Authentication
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      user: null,
      
      // Data
      likedSongs: [],
      festivals: {},
      
      // UI State
      currentPage: 'landing',
      currentFestival: null,
      matches: [],
      
      // Loading
      isLoading: false,
      loadingMessage: '',
      progress: null,
      
      // Error
      error: null
    };
    
    this.subscribers = [];
    
    // Restore state from storage on initialization
    this.restore();
  }

  /**
   * Get current state (returns a copy to prevent direct mutation)
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Update state with new values
   * @param {Object} updates - Partial state updates
   */
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
    this.persist();
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Function to call on state changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers of state changes
   */
  notifySubscribers() {
    const currentState = this.getState();
    this.subscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('Error in state subscriber:', error);
      }
    });
  }

  /**
   * Persist state to sessionStorage
   * Only persists non-sensitive, necessary data
   */
  persist() {
    try {
      const stateToPersist = {
        isAuthenticated: this.state.isAuthenticated,
        currentPage: this.state.currentPage,
        currentFestival: this.state.currentFestival,
        user: this.state.user ? {
          display_name: this.state.user.display_name,
          id: this.state.user.id
        } : null
      };
      
      sessionStorage.setItem('lineuplens_state', JSON.stringify(stateToPersist));
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  /**
   * Restore state from sessionStorage
   */
  restore() {
    try {
      const savedState = sessionStorage.getItem('lineuplens_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.state = {
          ...this.state,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to restore state:', error);
    }
  }

  /**
   * Clear all state (for logout)
   */
  clear() {
    this.state = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      user: null,
      likedSongs: [],
      festivals: {},
      currentPage: 'landing',
      currentFestival: null,
      matches: [],
      isLoading: false,
      loadingMessage: '',
      progress: null,
      error: null
    };
    
    try {
      sessionStorage.removeItem('lineuplens_state');
    } catch (error) {
      console.warn('Failed to clear persisted state:', error);
    }
    
    this.notifySubscribers();
  }
}
