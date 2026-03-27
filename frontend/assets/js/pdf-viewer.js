// PDF Viewer Component with Download Prevention
// This component displays PDFs inline without allowing downloads

class PDFViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.pdfDoc = null;
        this.pageNum = 1;
        this.pageRendering = false;
        this.pageNumPending = null;
        this.scale = options.scale || 1.5;
        this.canvas = null;
        this.ctx = null;
        this.preventDownload = options.preventDownload !== false;
        
        if (this.preventDownload) {
            this.initDownloadPrevention();
        }
    }

    initDownloadPrevention() {
        // Prevent right-click context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#' + this.container.id)) {
                e.preventDefault();
                return false;
            }
        });

        // Prevent keyboard shortcuts for saving
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
                if (e.target.closest('#' + this.container.id)) {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Prevent drag and drop
        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('#' + this.container.id)) {
                e.preventDefault();
                return false;
            }
        });
    }

    async loadPDF(pdfPath) {
        console.log('=== loadPDF called ===');
        console.log('pdfPath:', pdfPath);
        try {
            // Load PDF.js dynamically
            if (!window.pdfjsLib) {
                console.log('Loading PDF.js library...');
                await this.loadPDFJS();
            }
            
            // Set worker source
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            console.log('Fetching PDF from:', pdfPath);
            
            // Fetch the PDF as a blob first to ensure we get the correct content
            const response = await fetch(pdfPath, {
                headers: {
                    'Accept': 'application/pdf'
                }
            });
            console.log('Response status:', response.status, 'statusText:', response.statusText);
            console.log('Content-Type:', response.headers.get('content-type'));
            
            if (!response.ok) {
                throw new Error('Failed to fetch PDF: ' + response.status);
            }
            
            const blob = await response.blob();
            console.log('PDF blob size:', blob.size, 'type:', blob.type);
            
            if (blob.size === 0) {
                throw new Error('PDF blob is empty');
            }
            
            // Create an object URL for the blob
            const objectUrl = URL.createObjectURL(blob);
            console.log('Created object URL:', objectUrl);
            
            // Load the PDF document from the blob
            const loadingTask = pdfjsLib.getDocument(objectUrl);
            this.pdfDoc = await loadingTask.promise;
            
            // Render first page
            this.renderPage(this.pageNum);
            
            return true;
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Failed to load PDF document: ' + error.message);
            return false;
        }
    }

    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async renderPage(num) {
        this.pageRendering = true;
        
        try {
            const page = await this.pdfDoc.getPage(num);
            
            // Create canvas if not exists
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.ctx = this.canvas.getContext('2d');
                this.container.appendChild(this.canvas);
            }
            
            const viewport = page.getViewport({ scale: this.scale });
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;
            
            // Add CSS to prevent selection and copying
            this.canvas.style.userSelect = 'none';
            this.canvas.style.webkitUserSelect = 'none';
            this.canvas.style.MozUserSelect = 'none';
            this.canvas.style.msUserSelect = 'none';
            this.canvas.style.cursor = 'default';
            
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            this.pageRendering = false;
            
            if (this.pageNumPending !== null) {
                this.renderPage(this.pageNumPending);
                this.pageNumPending = null;
            }
            
            // Update page number display
            this.updatePageControls();
            
        } catch (error) {
            console.error('Error rendering page:', error);
            this.pageRendering = false;
        }
    }

    queueRenderPage(num) {
        if (this.pageRendering) {
            this.pageNumPending = num;
        } else {
            this.renderPage(num);
        }
    }

    onPrevPage() {
        if (this.pageNum <= 1) {
            return;
        }
        this.pageNum--;
        this.queueRenderPage(this.pageNum);
    }

    onNextPage() {
        if (this.pageNum >= this.pdfDoc.numPages) {
            return;
        }
        this.pageNum++;
        this.queueRenderPage(this.pageNum);
    }

    updatePageControls() {
        // Create or update page controls
        let controls = document.getElementById('pdf-controls-' + this.container.id);
        
        if (!controls) {
            controls = document.createElement('div');
            controls.id = 'pdf-controls-' + this.container.id;
            controls.className = 'pdf-controls';
            controls.style.cssText = `
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: #f5f5f5;
                border-top: 1px solid #ddd;
            `;
            
            const prevBtn = document.createElement('button');
            prevBtn.textContent = 'Previous';
            prevBtn.className = 'pdf-prev-btn';
            prevBtn.style.cssText = `
                padding: 8px 16px;
                background: #0057b8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            prevBtn.onclick = () => this.onPrevPage();
            
            const pageInfo = document.createElement('span');
            pageInfo.className = 'pdf-page-info';
            pageInfo.style.cssText = `
                font-size: 14px;
                color: #333;
            `;
            
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Next';
            nextBtn.className = 'pdf-next-btn';
            nextBtn.style.cssText = `
                padding: 8px 16px;
                background: #0057b8;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;
            nextBtn.onclick = () => this.onNextPage();
            
            controls.appendChild(prevBtn);
            controls.appendChild(pageInfo);
            controls.appendChild(nextBtn);
            
            // Insert controls after canvas
            this.container.parentNode.insertBefore(controls, this.container.nextSibling);
        }
        
        // Update page info
        const pageInfo = controls.querySelector('.pdf-page-info');
        if (pageInfo && this.pdfDoc) {
            pageInfo.textContent = `Page ${this.pageNum} of ${this.pdfDoc.numPages}`;
        }
        
        // Update button states
        const prevBtn = controls.querySelector('.pdf-prev-btn');
        const nextBtn = controls.querySelector('.pdf-next-btn');
        if (prevBtn) prevBtn.disabled = this.pageNum <= 1;
        if (nextBtn) nextBtn.disabled = this.pageNum >= this.pdfDoc.numPages;
    }

    showError(message) {
        this.container.innerHTML = `
            <div style="
                padding: 40px;
                text-align: center;
                color: #666;
                background: #f5f5f5;
                border-radius: 8px;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545; margin-bottom: 15px;"></i>
                <p style="font-size: 16px;">${message}</p>
            </div>
        `;
    }

    destroy() {
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
        
        const controls = document.getElementById('pdf-controls-' + this.container.id);
        if (controls) {
            controls.remove();
        }
        
        if (this.pdfDoc) {
            this.pdfDoc.destroy();
            this.pdfDoc = null;
        }
    }
}

