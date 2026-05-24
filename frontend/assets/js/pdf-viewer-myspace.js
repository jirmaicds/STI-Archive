// PDF Viewer Component for MySpace - displays PDFs inline without allowing downloads
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
        // Page indicator only - no buttons, no zoom
        const pageIndicator = document.getElementById('pdf-page-indicator');
        if (pageIndicator && this.pdfDoc) {
            pageIndicator.textContent = `Page ${this.pageNum} of ${this.pdfDoc.numPages}`;
        }
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

// Function to update modal colors dynamically for MySpace
function updateModalColorsMySpace() {
    const modal = document.getElementById('pdf-viewer-modal');
    if (!modal) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const colors = {
        modalBg: isDarkMode ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)',
        innerBg: isDarkMode ? '#2d2d2d' : '#ffffff',
        containerBg: isDarkMode ? '#1a1a1a' : '#f5f5f5'
    };

    // Update modal background
    modal.style.setProperty('background', colors.modalBg, 'important');

    // Update inner container background
    const innerDiv = modal.firstElementChild;
    if (innerDiv && innerDiv.tagName === 'DIV') {
        innerDiv.style.setProperty('background', colors.innerBg, 'important');
    }

    // Update container background
    const container = modal.querySelector('#pdf-viewer-container');
    if (container) {
        container.style.setProperty('background', colors.containerBg, 'important');
    }
}

// Function to display article PDF in a modal for MySpace
function displayArticlePDF(pdfPath, title) {

    // Get existing modal
    let modal = document.getElementById('pdf-viewer-modal');
    if (!modal) {
        console.error('PDF viewer modal not found');
        return;
    }

    // Update modal colors based on current dark mode state
    updateModalColorsMySpace();

    // Add mobile modal CSS if not already present
    if (!document.getElementById('pdf-modal-mobile-css')) {
        const style = document.createElement('style');
        style.id = 'pdf-modal-mobile-css';
        style.textContent = `
            @media (max-width: 768px) {
                #pdf-viewer-modal {
                    position: fixed !important;
                    top: 65px !important; /* Account for navbar height */
                    left: 0 !important;
                    width: 100vw !important;
                    height: calc(100vh - 65px - 80px) !important; /* Account for navbar + footer */
                    z-index: 10001 !important;
                }
                #pdf-viewer-modal > div {
                    position: relative !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                #pdf-viewer-container {
                    flex: 1 !important;
                    height: 100% !important;
                    overflow: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
            }
            /* Ensure header is always visible */
            #pdf-viewer-modal > div > div:first-child {
                position: relative !important;
                z-index: 10002 !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Add dark mode change listener if not already added
    if (!modal._darkModeObserver) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateModalColorsMySpace();
                }
            });
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        modal._darkModeObserver = observer;
    }

    // Show modal
    modal.style.display = 'block';

    // Set title
    const titleElement = document.getElementById('pdf-modal-title');
    if (titleElement) {
        titleElement.textContent = title || 'Document Viewer';
    }

    // Convert pdfPath to API URL
    let pdfUrl = pdfPath;

    // If it's a Studies folder path, serve directly from static folder
    if (pdfPath && pdfPath.includes('/Studies/')) {
        pdfUrl = pdfPath;
    } else if (pdfPath && pdfPath.startsWith('/api/pdf/')) {
        pdfUrl = pdfPath;
    } else if (pdfPath && !pdfPath.includes('/') && !pdfPath.includes('.')) {
        pdfUrl = '/api/pdf/' + pdfPath;
    } else {
    }

    // Only use API endpoint for relative paths, not for full URLs (like Supabase)
    if (pdfPath && pdfPath.includes('/Studies/') && !pdfPath.startsWith('http')) {
        const relativePath = pdfPath.replace('/Studies/', '');
        pdfUrl = '/api/studies-pdf?path=' + encodeURIComponent(relativePath);
    }

    // Get the container
    const container = document.getElementById('pdf-viewer-container');
    if (!container) {
        console.error('PDF viewer container not found');
        return;
    }



    // Use PDF.js to render PDF pages as canvas with search toolbar
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

        // Get current color scheme
        const colors = getColorScheme();

        // Container with page indicator and close button
        const toolbarHtml = `
            <div id="pdf-toolbar" style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:${colors.toolbarBg};border-bottom:1px solid ${colors.toolbarBorder};">
                <span id="pdf-page-indicator" style="color:${colors.countColor};font-size:14px;font-weight:500;"></span>
                <button id="pdf-close-btn" style="background:none;border:none;font-size:24px;color:${colors.countColor};cursor:pointer;margin-right:10px;">&times;</button>
            </div>
        `;

        // Always include search toolbar
        container.innerHTML = `
            <style>
                @media (max-width: 768px) {
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
            <div style="display:flex;flex-direction:column;height:100%;width:100%;">
                ${toolbarHtml}
                <div id="pdf-viewer-canvas-container" class="pdf-canvas-container" style="flex:1;overflow:auto;background:${colors.canvasBg};text-align:center;padding:20px;width:100%;-webkit-overflow-scrolling:touch;"></div>
            </div>`;

        // Load PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);

        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfDoc = await window.pdfjsLib.getDocument(objectUrl).promise;


        const canvasContainer = container.querySelector('#pdf-viewer-canvas-container');
        console.log('Canvas container found:', canvasContainer);

        // Store page data and canvases for search (only if toolbar exists)
        const pageData = [];
        const containerWidth = container.clientWidth - 40;

        // Default scale for natural viewing
        const defaultScale = 1.0;

        let renderAllPagesLock = false;
        let renderAllPagesPending = false;

        // Function to render pages at default scale
        function renderPagesAtDefaultScale() {
            // Simple vertical layout at default scale
            return defaultScale;
        }

        // Function to render all pages vertically at default scale
        async function renderAllPages() {
            console.log('renderAllPages called, pdfDoc.numPages:', pdfDoc.numPages);
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

        // Watch for dark mode changes and update colors
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // Colors can be updated here if needed
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
            }
        }

        // Update page indicator on scroll with debouncing
        let scrollTimeout;
        canvasContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const currentPage = getCurrentVisiblePage();
                if (viewerInstance && viewerInstance.pdfDoc) {
                    viewerInstance.pageNum = currentPage;
                    viewerInstance.updatePageControls();
                }
            }, 100);
        });

        // Close button functionality
        const closeBtn = container.querySelector('#pdf-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closePDFModal();
            });
        }


    } catch (error) {
        console.error('Error loading PDF:', error);
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #dc3545;"><i class="fas fa-exclamation-circle" style="font-size: 48px;"></i><p>Error: ' + error.message + '</p></div>';
    }
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

        // Show the select article when PDF modal is closed
        const selectArticle = document.getElementById('selectArticle');
        if (selectArticle) {
            selectArticle.style.display = 'flex';
        }
        const docPreview = document.getElementById('docPreview');
        if (docPreview) {
            docPreview.style.display = 'none';
        }
    }
    // Just close the modal - don't redirect
}