// Configuration
const CLIENT_ID = '3aad6a64945f40f988872463af9012ee'; // Replace with your Spotify App Client ID
const REDIRECT_URI = window.location.href.includes('localhost') 
  ? 'http://localhost:8000/' 
  : 'https://lineuplens.github.io/';
const SPOTIFY_SCOPES = 'user-library-read user-read-email';

/*
 * IMPORTANT: Spotify API Registration Instructions
 * 
 * To use this app, you need to register it in the Spotify Developer Dashboard:
 * 
 * 1. Go to https://developer.spotify.com/dashboard/ and log in
 * 2. Click "Create An App"
 * 3. Fill in the name "LineupLens" and description
 * 4. Set the Redirect URI to match your REDIRECT_URI above
 * 5. Accept the terms and create the app
 * 6. Copy the Client ID and replace the CLIENT_ID above
 * 7. No Client Secret is needed as we're using Implicit Grant Flow
 * 
 * For more details: https://developer.spotify.com/documentation/general/guides/authorization-guide/
 */

// App state
let currentPage = 'landing';
let accessToken = '';
let currentFestival = '';
let spotifyUser = null;
let likedSongs = [];

// Festival artist IDs will be populated from CSV files
const festivalArtists = {};

// Mapping of festival to CSV filename and display name
const festivalInfo = {
    edclv: {
        csv: 'edc_spotify_matches.csv',
        name: 'EDC Las Vegas 2025',
        image: 'edclv_2025_lineup.png'
    },
    // Updated North Coast festival name to include "Phase 1"
    northcoast: {
        csv: 'ncmf_spotify_matches.csv',
        name: 'North Coast 2025 (Phase 1)',
        image: 'northcoast_2025_lineup.png'
    },
    // Added Coachella 2025 as a new festival option
    coachella: {
        csv: 'coachella_spotify_matches.csv',
        name: 'Coachella 2025',
        image: 'coachella_2025_lineup.jpg'
    }
};

// Normalize artist names for matching
function normalizeArtistName(name) {
    return name.toLowerCase()
        .replace(/[éèêë]/g, 'e')
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôöõ]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[ç]/g, 'c')
        .replace(/[^\w\s]/gi, '')
        .trim();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeApp();
});

function setupEventListeners() {
    // Landing page
    const loginButton = document.getElementById('spotify-login');
    if (loginButton) {
        loginButton.addEventListener('click', function(e) {
            e.preventDefault();
            initiateSpotifyLogin();
        });
    }
    
    // Festivals page
    const generateButton = document.getElementById('generate-results');
    if (generateButton) {
        generateButton.addEventListener('click', function() {
            const festivalDropdown = document.getElementById('festival-dropdown');
            currentFestival = festivalDropdown.value;
            
            if (!currentFestival) {
                alert('Please select a festival');
                return;
            }
            
            document.getElementById('loading').classList.remove('hidden');
            processSelectedFestival();
        });
    }
    
    // Results page
    const backButton = document.getElementById('back-to-festivals');
    if (backButton) {
        backButton.addEventListener('click', function() {
            navigateTo('festivals');
        });
    }
    
    // Lineup image click to enlarge
    const lineupImage = document.getElementById('lineup-image');
    if (lineupImage) {
        lineupImage.addEventListener('click', function() {
            // Open image in new tab/window for full view
            window.open(this.src, '_blank');
        });
    }
}

// Initialize app
function initializeApp() {
    // Parse URL parameters for access token
    const params = getUrlParameters();
    accessToken = params.accessToken;
    
    if (accessToken) {
        // We have a token, fetch user data and show festivals page
        fetchUserData(accessToken)
            .then(user => {
                spotifyUser = user;
                
                // Update UI with user name
                const userNameElement = document.getElementById('user-name');
                if (userNameElement) {
                    userNameElement.textContent = user.display_name || 'music fan';
                }
                
                // Navigate to festivals page
                navigateTo('festivals');
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                // Token might be invalid, stay on landing page
                navigateTo('landing');
            });
    } else {
        // No token, stay on landing page
        navigateTo('landing');
    }
}

