// Tauri v2 API
let tauriOpen;
let tauriFetch;

// Initialisation asynchrone de l'API Tauri
async function initTauri() {
    try {
        const shell = await window.__TAURI__.shell;
        tauriOpen = shell.open;
        
        // Utilise le plugin HTTP de Tauri pour éviter CORS
        const http = await window.__TAURI__.http;
        tauriFetch = http.fetch;
        
        console.log('Tauri APIs initialized successfully');
    } catch (error) {
        console.warn('Tauri APIs not available, using fallbacks', error);
        tauriOpen = (url) => window.open(url, '_blank');
        tauriFetch = window.fetch.bind(window);
    }
}

// State
let games = [];
let filteredGames = [];
let currentView = 'games';
let gridViewMode = 'grid';
let searchQuery = '';
let selectedGenre = '';
let sortBy = 'recent';

// API Configuration
const API_URL = 'https://corsproxy.io/?url=https://fluxyrepacks.xyz/api/games';

// DOM Elements
const gamesGrid = document.getElementById('games-grid');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const refreshBtn = document.getElementById('refresh-btn');
const gameDetailModal = document.getElementById('game-detail-modal');
const gameDetailContent = document.getElementById('game-detail-content');
const visitWebsiteBtn = document.getElementById('visit-website');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');
const toggleViewBtn = document.getElementById('toggle-view');
const viewIcon = document.getElementById('view-icon');
const gamesCount = document.getElementById('games-count');
const noResults = document.getElementById('no-results');
const resetFiltersBtn = document.getElementById('reset-filters');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await initTauri();
    setupEventListeners();
    fetchGames();
});

// Event Listeners
function setupEventListeners() {
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Refresh button
    refreshBtn.addEventListener('click', fetchGames);

    // Visit website button
    visitWebsiteBtn.addEventListener('click', async () => {
        if (tauriOpen) {
            await tauriOpen('https://fluxyrepacks.xyz');
        }
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
        applyFilters();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Genre filter
    genreFilter.addEventListener('change', (e) => {
        selectedGenre = e.target.value;
        applyFilters();
    });

    // Sort filter
    sortFilter.addEventListener('change', (e) => {
        sortBy = e.target.value;
        applyFilters();
    });

    // Toggle view mode
    toggleViewBtn.addEventListener('click', () => {
        const modes = ['grid', 'compact', 'list'];
        const currentIndex = modes.indexOf(gridViewMode);
        gridViewMode = modes[(currentIndex + 1) % modes.length];
        updateViewMode();
    });

    // Reset filters
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        selectedGenre = '';
        sortBy = 'recent';
        genreFilter.value = '';
        sortFilter.value = 'recent';
        clearSearchBtn.style.display = 'none';
        applyFilters();
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    gameDetailModal.addEventListener('click', (e) => {
        if (e.target === gameDetailModal) {
            closeModal();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            fetchGames();
        }
    });
}

// View switching
function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });
}

// Fetch games from API
async function fetchGames() {
    loading.style.display = 'block';
    errorMessage.style.display = 'none';
    gamesGrid.innerHTML = '';

    try {
        console.log('Fetching games from API...');
        
        // Utilise l'API HTTP de Tauri si disponible, sinon fetch natif
        const fetchFunc = tauriFetch || window.fetch.bind(window);
        const response = await fetchFunc(API_URL, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
        });

        console.log('Response received:', response);

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data parsed:', data);
        
        if (data.success && data.data && data.data.games) {
            games = data.data.games;
            console.log(`Loaded ${games.length} games`);
            populateGenreFilter();
            applyFilters();
        } else {
            throw new Error('Format de données invalide');
        }
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showError(`Impossible de charger les jeux: ${error.message}`);
    } finally {
        loading.style.display = 'none';
    }
}

// Populate genre filter dropdown
function populateGenreFilter() {
    const genres = new Set();
    games.forEach(game => {
        game.genre.forEach(g => genres.add(g));
    });

    const sortedGenres = Array.from(genres).sort();
    
    genreFilter.innerHTML = '<option value="">Tous les genres</option>';
    sortedGenres.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre;
        option.textContent = genre;
        genreFilter.appendChild(option);
    });
}

// Apply filters and sorting
function applyFilters() {
    let filtered = [...games];

    // Search filter
    if (searchQuery) {
        filtered = filtered.filter(game => 
            game.name.toLowerCase().includes(searchQuery) ||
            game.description.toLowerCase().includes(searchQuery) ||
            game.cracker.toLowerCase().includes(searchQuery) ||
            game.genre.some(g => g.toLowerCase().includes(searchQuery))
        );
    }

    // Genre filter
    if (selectedGenre) {
        filtered = filtered.filter(game => 
            game.genre.includes(selectedGenre)
        );
    }

    // Sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'views':
                return b.views - a.views;
            case 'downloads':
                return b.downloads - a.downloads;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'size':
                return parseSize(b.size) - parseSize(a.size);
            case 'recent':
            default:
                return new Date(b.dateAdded) - new Date(a.dateAdded);
        }
    });

    filteredGames = filtered;
    updateGamesCount();
    displayGames(filtered);
}

// Parse size string to number
function parseSize(sizeStr) {
    const match = sizeStr.match(/(\d+\.?\d*)\s*(gb|mb|kb)/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
        case 'gb': return value * 1024 * 1024;
        case 'mb': return value * 1024;
        case 'kb': return value;
        default: return value;
    }
}

