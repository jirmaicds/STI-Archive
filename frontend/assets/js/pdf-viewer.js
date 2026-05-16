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
                border-radius: 0;
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

// Function to check dark mode dynamically
function checkDarkMode() {
    return document.body.classList.contains('dark-mode') ||
           document.documentElement.classList.contains('dark-mode');
}

// Function to get modal color scheme
function getModalColorScheme() {
    const isDarkMode = checkDarkMode();
    return {
        modalBg: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)',
        innerBg: isDarkMode ? '#2d2d2d' : '#ffffff',
        headerBg: isDarkMode ? '#ffd700' : '#0057b8',
        headerText: isDarkMode ? '#1a1a1a' : '#ffffff',
        containerBg: isDarkMode ? '#1a1a1a' : '#f5f5f5'
    };
}

// Function to update modal colors dynamically
function updateModalColors() {
    const modal = document.getElementById('pdf-viewer-modal');
    if (!modal) return;

    const colors = getModalColorScheme();

    // Update modal background
    modal.style.background = colors.modalBg;

    // Update inner container background
    const innerDiv = modal.firstElementChild;
    if (innerDiv && innerDiv.tagName === 'DIV') {
        innerDiv.style.background = colors.innerBg;
        innerDiv.style.borderRadius = '0';
    }

    // Update header background and text
    const headerDiv = innerDiv ? innerDiv.children[0] : null;
    if (headerDiv) {
        headerDiv.style.background = colors.headerBg;
        headerDiv.style.color = colors.headerText;

        const title = headerDiv.querySelector('#pdf-modal-title');
        if (title) {
            title.style.color = colors.headerText;
        }

        const closeBtn = headerDiv.querySelector('button');
        if (closeBtn) {
            closeBtn.style.color = colors.headerText;
        }
    }

    // Update container background
    const container = modal.querySelector('#pdf-viewer-container');
    if (container) {
        container.style.background = colors.containerBg;
    }
}

