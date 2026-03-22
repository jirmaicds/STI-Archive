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
    
    // Create modal if not exists
    let modal = document.getElementById('pdf-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pdf-viewer-modal';
        modal.style.cssText = `
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
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
    
    // If it's a Studies folder path, use our API endpoint instead
    if (pdfPath && pdfPath.includes('/Studies/')) {
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

// Load PDF using PDF.js - plain viewer without toolbar
async function loadPDFWithPDFJS(pdfUrl, container, title) {
    try {
        // Fetch the PDF
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error('Failed to fetch PDF: ' + response.status);
        
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('PDF blob is empty');
        
        const objectUrl = URL.createObjectURL(blob);
        
        // Plain container for PDF rendering - no toolbar
        container.innerHTML = '<div id="pdf-viewer-canvas-container" style="width:100%;height:100%;overflow:auto;background:#525252;text-align:center;padding:20px;"></div>';
        
        // Load PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => script.onload = resolve);
        
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const pdfDoc = await window.pdfjsLib.getDocument(objectUrl).promise;
        const canvasContainer = container.querySelector('#pdf-viewer-canvas-container');
        
        // Render all pages
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.2 });
            
            const canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto 10px auto';
            canvas.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
            canvasContainer.appendChild(canvas);
        }
        
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

        // Search through all pages
        for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
            const page = await this.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1 });

            for (const item of textContent.items) {
                const text = item.str.toLowerCase();
                if (text.includes(this.searchQuery)) {
                    // Calculate highlight position
                    const transform = item.transform;
                    const x = transform[4];
                    const y = viewport.height - transform[5] - item.height;
                    const width = item.width;
                    const height = item.height || 12;

                    this.searchResults.push({
                        pageNum: pageNum,
                        text: item.str,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        viewport: viewport
                    });
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