// Function to display article PDF in a modal
function displayArticlePDF(pdfPath, title) {
    console.log('displayArticlePDF called with:', pdfPath, title);
    
    // Check if dark mode is active
    const isDarkMode = document.body.classList.contains('dark-mode') || 
                       document.documentElement.classList.contains('dark-mode');
    
    // Calculate sidebar and header offsets
    function getModalPosition() {
        const sidebar = document.getElementById('sidebar');
        const header = document.querySelector('.header');
        
        let leftOffset = 0;
        let topOffset = 0;
        
        // Check if sidebar exists and is collapsed
        if (sidebar) {
            if (sidebar.classList.contains('collapsed')) {
                leftOffset = 0;
            } else {
                leftOffset = 200; // Sidebar width
            }
        }
        
        // Check if header exists
        if (header) {
            topOffset = 80; // Header height approx
        }
        
        return { left: leftOffset, top: topOffset };
    }
    
    // Get current position
    const pos = getModalPosition();
    
    // Create modal if not exists
    let modal = document.getElementById('pdf-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.style.cssText = `
            display: none;
            position: absolute;
            top: ${pos.top}px;
            left: ${pos.left}px;
            width: calc(100% - ${pos.left}px);
            height: calc(100% - ${pos.top}px);
            background: ${isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)'};
            z-index: 100;
            overflow: auto;
        `;
        
        const containerBg = isDarkMode ? '#1a1a1a' : '#f5f5f5';
        const headerBg = isDarkMode ? '#ffd700' : '#0057b8';
        const headerText = isDarkMode ? '#1a1a1a' : '#ffffff';
        const innerBg = isDarkMode ? '#2d2d2d' : '#ffffff';
        
        modal.innerHTML = `
            <div style="
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: ${innerBg};
                overflow: hidden;
                display: flex;
                flex-direction: column;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    background: ${headerBg};
                    color: ${headerText};
                    flex-shrink: 0;
                ">
                    <h3 id="pdf-modal-title" style="margin: 0; font-size: 16px; color: ${headerText};">Document Viewer</h3>
                    <button onclick="closePDFModal()" style="
                        background: none;
                        border: none;
                        color: ${headerText};
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                    ">×</button>
                </div>
                <div id="pdf-viewer-container" style="
                    flex: 1;
                    overflow: auto;
                    background: ${containerBg};
                    height: auto;
                "></div>
            </div>
        `;
        
        // Append to file-viewer instead of body
        const fileViewer = document.querySelector('.file-viewer');
        if (fileViewer) {
            fileViewer.appendChild(modal);
            console.log('PDF modal appended to .file-viewer');
        } else {
            // Fallback to body if file-viewer not found
            document.body.appendChild(modal);
            console.log('PDF modal appended to body (file-viewer not found)');
        }
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePDFModal();
            }
        });
        
        // Listen for sidebar toggle to adjust modal position
        const toggleBtn = document.getElementById('toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                if (modal.style.display === 'block') {
                    const newPos = getModalPosition();
                    modal.style.left = newPos.left + 'px';
                    modal.style.width = 'calc(100% - ' + newPos.left + 'px)';
                }
            });
        }
    } else {
        // Update existing modal position
        modal.style.top = pos.top + 'px';
        modal.style.left = pos.left + 'px';
        modal.style.width = 'calc(100% - ' + pos.left + 'px)';
        modal.style.height = 'calc(100% - ' + pos.top + 'px)';
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Set title
    document.getElementById('pdf-modal-title').textContent = title || 'Document Viewer';
    
    // Load PDF using PDF.js to render as canvas (no browser toolbar)
    const container = document.getElementById('pdf-viewer-container');
    container.innerHTML = `
        <style>
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        </style>
        <div style="
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            height: 70vh; 
            background: #525252;
            color: white;
        ">
            <div style="
                width: 50px; 
                height: 50px; 
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <p style="font-size: 16px; margin: 0;">Loading document...</p>
            <p style="font-size: 12px; color: #aaa; margin-top: 8px;">This may take a few seconds</p>
        </div>
    `;
    
    // Convert pdfPath to API URL
    let pdfUrl = pdfPath;
    console.log('Original pdfPath:', pdfPath);
    
    // If it's a Studies folder path, serve directly from static folder
    if (pdfPath && pdfPath.includes('/Studies/')) {
        pdfUrl = pdfPath;
        console.log('Using static Studies path:', pdfUrl);
    } else if (pdfPath && pdfPath.startsWith('/api/pdf/')) {
        pdfUrl = pdfPath;
        console.log('Using API PDF path:', pdfUrl);
    } else if (pdfPath && !pdfPath.includes('/') && !pdfPath.includes('.')) {
        pdfUrl = '/api/pdf/' + pdfPath;
        console.log('Using constructed PDF API path:', pdfUrl);
    } else {
        console.log('Using pdfPath as-is:', pdfPath);
    }
    
    console.log('Final PDF URL:', pdfUrl);
    
    // Only use API endpoint for relative paths, not for full URLs (like Supabase)
    if (pdfPath && pdfPath.includes('/Studies/') && !pdfPath.startsWith('http')) {
        const relativePath = pdfPath.replace('/Studies/', '');
        pdfUrl = '/api/studies-pdf?path=' + encodeURIComponent(relativePath);
        console.log('Using Studies API:', pdfUrl);
    }
    
    // Add cache buster (don't encode the full URL, just add the parameter)
    const cacheBuster = '_=' + Date.now();
    const finalPdfUrl = pdfUrl + (pdfUrl.includes('?') ? '&' : '?') + cacheBuster;
    
    // Use PDF.js to render PDF pages as canvas (no browser toolbar)
    loadPDFWithPDFJS(finalPdfUrl, container, title);
    
    // Store viewer instance for cleanup
    modal._pdfViewer = { close: function() { } };
}

// Load PDF using PDF.js - plain viewer with search, zoom, and page navigation
async function loadPDFWithPDFJS(pdfUrl, container, title) {
    try {
        // Fetch the PDF
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error('Failed to fetch PDF: ' + response.status);
        
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('PDF blob is empty');
        
        const objectUrl = URL.createObjectURL(blob);
        
        // Function to check dark mode dynamically
        function checkDarkMode() {
            return document.body.classList.contains('dark-mode') || 
                   !!document.querySelector('.dark-mode') ||
                   document.body.style.backgroundColor === 'rgb(33, 37, 41)' ||
                   document.body.style.backgroundColor === '#212529';
        }
        
        // Detect dark mode
        const isDarkMode = checkDarkMode();
        
        const toolbarBg = isDarkMode ? '#1a1a1a' : '#f0f0f0';
        const toolbarBorder = isDarkMode ? '#444' : '#ccc';
        const inputBg = isDarkMode ? '#2d2d2d' : '#fff';
        const inputBorder = isDarkMode ? '#555' : '#ccc';
        const inputColor = isDarkMode ? '#fff' : '#333';
        const btnBg = isDarkMode ? '#ffd700' : '#0057b8';
        const btnColor = isDarkMode ? '#1a1a1a' : '#fff';
        const canvasBg = isDarkMode ? '#121212' : '#525252';
        const countColor = isDarkMode ? '#aaa' : '#333';
        
        // Container with search bar, zoom controls, and page navigation - dark mode support
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;">
                <div style="padding:8px 12px;background:${toolbarBg};border-bottom:1px solid ${toolbarBorder};display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;">
                    <input type="text" id="pdf-search-input" placeholder="Search (Ctrl+F)..." 
                           style="padding:6px 10px;border:1px solid ${inputBorder};border-radius:4px;width:200px;font-size:14px;background:${inputBg};color:${inputColor};">
                    <button id="pdf-search-btn" style="padding:6px 12px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;">
                        <i class="fas fa-search"></i>
                    </button>
                    <button id="pdf-search-clear" style="padding:6px 10px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;" title="Clear">
                        <i class="fas fa-times"></i>
                    </button>
                    <button id="pdf-search-prev" style="padding:6px 10px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;" title="Previous match">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <button id="pdf-search-next" style="padding:6px 10px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;" title="Next match">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <span id="pdf-search-count" style="font-size:13px;color:${countColor};"></span>
                    <span style="color:${countColor};margin-left:10px;">|</span>
                    <button id="pdf-prev-page" style="padding:6px 10px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;" title="Previous Page">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <span id="pdf-page-indicator" style="font-size:13px;color:${countColor};min-width:80px;text-align:center;">Page 1 of 1</span>
                    <button id="pdf-next-page" style="padding:6px 10px;background:${btnBg};color:${btnColor};border:none;border-radius:4px;cursor:pointer;" title="Next Page">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div id="pdf-viewer-canvas-container" class="pdf-canvas-container" style="flex:1;overflow:auto;background:${canvasBg};text-align:center;padding:20px;"></div>
            </div>`;
        
        // Load PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const pdfDoc = await window.pdfjsLib.getDocument(objectUrl).promise;
        const canvasContainer = container.querySelector('#pdf-viewer-canvas-container');
        const searchInput = container.querySelector('#pdf-search-input');
        const searchBtn = container.querySelector('#pdf-search-btn');
        const searchCount = container.querySelector('#pdf-search-count');
        const zoomLevelSpan = container.querySelector('#pdf-zoom-level');
        const pageIndicator = container.querySelector('#pdf-page-indicator');
        
        // Store page data and canvases for search
        const pageData = [];
        const containerWidth = container.clientWidth - 40;
        
        // Default scale (not fit to width)
        let currentScale = 1.0;
        
        // Function to render all pages with current scale
        async function renderAllPages() {
            canvasContainer.innerHTML = '';
            pageData.length = 0;
            
            // Check if we should use two-column layout (desktop/laptop screens)
            const useTwoColumn = window.innerWidth >= 1024;
            
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const baseViewport = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: currentScale });
                
                const canvasWrapper = document.createElement('div');
                canvasWrapper.style.position = 'relative';
                canvasWrapper.style.display = 'inline-block';
                canvasWrapper.style.marginBottom = '10px';
                canvasWrapper.style.verticalAlign = 'top';
                
                // Add page number label
                const pageLabel = document.createElement('div');
                pageLabel.className = 'pdf-page-label';
                pageLabel.textContent = `Page ${i}`;
                pageLabel.style.cssText = `
                    text-align: center;
                    padding: 5px;
                    font-size: 12px;
                    color: ${isDarkMode ? '#aaa' : '#666'};
                    background: ${isDarkMode ? '#2d2d2d' : '#f0f0f0'};
                    border-radius: 4px 4px 0 0;
                    margin-bottom: 2px;
                `;
                canvasWrapper.appendChild(pageLabel);
                
                const canvas = document.createElement('canvas');
                canvas.style.display = 'block';
                canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.dataset.pageNum = i;
                
                await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
                
                canvasWrapper.appendChild(canvas);
                canvasContainer.appendChild(canvasWrapper);
                
                // Store text items with position info for highlighting
                pageData.push({
                    pageNum: i,
                    items: textContent.items,
                    scale: currentScale,
                    viewport: viewport,
                    canvasWrapper: canvasWrapper
                });
            }
            
            // Update zoom level display
            zoomLevelSpan.textContent = Math.round(currentScale * 100) + '%';
            
            // Update page indicator to show current visible page
            const currentPage = getCurrentVisiblePage();
            pageIndicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
        }
        
        // Initial render with default scale
        await renderAllPages();
        
        // Handle window resize for responsive layout
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const currentPage = getCurrentVisiblePage();
                renderAllPages().then(() => {
                    setTimeout(() => scrollToPage(currentPage), 100);
                });
            }, 250);
        });
        

        
        // Page navigation with improved page detection
        container.querySelector('#pdf-prev-page').addEventListener('click', () => {
            const currentPage = getCurrentVisiblePage();
            if (currentPage > 1) {
                scrollToPage(currentPage - 1);
            }
        });
        
        container.querySelector('#pdf-next-page').addEventListener('click', () => {
            const currentPage = getCurrentVisiblePage();
            if (currentPage < pdfDoc.numPages) {
                scrollToPage(currentPage + 1);
            }
        });
        
        // Get currently visible page (improved accuracy)
        function getCurrentVisiblePage() {
            const containerRect = canvasContainer.getBoundingClientRect();
            const containerTop = containerRect.top;
            const containerBottom = containerRect.bottom;
            const containerCenter = containerTop + (containerRect.height / 2);
            
            let closestPage = 1;
            let closestDistance = Infinity;
            
            for (let i = 0; i < pageData.length; i++) {
                const canvasWrapper = pageData[i].canvasWrapper;
                const rect = canvasWrapper.getBoundingClientRect();
                
                // Check if page is visible in container
                if (rect.bottom >= containerTop && rect.top <= containerBottom) {
                    // Calculate distance from center of container
                    const pageCenter = rect.top + (rect.height / 2);
                    const distance = Math.abs(pageCenter - containerCenter);
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestPage = pageData[i].pageNum;
                    }
                }
            }
            
            return closestPage;
        }
        
        // Scroll to specific page with proper indicator update
        function scrollToPage(pageNum) {
            const pageDataItem = pageData.find(p => p.pageNum === pageNum);
            if (pageDataItem) {
                pageDataItem.canvasWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Update page indicator immediately and after scroll
                pageIndicator.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
                // Also update after scroll completes
                setTimeout(() => {
                    pageIndicator.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
                }, 500);
            }
        }
        
        // Update page indicator on scroll with debouncing
        let scrollTimeout;
        canvasContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const currentPage = getCurrentVisiblePage();
                pageIndicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
            }, 100);
        });
        

        
        // Store all highlights for navigation
        let allHighlights = [];
        let currentHighlightIndex = -1;
        
        // Search function
        function performSearch(query) {
            // Clear previous highlights
            document.querySelectorAll('.pdf-search-highlight').forEach(el => el.remove());
            allHighlights = [];
            currentHighlightIndex = -1;
            
            if (!query || !query.trim()) {
                searchCount.textContent = '';
                return;
            }
            
            const searchTerm = query.toLowerCase();
            let totalMatches = 0;
            
            pageData.forEach(page => {
                page.items.forEach(item => {
                    if (item.str.toLowerCase().includes(searchTerm)) {
                        totalMatches++;
                        
                        // Create highlight - border only, no background
                        const transform = item.transform;
                        // transform[4] = x from left, transform[5] = y from bottom
                        // Convert to canvas coords (top-left origin)
                        const x = transform[4] * page.scale;
                        const y = (page.viewport.height - transform[5] - (item.height || 0)) * page.scale;
                        const width = (item.width || item.str.length * 6) * page.scale;
                        const height = ((item.height || 12) + 2) * page.scale;
                        
                        const highlight = document.createElement('div');
                        highlight.className = 'pdf-search-highlight';
                        highlight.style.cssText = `
                            position: absolute;
                            left: ${x}px;
                            top: ${y}px;
                            width: ${Math.max(width, 10)}px;
                            height: ${Math.max(height, 10)}px;
                            border: 2px solid #ff6b00;
                            cursor: pointer;
                            z-index: 5;
                        `;
                        highlight.title = item.str;
                        highlight.dataset.index = totalMatches - 1;
                        
                        highlight.onclick = () => {
                            highlightMatch(parseInt(highlight.dataset.index));
                        };
                        
                        page.canvasWrapper.appendChild(highlight);
                        allHighlights.push(highlight);
                    }
                });
            });
            
            if (totalMatches > 0) {
                currentHighlightIndex = 0;
                highlightMatch(0);
                searchCount.textContent = `1 of ${totalMatches}`;
            } else {
                searchCount.textContent = 'No matches';
            }
        }
        
        function highlightMatch(index) {
            if (index < 0 || index >= allHighlights.length) return;
            
            // Reset all highlights
            allHighlights.forEach(h => h.style.border = '2px solid #ff6b00');
            
            // Highlight current
            currentHighlightIndex = index;
            allHighlights[index].style.border = '3px solid #ff0000';
            
            // Scroll to highlight
            allHighlights[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            searchCount.textContent = `${index + 1} of ${allHighlights.length}`;
        }
        
        // Clear function
        function clearSearch() {
            searchInput.value = '';
            document.querySelectorAll('.pdf-search-highlight').forEach(el => el.remove());
            allHighlights = [];
            currentHighlightIndex = -1;
            searchCount.textContent = '';
        }
        
        // Navigation functions
        function goToNextMatch() {
            if (allHighlights.length === 0) return;
            currentHighlightIndex = (currentHighlightIndex + 1) % allHighlights.length;
            highlightMatch(currentHighlightIndex);
        }
        
        function goToPrevMatch() {
            if (allHighlights.length === 0) return;
            currentHighlightIndex = (currentHighlightIndex - 1 + allHighlights.length) % allHighlights.length;
            highlightMatch(currentHighlightIndex);
        }
        
        // Search button click
        searchBtn.onclick = () => performSearch(searchInput.value);
        
        // Clear button click
        document.getElementById('pdf-search-clear').onclick = clearSearch;
        
        // Previous button
        document.getElementById('pdf-search-prev').onclick = goToPrevMatch;
        
        // Next button
        document.getElementById('pdf-search-next').onclick = goToNextMatch;
        
        // Enter key to search
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') performSearch(searchInput.value);
        };
        
        // Ctrl+F to focus search
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
                searchInput.select();
            }
        });
        
        console.log('PDF loaded with PDF.js and search');
    } catch (error) {
        console.error('Error loading PDF:', error);
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #dc3545;"><i class="fas fa-exclamation-circle" style="font-size: 48px;"></i><p>Error: ' + error.message + '</p></div>';
    }
}

