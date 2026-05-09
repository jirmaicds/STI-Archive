// Page Duration Tracking Script
// Include this script in non-admin user pages (e.g., homepage.html, library.html)
// Excludes admin pages (admin.html, coadmin.html, subadmin.html)

(function() {
    // Check if current page is admin page or not a tracked user page
    const currentPath = window.location.pathname.toLowerCase();
    const isAdminPage = currentPath.includes('admin.html') || currentPath.includes('coadmin.html') || currentPath.includes('subadmin.html');
    const isTrackedPage = currentPath.includes('homepage.html') || currentPath.includes('library.html') || currentPath.includes('myspace.html') || currentPath.includes('index.html'); // Include login if desired
    if (isAdminPage || !isTrackedPage) {
        console.log('Page tracking skipped for non-tracked page');
        return; // Only track specific user pages
    }

    // Get user ID and role if logged in (from localStorage)
    const userId = localStorage.getItem('user_id') || null;
    const userRole = localStorage.getItem('user_role') || null;

    // Skip tracking for admin users
    if (userRole && ['admin', 'coadmin', 'subadmin'].includes(userRole.toLowerCase())) {
        console.log('Page tracking skipped for admin user');
        return;
    }

    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('userSessionId');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('userSessionId', sessionId);
    }

    let pageStartTime = performance.now();
    let pageName = document.title || currentPath; // Use page title or path as identifier

    // Function to send tracking data
    function sendTrackingData(duration) {
        const data = {
            userId: userId,
            sessionId: sessionId,
            page: pageName,
            duration: Math.round(duration / 1000), // Duration in seconds
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // Send to backend API (adjust endpoint as needed)
        fetch('/api/analytics/page-duration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(error => console.error('Tracking error:', error));
    }

    // Track on page visibility change (better than unload for modern browsers)
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            const duration = performance.now() - pageStartTime;
            sendTrackingData(duration);
        } else if (document.visibilityState === 'visible') {
            pageStartTime = performance.now(); // Reset if returning
        }
    });

    // Fallback for beforeunload
    window.addEventListener('beforeunload', function() {
        const duration = performance.now() - pageStartTime;
        // Use sendBeacon for reliable sending on unload
        if (navigator.sendBeacon) {
            const data = {
                sessionId: sessionId,
                page: pageName,
                duration: Math.round(duration / 1000),
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };
            navigator.sendBeacon('/api/analytics/page-duration', JSON.stringify(data));
        } else {
            sendTrackingData(duration);
        }
    });

    console.log('Page tracking initialized for:', pageName);
})();