// Update games count
function updateGamesCount() {
    gamesCount.textContent = `(${filteredGames.length}${filteredGames.length !== games.length ? ` / ${games.length}` : ''})`;
}

// Update view mode
function updateViewMode() {
    gamesGrid.className = 'games-grid';
    
    switch (gridViewMode) {
        case 'list':
            gamesGrid.classList.add('list-view');
            viewIcon.textContent = '☰';
            break;
        case 'compact':
            gamesGrid.classList.add('compact-view');
            viewIcon.textContent = '▦';
            break;
        case 'grid':
        default:
            viewIcon.textContent = '▦';
            break;
    }
}

// Display games in grid
function displayGames(gamesArray) {
    gamesGrid.innerHTML = '';
    noResults.style.display = 'none';

    if (gamesArray.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    gamesArray.forEach(game => {
        const card = createGameCard(game);
        gamesGrid.appendChild(card);
    });
}

// Create game card element
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    const imageUrl = game.imageUrl ? `http://${game.imageUrl}` : '';
    
    card.innerHTML = `
        <div class="game-card-inner">
            <img src="${imageUrl}" alt="${escapeHtml(game.name)}" class="game-image" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22160%22><rect width=%22120%22 height=%22160%22 fill=%22%23333%22/><text x=%2250%%22 y=%2250%%22 fill=%22%23666%22 font-size=%2214%22 text-anchor=%22middle%22>No Image</text></svg>'">
            <div class="game-info">
                <h3 class="game-title">${escapeHtml(game.name)}</h3>
                <p class="game-description">${escapeHtml(game.description)}</p>
                <div class="game-stats">
                    <span>👁️ ${game.views}</span>
                    <span>⬇️ ${game.downloads}</span>
                </div>
                <div class="game-meta">
                    <span>📦 ${game.size}</span>
                    <span>🔖 v${game.version}</span>
                </div>
                <div class="game-genres">
                    ${game.genre.slice(0, 3).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                </div>
                <div class="game-cracker">Cracker: ${game.cracker}</div>
            </div>
        </div>
    `;

    card.addEventListener('click', () => showGameDetail(game));

    return card;
}

// Show game detail modal
function showGameDetail(game) {
    const imageUrl = game.imageUrl ? `http://${game.imageUrl}` : '';
    
    const screenshotsHtml = game.screenshotUrls && game.screenshotUrls.length > 0
        ? `
            <div class="detail-section">
                <h3>Screenshots</h3>
                <div class="screenshots-scroll">
                    ${game.screenshotUrls.map(url => `
                        <img src="http://${url}" class="screenshot-img" alt="Screenshot" 
                             onerror="this.style.display='none'">
                    `).join('')}
                </div>
            </div>
        `
        : '';

    const linksHtml = game.links && game.links.length > 0
        ? `
            <h4 style="color: #fff; margin-bottom: 10px;">Liens directs:</h4>
            ${game.links.map(link => `
                <a href="#" class="download-link" data-url="${link}">
                    <span>🔗</span>
                    <span>${extractDomain(link)}</span>
                </a>
            `).join('')}
        `
        : '';

    const torrentsHtml = game.torrentLinks && game.torrentLinks.length > 0
        ? `
            <h4 style="color: #fff; margin: 20px 0 10px;">Torrents:</h4>
            ${game.torrentLinks.map(torrent => `
                <a href="#" class="download-link torrent" data-magnet="magnet:?xt=urn:btih:${torrent}">
                    <span>🌪️</span>
                    <span>Ouvrir avec client torrent</span>
                </a>
            `).join('')}
        `
        : '';

    gameDetailContent.innerHTML = `
        <img src="${imageUrl}" alt="${escapeHtml(game.name)}" class="detail-image" 
             onerror="this.style.display='none'">
        
        <h1 class="detail-title">${escapeHtml(game.name)}</h1>
        
        <div class="detail-stats">
            <span>👁️ ${game.views} vues</span>
            <span>⬇️ ${game.downloads} téléchargements</span>
        </div>

        <div class="detail-section">
            <h3>Description</h3>
            <p class="detail-description">${escapeHtml(game.description)}</p>
        </div>

        <div class="detail-section">
            <div class="detail-info-grid">
                <div class="info-item">
                    <span class="info-label">Taille:</span>
                    <span class="info-value">${game.size}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Version:</span>
                    <span class="info-value">${game.version}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Cracker:</span>
                    <span class="info-value">${game.cracker}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Auteur:</span>
                    <span class="info-value">${game.author.username}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Steam ID:</span>
                    <span class="info-value">${game.steamId || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">En ligne:</span>
                    <span class="info-value">${game.isOnline ? 'Oui' : 'Non'}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Genres</h3>
            <div class="game-genres">
                ${game.genre.map(g => `<span class="genre-tag">${g}</span>`).join('')}
            </div>
        </div>

        ${screenshotsHtml}

        <div class="detail-section download-section">
            <h3>Téléchargements</h3>
            <div class="download-links">
                ${linksHtml || torrentsHtml ? linksHtml + torrentsHtml : '<p style="color: #777; font-style: italic;">Aucun lien de téléchargement disponible</p>'}
            </div>
        </div>
    `;

    // Add click handlers to download links
    gameDetailContent.querySelectorAll('.download-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const url = link.dataset.url || link.dataset.magnet;
            if (url && tauriOpen) {
                await tauriOpen(url);
            }
        });
    });

    gameDetailModal.classList.add('active');
}

// Close modal
function closeModal() {
    gameDetailModal.classList.remove('active');
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return 'Télécharger';
    }
}