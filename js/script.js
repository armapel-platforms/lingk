// js/script.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors (Country Picker Removed) ---
    const allSelectors = {
        header: document.querySelector("header"),
        menuBtn: document.getElementById("menu-btn"),
        floatingMenu: document.getElementById("floating-menu"),
        channelListingsContainer: document.getElementById("channel-listings"),
        spinner: document.getElementById("spinner"),
        videoElement: document.getElementById("video-player"),
        playerWrapper: document.getElementById("video-player-wrapper"),
        playerView: document.getElementById("player-view"),
        minimizedPlayer: document.getElementById("minimized-player"),
        minimizeBtn: document.getElementById("minimize-player-btn"),
        exitBtn: document.getElementById("exit-player-btn"),
        categoryPillsContainer: document.querySelector(".category-pills"),
        channelListHeader: document.getElementById("channel-list-header"),
        loadMoreContainer: document.getElementById("load-more-container"),
        loadMoreBtn: document.getElementById("load-more-btn")
    };
    
    // --- Global State (Country Filter Removed) ---
    let player = null, ui = null;
    const CHANNELS_PER_PAGE = 50;
    let currentlyDisplayedCount = 0;
    let currentFilteredStreams = [];
    let allStreams = [];
    let currentFilters = { category: "ALL" };

    /**
     * --- CORE LOGIC: Fetch and Parse the M3U file ---
     * This function runs once to download and process the channel list.
     */
    async function fetchAndParseM3U() {
        const M3U_URL = "https://iptv-org.github.io/iptv/index.m3u";
        allSelectors.spinner.style.display = 'flex';
        console.log("Fetching M3U file...");
        try {
            const response = await fetch(M3U_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const m3uText = await response.text();
            console.log("M3U file fetched. Parsing...");

            const lines = m3uText.trim().split('\n');
            const parsedStreams = [];
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXTINF:')) {
                    const infoLine = lines[i];
                    const urlLine = lines[i + 1];

                    if (urlLine && urlLine.startsWith('http')) {
                        const name = infoLine.split(',').pop()?.trim() || 'Unknown';
                        const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
                        const countryMatch = infoLine.match(/tvg-country="([^"]*)"/);
                        const langMatch = infoLine.match(/tvg-language="([^"]*)"/);
                        const categoryMatch = infoLine.match(/group-title="([^"]*)"/);

                        parsedStreams.push({
                            name: name,
                            logo: logoMatch ? logoMatch[1] : 'logo/favicon.svg',
                            manifestUri: urlLine.trim(),
                            type: 'hls',
                            country: countryMatch ? countryMatch[1] : 'XX',
                            language: langMatch ? langMatch[1] : 'N/A',
                            category: categoryMatch ? categoryMatch[1].split(';')[0] : 'General'
                        });
                    }
                }
            }
            console.log(`Parsing complete. Found ${parsedStreams.length} channels.`);
            allSelectors.spinner.style.display = 'none';
            return parsedStreams;
        } catch (error) {
            console.error("Failed to fetch or parse M3U file:", error);
            allSelectors.spinner.style.display = 'none';
            allSelectors.channelListingsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 50px 0;">Could not load channels. Please check your internet connection and try again.</p>';
            return [];
        }
    }

    /**
     * --- UI RENDERING FUNCTIONS ---
     */

    // Renders the category pills and sets up their click events
    const renderCategoryPills = () => {
        const categories = {ALL:"apps",General:"tv_gen",News:"newspaper",Sports:"sports_basketball",Kids:"smart_toy",Music:"music_note",Movies:"theaters",Entertainment:"movie",Lifestyle:"restaurant"};
        allSelectors.categoryPillsContainer.innerHTML = "";
        for (const categoryName in categories) {
            const button = document.createElement("button");
            button.className = "pill";
            button.dataset.category = categoryName;
            if (categoryName === "ALL") {
                button.classList.add("active");
            }
            button.innerHTML = `<span class="material-symbols-outlined">${categories[categoryName]}</span>`;
            button.addEventListener("click", () => {
                allSelectors.categoryPillsContainer.querySelector(".pill.active")?.classList.remove("active");
                button.classList.add("active");
                currentFilters.category = categoryName;
                allSelectors.channelListHeader.textContent = categoryName === 'ALL' ? 'All Channels' : categoryName;
                applyFiltersAndRender();
            });
            allSelectors.categoryPillsContainer.appendChild(button);
        }
    };

    // Renders the main menu in the floating popup
    const renderMenu = () => {
        allSelectors.floatingMenu.innerHTML=`
            <ul>
                <li><a href="about.html"><span class="material-symbols-outlined">info</span> About Us</a></li>
                <li><a href="faq.html"><span class="material-symbols-outlined">quiz</span> FAQ</a></li>
                <li><a href="privacy.html"><span class="material-symbols-outlined">shield</span> Privacy Policy</a></li>
                <li><a href="terms.html"><span class="material-symbols-outlined">gavel</span> Terms of Service</a></li>
            </ul>`;
    
        allSelectors.floatingMenu.querySelectorAll("li").forEach(e => e.addEventListener("click", t => {
            const n = e.querySelector("a");
            if (n) {
                t.preventDefault();
                window.location.href = n.href;
            }
        }));
    };

    /**
     * --- CHANNEL FILTERING & DISPLAY LOGIC ---
     */

    // Applies the current filters (category only) and starts the rendering process
    const applyFiltersAndRender = () => {
        let filtered = [...allStreams];
        
        // Country filter logic has been completely removed
        
        if (currentFilters.category !== 'ALL') {
            filtered = filtered.filter(stream => stream.category === currentFilters.category);
        }
        currentFilteredStreams = filtered;
        
        const listContainer = allSelectors.channelListingsContainer;
        listContainer.innerHTML = ''; 
        const listElement = document.createElement('div');
        listElement.className = 'channel-list';
        listContainer.appendChild(listElement);

        currentlyDisplayedCount = 0;
        loadMoreChannels();
    };
    
    // Loads and displays channels in batches of 50
    const loadMoreChannels = () => {
        allSelectors.spinner.style.display = 'flex';
        allSelectors.loadMoreContainer.style.display = 'none';

        setTimeout(() => {
            const listElement = allSelectors.channelListingsContainer.querySelector('.channel-list');
            if (!listElement) return;

            const channelsToRender = currentFilteredStreams.slice(currentlyDisplayedCount, currentlyDisplayedCount + CHANNELS_PER_PAGE);
            
            channelsToRender.forEach(stream => {
                const item = document.createElement('div');
                item.className = 'channel-list-item';
                const lang = stream.language || 'N/A';
                
                const languageDisplay = (lang !== 'N/A' && lang) 
                    ? `<span>${lang}</span>` 
                    : `<span class="material-symbols-outlined">sensors</span>`;

                item.innerHTML = `
                    <div class="channel-info-left">
                        <img src="${stream.logo}" alt="${stream.name} Logo" class="channel-logo" onerror="this.src='logo/favicon.svg';">
                        <span class="channel-name">${stream.name}</span>
                    </div>
                    <div class="channel-info-right">
                        <span class="fi fi-${stream.country.toLowerCase()}"></span>
                        ${languageDisplay}
                    </div>`;
                item.addEventListener('click', () => openPlayer(stream));
                listElement.appendChild(item);
            });

            currentlyDisplayedCount += channelsToRender.length;
            
            allSelectors.loadMoreContainer.style.display = currentlyDisplayedCount < currentFilteredStreams.length ? 'block' : 'none';
            allSelectors.spinner.style.display = 'none';

            if (listElement.children.length === 0) {
                allSelectors.channelListingsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 50px 0;">No channels match the current filters.</p>';
            }
        }, 200);
    };

    /**
     * --- UI INTERACTION SETUP ---
     */

    const setupHeaderScroll = () => { window.addEventListener("scroll", () => allSelectors.header.classList.toggle("scrolled", window.scrollY > 10)); };
    
    const setupMenuInteractions = () => {
        allSelectors.menuBtn.addEventListener("click", e => { e.stopPropagation(); allSelectors.floatingMenu.classList.toggle("active"); });
        document.addEventListener("click", () => allSelectors.floatingMenu.classList.remove("active"));
        allSelectors.floatingMenu.addEventListener("click", e => e.stopPropagation());
    };

    const setupSlider = () => {
        const slider = document.querySelector(".slider");
        if (!slider) return;
        const slides = slider.querySelectorAll(".slide");
        const dots = slider.parentElement.querySelectorAll(".slider-nav .dot");
        let currentSlide = 0;
        let slideInterval = setInterval(nextSlide, 5000);

        function goToSlide(n) {
            slides.forEach((slide, index) => slide.classList.toggle("active", index === n));
            dots.forEach((dot, index) => dot.classList.toggle("active", index === n));
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            goToSlide(currentSlide);
        }

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => {
                currentSlide = index;
                goToSlide(index);
                clearInterval(slideInterval);
                slideInterval = setInterval(nextSlide, 5000);
            });
        });
    };
    
    /**
     * --- VIDEO PLAYER LOGIC ---
     */

    const initPlayer = async () => {
        if (player) return;
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            player = new shaka.Player(allSelectors.videoElement);
            ui = new shaka.ui.Overlay(player, allSelectors.playerWrapper, allSelectors.videoElement);
            ui.getControls();
            player.addEventListener("error", e => console.error("Player Error", e.detail));
        } else {
            console.error("Shaka Player not supported");
        }
    };

    const openPlayer = async (stream) => {
        await initPlayer();
        try {
            await player.load(stream.manifestUri);
            allSelectors.videoElement.play();
        } catch (error) {
            console.error("Error loading stream:", error);
        }
        document.getElementById("player-channel-name").textContent = stream.name;
        document.getElementById("player-channel-category").textContent = stream.category;
        document.getElementById("minimized-player-logo").src = stream.logo;
        document.getElementById("minimized-player-name").textContent = stream.name;
        document.getElementById("minimized-player-category").textContent = stream.category;
        
        allSelectors.minimizedPlayer.classList.remove("active");
        allSelectors.playerView.classList.add("active");
        history.pushState({ channel: stream.name }, "", `?play=${encodeURIComponent(stream.name.replace(/\s+/g, "-"))}`);
    };
    
    const minimizePlayer = () => {
        if (allSelectors.playerView.classList.contains("active")) {
            allSelectors.playerView.classList.remove("active");
            allSelectors.minimizedPlayer.classList.add("active");
        }
    };

    const restorePlayer = (e) => {
        if (!e.target.closest("#exit-player-btn") && allSelectors.minimizedPlayer.classList.contains("active")) {
            allSelectors.minimizedPlayer.classList.remove("active");
            allSelectors.playerView.classList.add("active");
            allSelectors.videoElement.play();
        }
    };

    const closePlayer = async (e) => {
        e.stopPropagation();
        allSelectors.playerView.classList.remove("active");
        allSelectors.minimizedPlayer.classList.remove("active");
        if (player) {
            await player.unload();
        }
        history.pushState({}, "", window.location.pathname);
    };

    async function main() {
        allStreams = await fetchAndParseM3U();
        if (allStreams.length === 0) return;

        // Setup UI components
        setupHeaderScroll(); 
        renderMenu(); 
        setupMenuInteractions(); 
        setupSlider();
        renderCategoryPills(); 
        
        // Initial render of channels
        applyFiltersAndRender();
        
        // Setup all interactive element listeners
        allSelectors.loadMoreBtn.addEventListener('click', loadMoreChannels);
        allSelectors.minimizeBtn.addEventListener('click', minimizePlayer);
        allSelectors.minimizedPlayer.addEventListener('click', restorePlayer);
        allSelectors.exitBtn.addEventListener('click', closePlayer);
        
        // Check for URL param to autoplay a channel
        const params = new URLSearchParams(window.location.search);
        const channelToPlay = params.get('play');
        if (channelToPlay) {
            const streamToPlay = allStreams.find(s => s.name.replace(/\s+/g, '-') === channelToPlay);
            if (streamToPlay) openPlayer(streamToPlay);
        }
    }

    main();
});