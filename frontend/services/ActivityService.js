/**
 * Activity Service 
 * Handles activity logging and retrieval actions for admin
 * Updated for Vercel/Supabase backend
 */

const ActivityService = {
    /**
     * Get the auth token from localStorage
     */
    getToken() {
        return localStorage.getItem('sti_auth_token');
    },

    /**
     * Log an admin activity
     * @param {Object} activityData - Activity data to log
     * @returns {Promise} - Promise resolving to the log entry
     */
    async logActivity(activityData) {
        try {
            const token = this.getToken();
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch('/api/activity/log', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(activityData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✓ Activity logged:', activityData.action);
                // Trigger a notification broadcast
                this.broadcastNotification(activityData);
            }
            
            return data;
        } catch (error) {
            console.error('Error logging activity:', error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Log a user approval action
     */
    async logUserApproval(adminData, userData) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: 'user_approved',
            targetUserId: userData.user_id || userData.id,
            targetUserName: userData.name,
            details: {
                previousStatus: 'pending',
                newStatus: 'verified'
            }
        });
    },
    
    /**
     * Log a user rejection action
     */
    async logUserRejection(adminData, userData) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: 'user_rejected',
            targetUserId: userData.user_id || userData.id,
            targetUserName: userData.name,
            details: {
                previousStatus: 'pending',
                newStatus: 'rejected'
            }
        });
    },
    
    /**
     * Log a user ban action
     */
    async logUserBan(adminData, userData) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: 'user_banned',
            targetUserId: userData.user_id || userData.id,
            targetUserName: userData.name,
            details: {
                previousStatus: userData.verified ? 'verified' : 'pending',
                newStatus: 'banned'
            }
        });
    },
    
    /**
     * Log a user update action
     */
    async logUserUpdate(adminData, userData, changes) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: 'user_updated',
            targetUserId: userData.user_id || userData.id,
            targetUserName: userData.name,
            details: changes
        });
    },
    
    /**
     * Log a new admin creation action
     */
    async logAdminCreation(adminData, newAdminData) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: 'admin_created',
            targetUserId: newAdminData.user_id || newAdminData.id,
            targetUserName: newAdminData.name,
            details: {
                newAdminRole: newAdminData.role
            }
        });
    },
    
    /**
     * Log an article creation/update/deletion action
     */
    async logArticleAction(adminData, action, articleData) {
        return this.logActivity({
            adminId: adminData.id || adminData.user_id,
            adminName: adminData.name,
            adminRole: adminData.role || 'admin',
            action: `article_${action}`,
            targetUserId: articleData.id,
            targetUserName: articleData.title || 'Untitled',
            details: {
                articleId: articleData.id
            }
        });
    },
    
    /**
     * Get activity logs with optional filters
     * @param {Object} filters - Filters for querying logs
     * @returns {Promise} - Promise resolving to the logs
     */
    async getActivityLogs(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            
            if (filters.adminRole) queryParams.append('adminRole', filters.adminRole);
            if (filters.action) queryParams.append('action', filters.action);
            if (filters.adminId) queryParams.append('adminId', filters.adminId);
            if (filters.targetUserId) queryParams.append('targetUserId', filters.targetUserId);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.limit) queryParams.append('limit', filters.limit);
            
            const token = this.getToken();
            const headers = {};
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`/api/activity/logs?${queryParams}`, { headers });
            const data = await response.json();
            
            return data;
        } catch (error) {
            console.error('Error fetching activity logs:', error);
            return { success: false, logs: [], total: 0, error: error.message };
        }
    },
    
    /**
     * Get activity log count
     * @returns {Promise} - Promise resolving to the count
     */
    async getActivityLogCount() {
        try {
            const token = this.getToken();
            const headers = {};
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch('/api/activity/count', { headers });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching activity log count:', error);
            return { success: false, count: 0, error: error.message };
        }
    },
    
    /**
     * Broadcast notification to other admins (localStorage event)
     * This is a simple cross-tab communication mechanism
     */
    broadcastNotification(activityData) {
        // Store the notification in localStorage for other tabs to read
        const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        const notification = {
            id: 'notif_' + Date.now(),
            timestamp: new Date().toISOString(),
            type: activityData.action,
            message: this.formatNotificationMessage(activityData),
            adminName: activityData.adminName,
            adminRole: activityData.adminRole,
            read: false
        };
        
        notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.splice(50);
        }
        
        localStorage.setItem('adminNotifications', JSON.stringify(notifications));
        
        // Dispatch a custom event for the current tab
        window.dispatchEvent(new CustomEvent('adminActivity', {
            detail: notification
        }));
    },
    
    /**
     * Format notification message based on activity
     */
    formatNotificationMessage(activityData) {
        const roleLabels = {
            admin: 'Admin',
            coadmin: 'Co-Admin',
            subadmin: 'Sub-Admin'
        };
        
        const adminLabel = roleLabels[activityData.adminRole] || 'Admin';
        
        switch (activityData.action) {
            case 'user_approved':
                return `${adminLabel} ${activityData.adminName} approved user ${activityData.targetUserName}`;
            case 'user_rejected':
                return `${adminLabel} ${activityData.adminName} rejected user ${activityData.targetUserName}`;
            case 'user_banned':
                return `${adminLabel} ${activityData.adminName} banned user ${activityData.targetUserName}`;
            case 'user_updated':
                return `${adminLabel} ${activityData.adminName} updated user ${activityData.targetUserName}`;
            case 'admin_created':
                return `${adminLabel} ${activityData.adminName} created new admin ${activityData.targetUserName}`;
            case 'article_created':
                return `${adminLabel} ${activityData.adminName} created article "${activityData.targetUserName}"`;
            case 'article_updated':
                return `${adminLabel} ${activityData.adminName} updated article "${activityData.targetUserName}"`;
            case 'article_deleted':
                return `${adminLabel} ${activityData.adminName} deleted article "${activityData.targetUserName}"`;
            default:
                return `${adminLabel} ${activityData.adminName} performed action: ${activityData.action}`;
        }
    },
    
    /**
     * Get unread notifications
     */
    getUnreadNotifications() {
        const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        return notifications.filter(n => !n.read);
    },
    
    /**
     * Mark notifications as read
     */
    markNotificationsAsRead() {
        const notifications = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        notifications.forEach(n => n.read = true);
        localStorage.setItem('adminNotifications', JSON.stringify(notifications));
    },
    
    /**
     * Clear all notifications
     */
    clearNotifications() {
        localStorage.setItem('adminNotifications', '[]');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityService;
}
