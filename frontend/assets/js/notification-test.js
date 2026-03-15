/**
 * Notification Modal Test Script
 * This file tests the notification functionality in admin.html
 * 
 * Usage: Include this script in admin.html or run it in the browser console
 * after loading admin.html
 */

// Test Configuration
const TEST_CONFIG = {
    maxNotifications: 10,
    testUsers: [
        { id: 'test-1', name: 'Alice Johnson', created_at: new Date().toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-2', name: 'Bob Smith', created_at: new Date(Date.now() - 60000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-3', name: 'Charlie Brown', created_at: new Date(Date.now() - 120000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-4', name: 'Diana Prince', created_at: new Date(Date.now() - 180000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-5', name: 'Eve Wilson', created_at: new Date(Date.now() - 240000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-6', name: 'Frank Miller', created_at: new Date(Date.now() - 300000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-7', name: 'Grace Lee', created_at: new Date(Date.now() - 360000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-8', name: 'Henry Clark', created_at: new Date(Date.now() - 420000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-9', name: 'Ivy Martinez', created_at: new Date(Date.now() - 480000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-10', name: 'Jack Robinson', created_at: new Date(Date.now() - 540000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-11', name: 'Kate Anderson', created_at: new Date(Date.now() - 600000).toISOString(), verified: false, rejected: false, banned: false },
        { id: 'test-12', name: 'Leo Garcia', created_at: new Date(Date.now() - 660000).toISOString(), verified: false, rejected: false, banned: false }
    ]
};

// Test Results Storage
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

/**
 * Log test result
 */
function logTest(name, passed, message = '') {
    const result = { name, passed, message };
    testResults.tests.push(result);
    if (passed) {
        testResults.passed++;
        console.log(`✅ PASS: ${name}${message ? ' - ' + message : ''}`);
    } else {
        testResults.failed++;
        console.error(`❌ FAIL: ${name}${message ? ' - ' + message : ''}`);
    }
    return passed;
}

/**
 * Test 1: Check notification modal CSS (max-height and scroll)
 */
function testNotificationModalCSS() {
    console.log('\n--- Test 1: Notification Modal CSS ---');
    
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) {
        return logTest('Notification modal exists', false, 'Element not found');
    }
    
    const styles = window.getComputedStyle(notificationList);
    const maxHeight = styles.getPropertyValue('max-height');
    const overflowY = styles.getPropertyValue('overflow-y');
    
    logTest('Max-height is set', maxHeight === '400px', `Expected: 400px, Got: ${maxHeight}`);
    logTest('Overflow-y is auto', overflowY === 'auto', `Expected: auto, Got: ${overflowY}`);
}

/**
 * Test 2: Generate test notifications
 */
function generateTestNotifications() {
    console.log('\n--- Test 2: Generate Test Notifications ---');
    
    // Store original users
    const originalUsers = localStorage.getItem('users');
    
    // Set test users
    localStorage.setItem('users', JSON.stringify(TEST_CONFIG.testUsers));
    
    // Generate notifications using the existing function
    if (typeof generateNotifications === 'function') {
        const notifications = generateNotifications(TEST_CONFIG.testUsers);
        logTest('Generate notifications function exists', true);
        logTest('Notifications generated', notifications.length > 0, `Generated ${notifications.length} notifications`);
        
        // Check notification format
        if (notifications.length > 0) {
            const firstNotif = notifications[0];
            logTest('Notification has typeText', !!firstNotif.typeText, `typeText: ${firstNotif.typeText}`);
            logTest('Notification has content', !!firstNotif.content, `content: ${firstNotif.content}`);
            logTest('Notification has timestamp', !!firstNotif.timestamp, `timestamp: ${firstNotif.timestamp}`);
            logTest('TypeText is "New User Access Request"', firstNotif.typeText === 'New User Access Request');
            logTest('Content format is "name signed up!"', firstNotif.content.endsWith('signed up!'));
        }
        
        return { notifications, originalUsers };
    } else {
        logTest('Generate notifications function exists', false, 'Function not found');
        return { notifications: [], originalUsers };
    }
}

/**
 * Test 3: Test notification sorting (newest first)
 */
function testNotificationSorting(notifications) {
    console.log('\n--- Test 3: Notification Sorting ---');
    
    if (!notifications || notifications.length === 0) {
        return logTest('Sorting test', false, 'No notifications to test');
    }
    
    // Check if notifications are sorted by timestamp (newest first)
    let isSorted = true;
    for (let i = 0; i < notifications.length - 1; i++) {
        if (notifications[i].timestamp < notifications[i + 1].timestamp) {
            isSorted = false;
            break;
        }
    }
    
    logTest('Notifications sorted by timestamp (newest first)', isSorted);
    
    // Test with more than 10 notifications
    if (notifications.length >= 10) {
        const limited = notifications.slice(0, TEST_CONFIG.maxNotifications);
        logTest('Limit to 10 notifications works', limited.length === 10, `Limited to ${limited.length} notifications`);
        
        // Verify the limited notifications are the newest
        const allNewerThanExcluded = notifications.slice(10).every(excluded => 
            limited.some(limitedNotif => limitedNotif.timestamp >= excluded.timestamp)
        );
        logTest('Limited notifications are the newest', allNewerThanExcluded);
    }
}

/**
 * Test 4: Test notification modal display
 */
function testNotificationModalDisplay(notifications) {
    console.log('\n--- Test 4: Notification Modal Display ---');
    
    const modal = document.getElementById('notification-modal');
    const notificationList = document.getElementById('notification-list');
    
    if (!modal || !notificationList) {
        return logTest('Modal elements exist', false, 'Elements not found');
    }
    
    // Open modal
    if (typeof toggleNotificationModal === 'function') {
        toggleNotificationModal();
        
        // Check if modal is displayed
        const isDisplayed = modal.style.display === 'block';
        logTest('Modal opens on toggle', isDisplayed);
        
        // Check notification items in modal
        const items = notificationList.querySelectorAll('.notification-item');
        logTest('Notification items rendered in modal', items.length > 0, `Found ${items.length} items`);
        
        // Verify max 10 items
        logTest('Maximum 10 items in modal', items.length <= TEST_CONFIG.maxNotifications, `Found ${items.length} items`);
        
        // Check first item (should be newest)
        if (items.length > 0) {
            const firstItem = items[0];
            const typeText = firstItem.querySelector('.notification-type');
            logTest('First item has type', !!typeText, `Type: ${typeText?.textContent}`);
        }
        
        // Close modal
        toggleNotificationModal();
    } else {
        logTest('Toggle function exists', false, 'Function not found');
    }
}

/**
 * Test 5: Test notifications section (all notifications list)
 */
function testNotificationsSection() {
    console.log('\n--- Test 5: Notifications Section ---');
    
    const allNotificationsList = document.getElementById('all-notifications-list');
    
    if (!allNotificationsList) {
        return logTest('All notifications list exists', false, 'Element not found');
    }
    
    const items = allNotificationsList.querySelectorAll('.notification-item');
    logTest('All notifications list has items', items.length > 0, `Found ${items.length} items`);
    
    // Check pagination
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        logTest('Pagination controls exist', true);
    }
}

/**
 * Test 6: Test notification badge
 */
function testNotificationBadge() {
    console.log('\n--- Test 6: Notification Badge ---');
    
    const badge = document.querySelector('.notification-badge');
    
    if (!badge) {
        return logTest('Notification badge exists', false, 'Element not found');
    }
    
    const count = parseInt(badge.textContent);
    logTest('Badge shows count', !isNaN(count), `Count: ${count}`);
}

/**
 * Run all tests
 */
function runAllNotificationTests() {
    console.log('========================================');
    console.log('NOTIFICATION MODAL TEST SUITE');
    console.log('========================================');
    
    // Reset test results
    testResults.passed = 0;
    testResults.failed = 0;
    testResults.tests = [];
    
    // Run tests
    testNotificationModalCSS();
    
    const { notifications, originalUsers } = generateTestNotifications();
    
    testNotificationSorting(notifications);
    testNotificationDisplay(notifications);
    testNotificationsSection();
    testNotificationBadge();
    
    // Summary
    console.log('\n========================================');
    console.log('TEST SUMMARY');
    console.log('========================================');
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log('========================================');
    
    if (testResults.failed === 0) {
        console.log('🎉 All tests passed!');
    } else {
        console.log('⚠️ Some tests failed. Please review the results above.');
    }
    
    return testResults;
}

/**
 * Quick test - add sample notifications to localStorage and refresh
 */
function quickTestSetup() {
    console.log('\n--- Quick Test Setup ---');
    
    // Create sample test users with different timestamps
    const testUsers = [];
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Leo'];
    
    names.forEach((name, index) => {
        testUsers.push({
            id: `test-${index + 1}`,
            name: name,
            created_at: new Date(Date.now() - (index * 60000)).toISOString(), // Each 1 minute apart
            verified: false,
            rejected: false,
            banned: false
        });
    });
    
    // Save to localStorage
    localStorage.setItem('users', JSON.stringify(testUsers));
    localStorage.setItem('readNotifications', '[]');
    localStorage.setItem('deletedNotifications', '[]');
    
    console.log(`✅ Created ${testUsers.length} test users`);
    console.log('Now refresh the admin page to see the test notifications');
    
    return testUsers;
}

// Export functions for console use
window.notificationTests = {
    runAll: runAllNotificationTests,
    setup: quickTestSetup,
    config: TEST_CONFIG
};

// Auto-run tests if this script is loaded
if (document.readyState === 'complete') {
    console.log('Notification Test Script loaded. Run tests with: notificationTests.runAll()');
} else {
    window.addEventListener('load', () => {
        console.log('Notification Test Script loaded. Run tests with: notificationTests.runAll()');
    });
}
