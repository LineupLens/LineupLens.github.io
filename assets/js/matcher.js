/**
 * Matcher Module
 * 
 * Handles artist matching algorithm
 */

export class Matcher {
  constructor() {
    // Initialize matcher
  }

  /**
   * Match liked songs with festival artists
   * @param {Array} likedSongs - User's liked songs (from storage format)
   * @param {Object} festivalData - Festival artist data
   * @returns {Array} Matched artists with counts
   */
  matchArtists(likedSongs, festivalData) {
    const { artistIds, artistDetails } = festivalData;
    
    if (!artistIds || artistIds.length === 0) {
      return [];
    }

    // Create a Set for faster lookup
    const festivalArtistIdsSet = new Set(artistIds);

    // Count songs per artist
    const artistCounts = new Map();

    // Iterate through liked songs
    for (const song of likedSongs) {
      // Handle both storage format (with artistIds array) and API format
      const songArtists = song.artistIds || 
                         (song.track?.artists?.map(a => a.id) || []);

      // Check each artist in the song
      for (const artistId of songArtists) {
        if (festivalArtistIdsSet.has(artistId)) {
          // Increment count for this artist
          const currentCount = artistCounts.get(artistId) || 0;
          artistCounts.set(artistId, currentCount + 1);
        }
      }
    }

    // Convert to array of matched artists
    const matches = [];
    for (const [spotifyId, count] of artistCounts.entries()) {
      const details = artistDetails[spotifyId] || {};
      matches.push({
        spotifyId: spotifyId,
        name: details.matchedName || 'Unknown Artist',
        originalName: details.originalName || details.matchedName || 'Unknown Artist',
        matchedName: details.matchedName || details.originalName || 'Unknown Artist',
        likedSongs: count
      });
    }

    // Rank artists
    return this.rankArtists(matches);
  }

  /**
   * Rank matched artists by song count
   * @param {Array} matches - Matched artists
   * @returns {Array} Ranked artists
   */
  rankArtists(matches) {
    if (!matches || matches.length === 0) {
      return [];
    }

    // Sort by song count (descending), then alphabetically by name
    return matches.sort((a, b) => {
      // First sort by song count (descending)
      if (b.likedSongs !== a.likedSongs) {
        return b.likedSongs - a.likedSongs;
      }
      // If counts are equal, sort alphabetically by original name
      return (a.originalName || a.name).localeCompare(b.originalName || b.name);
    });
  }

  /**
   * Count songs per artist (helper function)
   * @param {Array} likedSongs - User's liked songs
   * @param {Set|Array} festivalArtistIds - Festival artist IDs
   * @returns {Map} Map of artist ID to song count
   */
  countSongsPerArtist(likedSongs, festivalArtistIds) {
    const artistIdsSet = festivalArtistIds instanceof Set 
      ? festivalArtistIds 
      : new Set(festivalArtistIds);

    const counts = new Map();

    for (const song of likedSongs) {
      const songArtists = song.artistIds || 
                         (song.track?.artists?.map(a => a.id) || []);

      for (const artistId of songArtists) {
        if (artistIdsSet.has(artistId)) {
          counts.set(artistId, (counts.get(artistId) || 0) + 1);
        }
      }
    }

    return counts;
  }
}
