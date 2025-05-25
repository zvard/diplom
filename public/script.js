/**
 * Last.fm API Client
 * @namespace LastFmClient
 */
const LastFmClient = (function() {
    const API_KEY = '723cff8ebfb3fbc69d93de9d7f92b5dc';
    const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
    
    async function makeRequest(params) {
        const queryParams = new URLSearchParams({
            ...params,
            api_key: API_KEY,
            format: 'json'
        });
        
        try {
            const response = await fetch(`${BASE_URL}?${queryParams}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error making API request:', error);
            throw error;
        }
    }
    
    return {
        getTopArtists: async function() {
            return makeRequest({
                method: 'chart.gettopartists',
                limit: 12
            });
        },
        getTopTracks: async function() {
            return makeRequest({
                method: 'chart.gettoptracks',
                limit: 18
            });
        },
        searchArtists: async function(query) {
            return makeRequest({
                method: 'artist.search',
                artist: query,
                limit: 6
            });
        },
        searchAlbums: async function(query) {
            return makeRequest({
                method: 'album.search',
                album: query,
                limit: 8
            });
        },
        searchTracks: async function(query) {
            return makeRequest({
                method: 'track.search',
                track: query,
                limit: 12
            });
        }
    };
})();

/**
 * UI Controller
 * @namespace UIController
 */
const UIController = (function() {
    const elements = {
        searchInput: document.getElementById('searchInput'),
        searchButton: document.getElementById('searchButton'),
        artistsGrid: document.getElementById('artistsGrid'),
        tracksGrid: document.getElementById('tracksGrid'),
        albumsGrid: document.getElementById('albumsGrid'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        errorMessage: document.getElementById('errorMessage'),
        artistsSection: document.getElementById('artistsSection'),
        albumsSection: document.getElementById('albumsSection'),
        tracksSection: document.getElementById('tracksSection'),
        artistsSectionTitle: document.querySelector('#artistsSection h2'),
        albumsSectionTitle: document.querySelector('#albumsSection h2'),
        tracksSectionTitle: document.querySelector('#tracksSection h2'),
    };
    
    function showLoading() {
        elements.loadingSpinner.style.display = 'block';
    }
    
    function hideLoading() {
        elements.loadingSpinner.style.display = 'none';
    }
    
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
    }
    
    function hideError() {
        elements.errorMessage.style.display = 'none';
    }
    
    function clearResults() {
        elements.artistsGrid.innerHTML = '';
        elements.albumsGrid.innerHTML = '';
        elements.tracksGrid.innerHTML = '';
    }
    
    function renderArtists(artists) {
        elements.artistsGrid.innerHTML = artists.map(artist => `
            <div class="artist-card">
                <div class="artist-name">${artist.name}</div>
                <div class="artist-genres">${artist.tags?.tag?.map(t => t.name).join(' - ') || ''}</div>
            </div>
        `).join('');
    }

    function renderAlbums(albums) {
        const getImageUrl = (album) => {
             const largeImage = album.image.find(img => img.size === 'extralarge');
             return largeImage['#text'] || '';
        };

        elements.albumsGrid.innerHTML = albums.map(album => `
            <div class="album-card">
                <img src="${getImageUrl(album)}" alt="${album.name}" class="album-image" onerror="this.style.display='none'">
                <div class="album-name">${album.name}</div>
                <div class="album-artist">${album.artist}</div>
            </div>
        `).join('');
    }
    
    function renderTracks(tracks) {
        elements.tracksGrid.innerHTML = tracks.map(track => {
            const artistName = typeof track.artist === 'object' ? track.artist.name : track.artist;
            return `
            <div class="track-card">
                <div class="track-title">${track.name}</div>
                <div class="track-artist">${artistName || 'Unknown artist'}</div>
                <div class="track-genres">${track.tags?.tag?.map(t => t.name).join(' - ') || ''}</div>
            </div>
        `}).join('');
    }

    function showSearchLayout() {
        elements.artistsSectionTitle.textContent = 'Artists';
        elements.albumsSectionTitle.textContent = 'Albums';
        elements.tracksSectionTitle.textContent = 'Tracks';
    }

    function showTopContentLayout() {
        elements.artistsSectionTitle.textContent = 'Hot right now';
        elements.tracksSectionTitle.textContent = 'Popular tracks';
        elements.albumsSection.style.display = 'none';
    }
    
    function getSearchQuery() {
        return elements.searchInput.value.trim();
    }
    
    return {
        getElements: () => elements,
        showLoading,
        hideLoading,
        showError,
        hideError,
        clearResults,
        renderArtists,
        renderAlbums,
        renderTracks,
        showSearchLayout,
        showTopContentLayout,
        getSearchQuery
    };
})();

/**
 * Main App Controller
 * @namespace AppController
 */
const AppController = (function(LastFmClient, UIController) {
    const elements = UIController.getElements();
    
    async function init() {
        loadEventListeners();
        await loadTopContent();
    }
    
    async function loadTopContent() {
        try {
            UIController.showLoading();
            UIController.hideError();
            UIController.clearResults();
            UIController.showTopContentLayout();
            
            const [artistsResponse, tracksResponse] = await Promise.all([
                LastFmClient.getTopArtists(),
                LastFmClient.getTopTracks()
            ]);
            
            const artists = artistsResponse?.artists?.artist || [];
            const tracks = tracksResponse?.tracks?.track || [];

            UIController.renderArtists(artists);
            UIController.renderTracks(tracks);

            elements.artistsSection.style.display = artists.length > 0 ? 'block' : 'none';
            elements.tracksSection.style.display = tracks.length > 0 ? 'block' : 'none';

        } catch (error) {
            console.error('Error loading top content:', error);
            UIController.showError('Failed to load content. Please try again later.');
        } finally {
            UIController.hideLoading();
        }
    }
    
    async function handleSearch() {
        const query = UIController.getSearchQuery();
        
        if (!query) {
            await loadTopContent();
            return;
        }
        
        try {
            UIController.showLoading();
            UIController.clearResults();
            UIController.hideError();
            UIController.showSearchLayout();
            
            const [artistsResponse, albumsResponse, tracksResponse] = await Promise.all([
                LastFmClient.searchArtists(query),
                LastFmClient.searchAlbums(query),
                LastFmClient.searchTracks(query)
            ]);
            
            const artists = artistsResponse?.results?.artistmatches?.artist || [];
            const albums = albumsResponse?.results?.albummatches?.album || [];
            const tracks = tracksResponse?.results?.trackmatches?.track || [];

            UIController.renderArtists(artists);
            UIController.renderAlbums(albums);
            UIController.renderTracks(tracks);
            
            elements.artistsSection.style.display = artists.length > 0 ? 'block' : 'none';
            elements.albumsSection.style.display = albums.length > 0 ? 'block' : 'none';
            elements.tracksSection.style.display = tracks.length > 0 ? 'block' : 'none';

        } catch (error) {
            console.error('Error searching:', error);
            UIController.showError('Search failed. Please check your connection and try again.');
        } finally {
            UIController.hideLoading();
        }
    }
    
    function loadEventListeners() {
        elements.searchButton.addEventListener('click', handleSearch);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }
    
    return {
        init: init
    };
})(LastFmClient, UIController);

document.addEventListener('DOMContentLoaded', AppController.init);