// Initiate Spotify login
function initiateSpotifyLogin() {
    const loginUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${CLIENT_ID}&scope=${SPOTIFY_SCOPES}&redirect_uri=${REDIRECT_URI}`;
    window.location.href = loginUrl;
}

// Process selected festival
async function processSelectedFestival() {
    try {
        // Check if we need to load artist data from CSV
        if (!festivalArtists[currentFestival]) {
            document.getElementById('loading-status').textContent = 'Loading festival artist data...';
            const { artistIds, artistDetails } = await loadArtistsFromCsv(currentFestival);
            
            // Store artist details for this festival if needed
            window.currentFestivalArtistDetails = artistDetails;
        }
        
        // Fetch user's liked songs if we haven't already
        if (likedSongs.length === 0) {
            document.getElementById('loading-status').textContent = 'Fetching your liked songs...';
            likedSongs = await fetchSongs(accessToken);
        }
        
        // Find and display matched artists
        document.getElementById('loading-status').textContent = 'Finding your matches...';
        const matchedArtists = findMatchedArtists(currentFestival);
        displayResults(matchedArtists);
        
        // Navigate to results page
        navigateTo('results');
        
    } catch (error) {
        console.error('Error processing festival data:', error);
        document.getElementById('loading').classList.add('hidden');
        alert('Error processing your Spotify data. Please try again.');
    }
}

// Load artist IDs from CSV file
async function loadArtistsFromCsv(festival) {
    try {
        const csvFilename = festivalInfo[festival]?.csv;
        if (!csvFilename) {
            console.error(`No CSV file defined for festival: ${festival}`);
            return { artistIds: [], artistDetails: {} };
        }

        document.getElementById('loading-status').textContent = `Loading artist data for ${festivalInfo[festival].name}...`;
        
        // Fetch the CSV file
        const response = await fetch(csvFilename);
        if (!response.ok) {
            throw new Error(`Failed to load CSV file: ${csvFilename}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV manually (simple implementation)
        const rows = csvText.split('\n');
        const headers = rows[0].split(',');
        
        // Find column indices
        const originalNameIndex = headers.indexOf('Original Name');
        const spotifyIdIndex = headers.indexOf('Spotify ID');
        const matchedNameIndex = headers.indexOf('Matched Name');
        
        if (originalNameIndex === -1 || spotifyIdIndex === -1 || matchedNameIndex === -1) {
            throw new Error('CSV file missing required columns: Original Name, Matched Name, or Spotify ID');
        }
        
        const artistIds = [];
        const artistDetails = {};
        
        // Skip header row (i=0)
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue; // Skip empty rows
            
            const columns = rows[i].split(',');
            const originalName = columns[originalNameIndex]?.trim();
            const spotifyId = columns[spotifyIdIndex]?.trim();
            const matchedName = columns[matchedNameIndex]?.trim();
            
            if (spotifyId && spotifyId !== 'null' && spotifyId !== '') {
                artistIds.push(spotifyId);
                
                // Store additional info for display
                artistDetails[spotifyId] = {
                    originalName: originalName,
                    matchedName: matchedName
                };
            }
        }
        
        // Save the artist IDs and details
        festivalArtists[festival] = artistIds;
        console.log(`Loaded ${artistIds.length} artists for ${festival} from CSV`);
        
        return { artistIds, artistDetails };
        
    } catch (error) {
        console.error('Error loading artists from CSV:', error);
        alert('Error loading festival data. Please try again.');
        return { artistIds: [], artistDetails: {} };
    }
}

// Find matched artists between user's liked songs and festival lineup
function findMatchedArtists(festival) {
    const likedArtists = {};
    const festivalArtistIds = festivalArtists[festival] || [];
    const artistDetails = window.currentFestivalArtistDetails || {};
    
    // Iterate through all of the user's liked songs
    for (let song of likedSongs) {
        // Check if any of the artists are playing at the selected festival
        for (let songArtist of song.track.artists) {
            // Check direct Spotify ID match
            if (festivalArtistIds.includes(songArtist.id)) {
                // If we have details from the CSV, use the original artist name
                if (artistDetails[songArtist.id]) {
                    updateLikedArtists(likedArtists, {
                        ...songArtist,
                        name: artistDetails[songArtist.id].originalName || songArtist.name
                    });
                } else {
                    updateLikedArtists(likedArtists, songArtist);
                }
            }
        }
    }
    
    // Sort artists by liked songs count
    return Object.values(likedArtists).sort((a, b) => b.likedSongs - a.likedSongs);
}

// Helper function to update liked artists
function updateLikedArtists(likedArtists, artist) {
    if (likedArtists[artist.id]) {
        likedArtists[artist.id].likedSongs += 1;
    } else {
        likedArtists[artist.id] = {
            name: artist.name, 
            id: artist.id, 
            likedSongs: 1
        };
    }
}

