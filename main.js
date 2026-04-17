/**
 * Configuration for the Google Sheet and UI Mapping.
 * Modify this to adapt to other spreadsheets!
 */
const CONFIG = {
    // The public Google Sheet ID (from the URL)
    sheetId: '1fnay67_hc7hU1BRAhbcfnQW5TQGReXGWpn0vIa_dkMY',
    
    // Which column acts as the main title for each card
    cardTitleColumn: 'Plant Name',
    // Which column acts as a subtitle/badge (can be null)
    cardSubtitleColumn: 'Seed, Start, or Wish-List',

    // Define specific formatting types for columns. Default is 'text'
    // Built-in types: 'text', 'email', 'url'
    columnTypes: {
        'Contact Email or Number': 'email',
        // 'Some Website': 'url'
    },

    // Columns that shouldn't appear in the main body (usually because they are titles/subtitles)
    excludeFromBody: [
        'Plant Name',
        'Seed, Start, or Wish-List'
    ]
};

const UI = {
    grid: document.getElementById('data-grid'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error-message'),
    searchInput: document.getElementById('search-input'),
    themeToggle: document.getElementById('theme-toggle')
};

let rawData = [];

async function init() {
    setupTheme();
    try {
        await fetchSheetData();
        renderData(rawData);
        setupSearch();
    } catch (e) {
        console.error("Failed to load data:", e);
        showError();
    }
}

async function fetchSheetData() {
    // Generate the CSV export link
    const csvUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/export?format=csv`;

    return new Promise((resolve, reject) => {
        // Use PapaParse to fetch and parse the CSV
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                // Filter out rows that have an empty title
                rawData = results.data.filter(row => row[CONFIG.cardTitleColumn] && row[CONFIG.cardTitleColumn].trim() !== '');
                resolve();
            },
            error: (err) => {
                reject(err);
            }
        });
    });
}

function renderData(data) {
    UI.loading.style.display = 'none';
    UI.grid.innerHTML = '';

    if (data.length === 0) {
        UI.grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--clr-text-secondary); padding: 2rem;">No items found.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach(item => {
        const card = document.createElement('article');
        card.className = 'card';

        // --- Card Header ---
        const header = document.createElement('div');
        header.className = 'card-header';

        const titleText = item[CONFIG.cardTitleColumn] || 'Unknown';
        const title = document.createElement('h2');
        title.className = 'card-title';
        title.textContent = titleText;
        header.appendChild(title);

        if (CONFIG.cardSubtitleColumn && item[CONFIG.cardSubtitleColumn]) {
            const subtitleText = item[CONFIG.cardSubtitleColumn];
            if (subtitleText.trim() !== '') {
                const subtitle = document.createElement('span');
                subtitle.className = 'card-subtitle';
                subtitle.textContent = subtitleText;
                header.appendChild(subtitle);
            }
        }
        card.appendChild(header);

        // --- Card Body ---
        const body = document.createElement('div');
        body.className = 'card-body';

        for (const [key, value] of Object.entries(item)) {
            // Skip empty values or excluded columns
            if (!value || value.trim() === '' || CONFIG.excludeFromBody.includes(key)) {
                continue;
            }

            const row = document.createElement('div');
            row.className = 'data-row';

            const label = document.createElement('span');
            label.className = 'data-label';
            label.textContent = key;
            row.appendChild(label);

            const val = document.createElement('span');
            val.className = 'data-value';
            
            // Format based on column type
            const type = CONFIG.columnTypes[key] || 'text';
            val.appendChild(formatValue(value, type));

            row.appendChild(val);
            body.appendChild(row);
        }

        card.appendChild(body);
        fragment.appendChild(card);
    });

    UI.grid.appendChild(fragment);
}

function formatValue(value, type) {
    const cleanValue = value.trim();
    
    if (type === 'email') {
        // Basic check if it actually looks like an email to avoid formatting bare numbers
        if (cleanValue.includes('@')) {
            const a = document.createElement('a');
            a.href = `mailto:${cleanValue}`;
            a.textContent = cleanValue;
            return a;
        }
    } else if (type === 'url') {
        const a = document.createElement('a');
        let href = cleanValue;
        if (!href.startsWith('http://') && !href.startsWith('https://')) {
            href = 'https://' + href;
        }
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = cleanValue;
        return a;
    }
    
    // Default text fallback
    return document.createTextNode(cleanValue);
}

function setupSearch() {
    UI.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        const filtered = rawData.filter(row => {
            // Check all values in the row for the search query
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(query)
            );
        });
        
        renderData(filtered);
    });
}

function showError() {
    UI.loading.style.display = 'none';
    UI.error.style.display = 'block';
}

function setupTheme() {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        moonIcon.style.display = 'none';
    }

    UI.themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    });
}

// Start application
document.addEventListener('DOMContentLoaded', init);