// Load PDF.js library dynamically (kept for backward compatibility)
function loadPDFJSLibrary() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function closePDFModal() {
    const modal = document.getElementById('pdf-viewer-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Ensure the main content/articles are visible after closing PDF viewer
        const contentWrapper = document.querySelector('.content-wrapper');
        const mainContent = document.querySelector('.main');
        const articlesContainer = document.getElementById('articles-container');
        
        if (contentWrapper) {
            contentWrapper.style.display = '';
        }
        if (mainContent) {
            mainContent.style.display = '';
        }
        if (articlesContainer) {
            articlesContainer.style.display = '';
        }
        
        // Restore visibility to any hidden articles
        document.querySelectorAll('.article').forEach(article => {
            article.style.display = '';
        });
    }
    // Just close the modal - don't redirect
}

// PDF Search functionality
class PDFSearcher {
    constructor(pdfDoc, pagesContainer) {
        this.pdfDoc = pdfDoc;
        this.pagesContainer = pagesContainer;
        this.searchResults = [];
        this.currentMatchIndex = -1;
        this.searchQuery = '';
        this.textContentCache = new Map();
    }

    // Extract text content from all pages
    async extractAllText() {
        const textContent = [];
        for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textItems = await page.getTextContent();
            textContent.push({
                pageNum: pageNum,
                items: textItems.items,
                page: page
            });
        }
        return textContent;
    }

    // Search for text in the PDF
    async search(query) {
        if (!query || query.trim() === '') {
            this.clearSearch();
            return [];
        }

        this.searchQuery = query.toLowerCase().trim();
        this.searchResults = [];
        this.currentMatchIndex = -1;

        // Clear existing highlights
        this.clearHighlights();

        // Search through all pages - build full text per page first
        const pageTexts = {};
        
        for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Build full text and track item positions
            let fullText = '';
            const textItems = [];
            
            for (const item of textContent.items) {
                if (item.str && item.str.trim()) {
                    textItems.push({
                        str: item.str,
                        transform: item.transform,
                        width: item.width,
                        height: item.height || 10
                    });
                    fullText += item.str + ' ';
                }
            }
            
            pageTexts[pageNum] = {
                fullText: fullText.toLowerCase(),
                items: textItems
            };
        }
        
        // Now search for exact matches in the full text
        const queryLower = this.searchQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
        
        for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
            const pageData = pageTexts[pageNum];
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1 });
            
            // Find exact matches using word boundary regex
            const escapedQuery = queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp('\\b' + escapedQuery + '\\b', 'gi');
            let match;
            
            while ((match = regex.exec(pageData.fullText)) !== null) {
                const matchIndex = match.index;
                const matchLength = match[0].length;
                
                // Find the text item that contains this match
                let charCount = 0;
                for (const item of pageData.items) {
                    const itemLength = item.str.length;
                    const itemStart = charCount;
                    const itemEnd = charCount + itemLength;
                    
                    // Check if match overlaps with this item
                    if (matchIndex < itemEnd && matchIndex + matchLength > itemStart) {
                        // Calculate position within this item
                        const transform = item.transform;
                        
                        // PDF coordinates: origin is bottom-left
                        // Transform: [scaleX, skewY, skewX, scaleY, x, y]
                        const x = transform[4];
                        const y = transform[5];
                        const width = item.width;
                        const height = item.height || 10;
                        
                        // Only add if not already added for this position (avoid duplicates)
                        const exists = this.searchResults.some(r => 
                            r.pageNum === pageNum && 
                            Math.abs(r.x - x) < 5 && 
                            Math.abs(r.y - y) < 5
                        );
                        
                        if (!exists) {
                            this.searchResults.push({
                                pageNum: pageNum,
                                text: match[0],
                                x: x,
                                y: y,
                                width: Math.max(width, matchLength * 6),
                                height: height,
                                viewport: viewport
                            });
                        }
                        break; // Only match one item per occurrence
                    }
                    
                    charCount += itemLength + 1; // +1 for space
                }
            }
        }

        console.log(`Found ${this.searchResults.length} matches for "${query}"`);
        return this.searchResults;
    }

    // Highlight all matches on the PDF
    highlightMatches() {
        this.clearHighlights();

        if (this.searchResults.length === 0) return;

        // Get all canvas elements (one per page)
        const canvases = this.pagesContainer.querySelectorAll('canvas');
        console.log('Found ' + canvases.length + ' canvases, ' + this.searchResults.length + ' results');

        this.searchResults.forEach((result, index) => {
            const canvas = canvases[result.pageNum - 1];
            if (!canvas) {
                console.log('No canvas for page ' + result.pageNum);
                return;
            }

            // Create highlight overlay
            const highlight = document.createElement('div');
            highlight.className = 'pdf-search-highlight';
            highlight.dataset.matchIndex = index;
            highlight.dataset.pageNum = result.pageNum;
            
            // Calculate position relative to canvas using actual rendered canvas size
            // Use scale 1 for the viewport since we stored positions at scale 1
            const scale = canvas.width / result.viewport.width;
            const x = result.x * scale;
            const y = result.y * scale;
            
            highlight.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: ${Math.max(result.width * scale, 20)}px;
                height: ${Math.max(result.height * scale, 14)}px;
                background-color: rgba(255, 235, 59, 0.3);
                border: 1px solid rgba(255, 152, 0, 0.6);
                cursor: pointer;
                z-index: 10;
                pointer-events: auto;
            `;

            // Add click handler to jump to this match
            highlight.addEventListener('click', () => {
                this.goToMatch(index);
            });

            // Position relative to the canvas container
            const wrapper = canvas.parentElement;
            if (wrapper) {
                wrapper.style.position = 'relative';
                wrapper.appendChild(highlight);
            }
        });

        // Highlight current match
        this.highlightCurrentMatch();
    }

    // Highlight the current match with a different color
    highlightCurrentMatch() {
        // Remove current highlight class from all
        const allHighlights = this.pagesContainer.querySelectorAll('.pdf-search-highlight');
        allHighlights.forEach(h => {
            h.style.backgroundColor = 'rgba(255, 235, 59, 0.3)';
            h.style.borderColor = 'rgba(255, 152, 0, 0.6)';
            h.style.zIndex = '10';
        });

        if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchResults.length) {
            const currentHighlight = this.pagesContainer.querySelector(
                `.pdf-search-highlight[data-match-index="${this.currentMatchIndex}"]`
            );
            if (currentHighlight) {
                currentHighlight.style.backgroundColor = 'rgba(255, 152, 0, 0.4)';
                currentHighlight.style.borderColor = 'rgba(255, 87, 34, 0.8)';
                currentHighlight.style.zIndex = '20';
                
                // Scroll to the match
                currentHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Go to specific match
    goToMatch(index) {
        if (index >= 0 && index < this.searchResults.length) {
            this.currentMatchIndex = index;
            this.highlightCurrentMatch();
            
            // Update match counter display
            const matchCounter = document.getElementById('pdf-search-match-counter');
            if (matchCounter) {
                matchCounter.textContent = `${this.currentMatchIndex + 1} of ${this.searchResults.length} matches`;
            }
        }
    }

    // Go to next match
    nextMatch() {
        if (this.searchResults.length === 0) return;
        
        this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchResults.length;
        this.highlightCurrentMatch();
        
        const matchCounter = document.getElementById('pdf-search-match-counter');
        if (matchCounter) {
            matchCounter.textContent = `${this.currentMatchIndex + 1} of ${this.searchResults.length} matches`;
        }
    }

    // Go to previous match
    previousMatch() {
        if (this.searchResults.length === 0) return;
        
        this.currentMatchIndex = (this.currentMatchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        this.highlightCurrentMatch();
        
        const matchCounter = document.getElementById('pdf-search-match-counter');
        if (matchCounter) {
            matchCounter.textContent = `${this.currentMatchIndex + 1} of ${this.searchResults.length} matches`;
        }
    }

    // Clear all highlights
    clearHighlights() {
        const highlights = this.pagesContainer.querySelectorAll('.pdf-search-highlight');
        highlights.forEach(h => h.remove());
    }

    // Clear search state
    clearSearch() {
        this.searchResults = [];
        this.currentMatchIndex = -1;
        this.searchQuery = '';
        this.clearHighlights();
        
        const matchCounter = document.getElementById('pdf-search-match-counter');
        if (matchCounter) {
            matchCounter.textContent = 'No matches';
        }
    }
}

// Create search UI for PDF viewer
function createPDFSearchUI(container, searcher) {
    // Remove existing search UI if any
    const existingSearch = document.getElementById('pdf-search-container');
    if (existingSearch) {
        existingSearch.remove();
    }

    const searchContainer = document.createElement('div');
    searchContainer.id = 'pdf-search-container';
    searchContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 15px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        z-index: 100;
    `;

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search in document...';
    searchInput.id = 'pdf-search-input';
    searchInput.style.cssText = `
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        width: 200px;
        outline: none;
    `;

    // Search button
    const searchBtn = document.createElement('button');
    searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    searchBtn.title = 'Search';
    searchBtn.style.cssText = `
        padding: 8px 12px;
        background: #0057b8;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;

    // Match counter
    const matchCounter = document.createElement('span');
    matchCounter.id = 'pdf-search-match-counter';
    matchCounter.textContent = 'No matches';
    matchCounter.style.cssText = `
        font-size: 13px;
        color: #666;
        min-width: 120px;
    `;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
    prevBtn.title = 'Previous match';
    prevBtn.id = 'pdf-search-prev';
    prevBtn.style.cssText = `
        padding: 8px 10px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
    nextBtn.title = 'Next match';
    nextBtn.id = 'pdf-search-next';
    nextBtn.style.cssText = `
        padding: 8px 10px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = '<i class="fas fa-times"></i>';
    clearBtn.title = 'Clear search';
    clearBtn.id = 'pdf-search-clear';
    clearBtn.style.cssText = `
        padding: 8px 10px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Event handlers
    let searchTimeout = null;

    const performSearch = async () => {
        const query = searchInput.value.trim();
        if (query) {
            await searcher.search(query);
            searcher.highlightMatches();
            
            const matchCounter = document.getElementById('pdf-search-match-counter');
            if (matchCounter) {
                if (searcher.searchResults.length > 0) {
                    matchCounter.textContent = `1 of ${searcher.searchResults.length} matches`;
                    searcher.currentMatchIndex = 0;
                    searcher.highlightCurrentMatch();
                } else {
                    matchCounter.textContent = 'No matches found';
                }
            }
        } else {
            searcher.clearSearch();
        }
    };

    // Search on input with debounce
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 300);
    });

    // Search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            performSearch();
        }
    });

    searchBtn.addEventListener('click', () => {
        clearTimeout(searchTimeout);
        performSearch();
    });

    prevBtn.addEventListener('click', () => {
        searcher.previousMatch();
    });

    nextBtn.addEventListener('click', () => {
        searcher.nextMatch();
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searcher.clearSearch();
    });

    // Append all elements
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchBtn);
    searchContainer.appendChild(matchCounter);
    searchContainer.appendChild(prevBtn);
    searchContainer.appendChild(nextBtn);
    searchContainer.appendChild(clearBtn);

    // Insert at the top of the container
    container.insertBefore(searchContainer, container.firstChild);

    return searchContainer;
}

// Make functions globally available
window.displayArticlePDF = displayArticlePDF;
window.closePDFModal = closePDFModal;