// Display results on the results page
function displayResults(matchedArtists) {
    const artistDetails = window.currentFestivalArtistDetails || {};
    
    // Update festival title
    const festivalTitle = document.getElementById('festival-title');
    if (festivalTitle) {
        festivalTitle.textContent = `Your ${festivalInfo[currentFestival].name} Matches`;
    }
    
    // Update results title
    const resultsTitle = document.getElementById('results-title');
    if (resultsTitle) {
        resultsTitle.textContent = `${spotifyUser.display_name}'s Top Artists`;
    }
    
    // Update results description
    const totalArtists = festivalArtists[currentFestival]?.length || 0;
    const resultsDescription = document.getElementById('results-description');
    if (resultsDescription) {
        resultsDescription.textContent = `Matched ${matchedArtists.length} out of ${totalArtists} artists based on ${likedSongs.length} songs in your library`;
    }

    // Set lineup image if available
    const lineupImage = document.getElementById('lineup-image');
    if (lineupImage) {
        if (festivalInfo[currentFestival]?.image) {
            lineupImage.src = festivalInfo[currentFestival].image;
            lineupImage.alt = `${festivalInfo[currentFestival].name} Lineup`;
            document.getElementById('lineup-container').classList.remove('hidden');
        } else {
            document.getElementById('lineup-container').classList.add('hidden');
        }
    }
    
    // Update artist list
    const artistList = document.getElementById('artist-list');
    if (artistList) {
        artistList.innerHTML = ''; // Clear previous results
        
        if (matchedArtists.length === 0) {
            const noMatchesItem = document.createElement('li');
            noMatchesItem.classList.add('no-matches');
            noMatchesItem.textContent = `No matches found for ${festivalInfo[currentFestival].name} artists in your liked songs.`;
            artistList.appendChild(noMatchesItem);
            return;
        }
        
        for (let artist of matchedArtists) {
            let artistItem = document.createElement('li');
            
            // Use original artist name from CSV if available
            const displayName = artist.name;
            
            // Show matched name as subtitle if different from original name
            let subtitleHtml = '';
            if (artistDetails[artist.id] && 
                artistDetails[artist.id].matchedName && 
                artistDetails[artist.id].originalName !== artistDetails[artist.id].matchedName) {
                subtitleHtml = `<span class="matched-name">(${artistDetails[artist.id].matchedName})</span>`;
            }
            
            artistItem.innerHTML = `
                <div class="artist-item">
                    <div class="artist-name">
                        <a target='_blank' href='https://open.spotify.com/artist/${artist.id}'>
                            <img width=20 style='vertical-align:middle;padding-right:4px;padding-bottom:2px;' src='spotify-icon.png'>
                            ${displayName}
                        </a>
                        ${subtitleHtml}
                    </div>
                    <div class="artist-count">${artist.likedSongs} liked song${artist.likedSongs === 1 ? '' : 's'}</div>
                </div>
            `;
            artistList.appendChild(artistItem);
        }
    }
}

// Fetch user data from Spotify
function fetchUserData(accessToken) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    return fetch('https://api.spotify.com/v1/me', {
        headers: {'Authorization': 'Bearer ' + accessToken},
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        
        if (response.status === 429) {
            // Handle rate limiting
            const retryAfter = response.headers.get('Retry-After') || 3;
            console.log(`Rate limited, waiting ${retryAfter} seconds...`);
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(fetchUserData(accessToken)); // Retry after waiting
                }, retryAfter * 1000);
            });
        }
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user data: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Spotify API request timed out. Please try again.');
        }
        throw error;
    });
}

// Fetch user's liked songs
async function fetchSongs(accessToken, url = 'https://api.spotify.com/v1/me/tracks?limit=50') {
    const allSongs = [];
    let nextUrl = url;
    let totalSongs = 0;
    let requestCount = 0;
    const RATE_LIMIT_DELAY = 300; // Small delay between requests (300ms) to be gentler on the API
    
    while (nextUrl) {
        // Add a small delay between requests to prevent rate limiting (except for first request)
        if (requestCount > 0) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }
        
        try {
            const response = await fetch(nextUrl, {
                headers: {'Authorization': 'Bearer ' + accessToken}
            });
            
            if (response.status === 429) {
                // Rate limited, get retry-after header and wait
                const retryAfter = response.headers.get('Retry-After') || 3;
                console.log(`Rate limited, waiting ${retryAfter} seconds...`);
                document.getElementById('loading-status').textContent = `Rate limited by Spotify, waiting ${retryAfter} seconds...`;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue; // Retry the same request
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch liked songs: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            allSongs.push(...data.items);
            
            // Update loading status
            totalSongs = data.total;
            document.getElementById('loading-status').textContent = `Loading liked songs... ${allSongs.length} of ${totalSongs}`;
            
            // If there are more songs, fetch the next page
            nextUrl = data.next;
            requestCount++;
            
        } catch (error) {
            console.error('Error fetching songs:', error);
            document.getElementById('loading-status').textContent = `Error loading songs: ${error.message}`;
            break;
        }
    }
    
    return allSongs;
}

// Parse URL parameters (for access token)
function getUrlParameters() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
        accessToken: params.get('access_token'),
        state: params.get('state')
    };
}

// Navigation
function navigateTo(page) {
    // Hide all pages
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('festivals-page').classList.add('hidden');
    document.getElementById('results-page').classList.add('hidden');
    
    // Show selected page
    document.getElementById(`${page}-page`).classList.remove('hidden');
    
    // Reset loading indicator if navigating away from festivals page
    if (page !== 'festivals') {
        document.getElementById('loading').classList.add('hidden');
    }
    
    currentPage = page;
}