// Function to display article PDF in a modal
function displayArticlePDF(pdfPath, title) {

    // Get current color scheme
    const colors = getModalColorScheme();

    // Create modal if not exists
    let modal = document.getElementById('pdf-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${colors.modalBg};
            z-index: 10001;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        modal.innerHTML = `
            <style>
                @media (max-width: 768px) {
                    #pdf-viewer-modal {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        z-index: 10001 !important;
                    }
                    #pdf-viewer-modal > div {
                        position: relative !important;
                        width: 100% !important;
                        height: 100vh !important;
                    }
                    #pdf-viewer-container {
                        flex: 1 !important;
                        height: calc(100vh - 60px) !important;
                        overflow: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                }
                /* Ensure header is always visible */
                #pdf-viewer-modal > div > div:first-child {
                    position: relative !important;
                    z-index: 10002 !important;
                }
            </style>
            <div style="
                position: relative;
                width: min(1100px, 100%);
                max-width: 100%;
                max-height: calc(100vh - 40px);
                margin: auto;
                overflow: hidden;
                background: ${colors.innerBg};
                display: flex;
                flex-direction: column;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.25);
            ">                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px 15px;
                    background: ${colors.headerBg};
                    color: ${colors.headerText};
                    flex-shrink: 0;
                    position: relative;
                    z-index: 10002;
                ">
                    <h3 id="pdf-modal-title" style="margin: 0; font-size: 16px; color: ${colors.headerText};">Document Viewer</h3>
                    <button onclick="closePDFModal()" style="
                        background: none;
                        border: none;
                        color: ${colors.headerText};
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
                    background: ${colors.containerBg};
                    min-height: 0;
                    -webkit-overflow-scrolling: touch;
                "></div>
            </div>
        `;

        // Append to file-viewer
        const fileViewer = document.querySelector('.file-viewer');
        if (fileViewer) {
            fileViewer.appendChild(modal);
        } else {
            // Fallback to body if file-viewer not found
            document.body.appendChild(modal);
        }

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePDFModal();
            }
        });

        // Add dark mode change listener
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateModalColors();
                }
            });
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    } else {
        // Ensure existing modal is positioned correctly
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
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
    
    // Use PDF.js to render PDF pages as canvas (no browser toolbar)
    loadPDFWithPDFJS(pdfUrl, container, title);
    
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

        // Function to get current color scheme
        function getColorScheme() {
            const isDarkMode = checkDarkMode();
            return {
                toolbarBg: isDarkMode ? '#1a1a1a' : '#f0f0f0',
                toolbarBorder: isDarkMode ? '#444' : '#ccc',
                inputBg: isDarkMode ? '#2d2d2d' : '#fff',
                inputBorder: isDarkMode ? '#555' : '#ccc',
                inputColor: isDarkMode ? '#fff' : '#333',
                btnBg: isDarkMode ? '#ffd700' : '#0057b8',
                btnColor: isDarkMode ? '#1a1a1a' : '#fff',
                canvasBg: isDarkMode ? '#121212' : '#525252',
                countColor: isDarkMode ? '#aaa' : '#333'
            };
        }

        // Function to update toolbar colors dynamically
        function updateToolbarColors() {
            const colors = getColorScheme();
            const toolbar = container.querySelector('#pdf-page-indicator')?.parentElement;
            if (toolbar) {
                toolbar.style.background = colors.toolbarBg;
                toolbar.style.borderBottom = `1px solid ${colors.toolbarBorder}`;

                const pageIndicator = container.querySelector('#pdf-page-indicator');
                if (pageIndicator) {
                    pageIndicator.style.color = colors.countColor;
                }

                // Only update the page indicator color
            }

            // Update canvas container background
            const canvasContainer = container.querySelector('#pdf-viewer-canvas-container');
            if (canvasContainer) {
                canvasContainer.style.background = colors.canvasBg;
            }
        }
        
        // Get current color scheme
        const colors = getColorScheme();

        // Container with page navigation - dark mode support
        container.innerHTML = `
            <style>
                @media (max-width: 768px) {
                    #pdf-toolbar {
                        flex-direction: column !important;
                        gap: 8px !important;
                        align-items: stretch !important;
                    }
                    #pdf-search-controls {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    #pdf-viewer-canvas-container {
                        padding: 0 !important;
                        touch-action: manipulation !important;
                        -webkit-overflow-scrolling: touch !important;
                        margin: 0 !important;
                    }
                    .pdf-canvas-container canvas {
                        max-width: none !important;
                        touch-action: manipulation !important;
                    }
                }
                /* Enable natural zoom on tablets and phones */
                @media (max-width: 1024px) {
                    .pdf-canvas-container {
                        touch-action: manipulation !important;
                        -webkit-overflow-scrolling: touch !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .pdf-canvas-container canvas {
                        touch-action: manipulation !important;
                        max-width: 100% !important;
                        height: auto !important;
                    }
                }
            </style>
            <div style="display:flex;flex-direction:column;height:100%;">
                <div id="pdf-toolbar" style="padding:8px 12px;background:${colors.toolbarBg};border-bottom:1px solid ${colors.toolbarBorder};display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div id="pdf-search-controls" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap;">
                        <input id="pdf-search-input" type="text" placeholder="Search text..." style="flex:1;min-width:180px;padding:8px 10px;border:1px solid ${colors.inputBorder};border-radius:4px;background:${colors.inputBg};color:${colors.inputColor};outline:none;" />
                        <button id="pdf-search-btn" style="padding:8px 12px;border:none;border-radius:4px;background:${colors.btnBg};color:${colors.btnColor};cursor:pointer;">Search</button>
                        <button id="pdf-search-clear" style="padding:8px 12px;border:none;border-radius:4px;background:${colors.btnBg};color:${colors.btnColor};cursor:pointer;">Clear</button>
                        <button id="pdf-search-prev" title="Previous match" style="padding:8px 10px;border:none;border-radius:4px;background:${colors.btnBg};color:${colors.btnColor};cursor:pointer;">◀</button>
                        <button id="pdf-search-next" title="Next match" style="padding:8px 10px;border:none;border-radius:4px;background:${colors.btnBg};color:${colors.btnColor};cursor:pointer;">▶</button>
                    </div>
                    <span id="pdf-search-count" style="font-size:13px;color:${colors.countColor};min-width:110px;text-align:right;">&nbsp;</span>
                    <span id="pdf-page-indicator" style="font-size:13px;color:${colors.countColor};min-width:110px;text-align:right;">Page 1 of 1</span>
                </div>
                <div id="pdf-viewer-canvas-container" class="pdf-canvas-container" style="flex:1;overflow:auto;background:${colors.canvasBg};text-align:center;padding:20px;-webkit-overflow-scrolling:touch;width:100%;min-height:0;"></div>
            </div>`;
        
        // Load PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const pdfDoc = await window.pdfjsLib.getDocument(objectUrl).promise;
        const canvasContainer = container.querySelector('#pdf-viewer-canvas-container');
        const pageIndicator = container.querySelector('#pdf-page-indicator');
        
        // Store page data and canvases for search
        const pageData = [];
        const containerWidth = container.clientWidth - 40;
        
        // Default scale for natural viewing
        const defaultScale = 1.0;
        
        let renderAllPagesLock = false;
        let renderAllPagesPending = false;
        let allHighlights = [];
        let currentHighlightIndex = -1;

        // Function to render pages at default scale
        function renderPagesAtDefaultScale() {
            // Simple vertical layout at default scale
            return defaultScale;
        }

        // Function to render all pages vertically at default scale
        async function renderAllPages() {
            if (renderAllPagesLock) {
                renderAllPagesPending = true;
                return;
            }

            renderAllPagesLock = true;
            try {
                canvasContainer.innerHTML = '';
                pageData.length = 0;

                const fragment = document.createDocumentFragment();

                // Render pages sequentially in vertical layout
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    const viewport = page.getViewport({ scale: defaultScale });

                    const canvasWrapper = document.createElement('div');
                    canvasWrapper.style.position = 'relative';
                    canvasWrapper.style.display = 'inline-block';
                    canvasWrapper.style.marginBottom = '10px';
                    canvasWrapper.style.verticalAlign = 'top';

                    const pageLabel = document.createElement('div');
                    pageLabel.className = 'pdf-page-label';
                    pageLabel.textContent = `Page ${i}`;
                    pageLabel.style.cssText = `
                        text-align: center;
                        padding: 5px;
                        font-size: 12px;
                        color: ${checkDarkMode() ? '#aaa' : '#666'};
                        background: ${checkDarkMode() ? '#2d2d2d' : '#f0f0f0'};
                        border-radius: 4px 4px 0 0;
                        margin-bottom: 2px;
                    `;
                    canvasWrapper.appendChild(pageLabel);

                    const canvas = document.createElement('canvas');
                    canvas.style.display = 'block';
                    canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
                    canvas.style.background = checkDarkMode() ? '#2d2d2d' : 'white';
                    canvas.style.maxWidth = '100%';
                    canvas.style.height = 'auto';

                    // Standard canvas sizing for natural zoom support
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    canvas.dataset.pageNum = i;

                    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;

                    canvasWrapper.appendChild(canvas);
                    fragment.appendChild(canvasWrapper);

                    pageData.push({
                        pageNum: i,
                        items: textContent.items,
                        scale: defaultScale,
                        viewport: viewport,
                        canvasWrapper: canvasWrapper
                    });
                }

                canvasContainer.appendChild(fragment);

                const currentPage = getCurrentVisiblePage();
                pageIndicator.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
            } finally {
                renderAllPagesLock = false;
                if (renderAllPagesPending) {
                    renderAllPagesPending = false;
                    await renderAllPages();
                }
            }
        }
        
        // Render pages vertically at default scale
        await renderAllPages();

        // Enable natural touch zoom on mobile/tablet
        if (canvasContainer) {
            // Allow natural pinch-to-zoom on touch devices
            canvasContainer.style.touchAction = 'manipulation';
            canvasContainer.style.webkitOverflowScrolling = 'touch';
        }

        // Initial color update
        updateToolbarColors();

        // Watch for dark mode changes and update colors
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateToolbarColors();
                }
            });
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        
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
        
        const searchInput = container.querySelector('#pdf-search-input');
        const searchBtn = container.querySelector('#pdf-search-btn');
        const searchCount = container.querySelector('#pdf-search-count');

        // Search button click
        if (searchBtn && searchInput) {
            searchBtn.onclick = () => performSearch(searchInput.value);
        }
        
        // Clear button click
        const clearBtn = container.querySelector('#pdf-search-clear');
        if (clearBtn) {
            clearBtn.onclick = clearSearch;
        }
        
        // Previous button
        const prevBtn = container.querySelector('#pdf-search-prev');
        if (prevBtn) {
            prevBtn.onclick = goToPrevMatch;
        }
        
        // Next button
        const nextBtn = container.querySelector('#pdf-search-next');
        if (nextBtn) {
            nextBtn.onclick = goToNextMatch;
        }

        // Enter key to search
        if (searchInput) {
            searchInput.onkeypress = (e) => {
                if (e.key === 'Enter') performSearch(searchInput.value);
            };
        }
        
        // Ctrl+F to focus search
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });
        
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
        
        console.log('PDF loaded with PDF.js');
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





// Make functions globally available
window.displayArticlePDF = displayArticlePDF;
window.closePDFModal = closePDFModal;
