// Debug flag for console logs
        const DEBUG = false;

        // Initialize Supabase client
        const SUPABASE_URL = "https://eopbqatvianrjkdbypvk.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcGJxYXR2aWFucmprZGJ5cHZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzA4OTIsImV4cCI6MjA4OTEwNjg5Mn0.k9_xTbjwRdwAQJ9UgGGsosjLWywzxHuYOq-JbGeII8g";
        // Supabase script creates global supabase object, just initialize it
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Utility functions needed early
        function extractLastname(fullname) {
            const names = fullname.trim().split(/\\s+/);
            if (names.length < 2) {
                return names[0].toLowerCase();
            }
            return names[names.length - 1].toLowerCase();
        }

        function generatePassword(length = 12) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
            let password = "";
            for (let i = 0; i < length; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        }

        function updateUserStatus(userId, action, reason = "") {
            // Handle case where userId might be undefined
            if (typeof userId === "undefined" || userId === null || userId === "") {
                // fallback to selected checkbox id if any
                const selectedCheckbox = document.querySelector("#users .user-checkbox:checked");
                if (selectedCheckbox) {
                    userId = selectedCheckbox.getAttribute("data-user-id") || "";
                }
            }

            userId = userId !== null && userId !== undefined ? String(userId).trim() : "";
            if (!userId) {
                console.error("updateUserStatus called without valid userId", { userId, action });
                alert("Error: User ID is missing or invalid. Please refresh the page and try again.");
                return;
            }
            if (DEBUG) console.log("Updating user status for userId:", userId, "action:", action);
            
            // Get user email first
            let users = JSON.parse(localStorage.getItem("users")) || [];
            const user = users.find(u => String(u.id) === String(userId) || String(u.user_id) === String(userId));
            const userEmail = user ? user.email : "";
            
            // Update localStorage first for immediate feedback
            const userIndex = users.findIndex(u => String(u.id) === String(userId) || String(u.user_id) === String(userId));
            if (userIndex !== -1) {
                if (action === "accept") {
                    users[userIndex].verified = true;
                    users[userIndex].verified_at = new Date().toISOString();
                    users[userIndex].rejected = false;
                    users[userIndex].banned = false;
                    users[userIndex].status = "verified";
                    // Generate credentials if not already generated
                    if (!users[userIndex].email) {
                        users[userIndex].email = extractLastname(users[userIndex].name).toLowerCase() + "@clmb.sti.archives";
                    }
                    if (!users[userIndex].password) {
                        users[userIndex].password = generatePassword();
                    }
                } else if (action === "reject") {
                    users[userIndex].rejected = true;
                    users[userIndex].verified = false;
                    users[userIndex].banned = false;
                    users[userIndex].status = "rejected";
                    // Send rejection email
                    fetch("/api/auth/reject-user/" + encodeURIComponent(userEmail), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reason: reason })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (DEBUG) console.log("Rejection email sent:", data);
                    })
                    .catch(error => {
                        console.error("Error sending rejection email:", error);
                    });
                } else if (action === "ban") {
                    users[userIndex].banned = true;
                    users[userIndex].verified = false;
                    users[userIndex].rejected = false;
                    users[userIndex].status = "banned";
                }
                localStorage.setItem("users", JSON.stringify(users));
            }
            
            // Call backend API for accept/ban actions to send emails
            if ((action === "accept" || action === "ban") && userEmail) {
                const endpoint = action === "accept" 
                    ? "/api/auth/approve-user/" + encodeURIComponent(userEmail)
                    : "/api/auth/ban-user/" + encodeURIComponent(userEmail);
                
                fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" }
                })
                .then(response => response.json())
                .then(data => {
                    if (DEBUG) console.log("Backend API response:", data);
                })
                .catch(error => {
                    console.error("Error calling backend API:", error);
                });
            }
            
            if (DEBUG) console.log("Updated localStorage for user:", userId);
            // Find the row
            let currentRow = null;
            const allTbodys = document.querySelectorAll("#users tbody");
            for (let tbody of allTbodys) {
                const rows = tbody.querySelectorAll("tr");
                for (let row of rows) {
                    const checkbox = row.querySelector(".user-checkbox");
                    if (checkbox && checkbox.getAttribute("data-user-id") == userId) {
                        currentRow = row;
                        break;
                    }
                }
                if (currentRow) break;
            }
            if (currentRow) {
                if (DEBUG) console.log("Found currentRow");
                // Clone the row
                const clonedRow = currentRow.cloneNode(true);
                if (DEBUG) console.log("Cloned row");
                // Update the actions in clonedRow
                const actionsTd = clonedRow.querySelector("td:last-child");
                let newActions = "";
                if (action === "accept") {
                    newActions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button><button class="btn btn-warning btn-sm" onclick="updateUserStatus('${userId}', 'reject')">Reject</button><button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button><button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${user.name}')">Remove</button></div>`;
                } else if (action === "reject") {
                    newActions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button><button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button><button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button><button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${user.name}')">Remove</button></div>`;
                } else if (action === "ban") {
                    newActions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button><button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button><button class="btn btn-warning btn-sm" onclick="updateUserStatus('${userId}', 'reject')">Reject</button><button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${user.name}')">Remove</button></div>`;
                }
                actionsTd.innerHTML = newActions;
                if (DEBUG) console.log("Updated actions");
                // Update the date in clonedRow
                const dateTd = clonedRow.cells[7];
                dateTd.textContent = formatDate(new Date().toISOString());
                // Remove extra columns for target table
                if (action === "reject") {
                    clonedRow.removeChild(clonedRow.cells[8]); // status
                    clonedRow.removeChild(clonedRow.cells[4]); // email
                } else if (action === "ban") {
                    clonedRow.removeChild(clonedRow.cells[8]); // status
                    clonedRow.removeChild(clonedRow.cells[4]); // email
                    clonedRow.removeChild(clonedRow.cells[0]); // checkbox
                }
                // Determine target tbody
                let targetTbodyId = "";
                if (action === "accept") {
                    targetTbodyId = "verified-users-tbody";
                } else if (action === "reject") {
                    // Just remove the row, don't move to rejected table
                    currentRow.remove();
                    if (DEBUG) console.log("Removed rejected user from current table");
                    return;
                } else if (action === "ban") {
                    targetTbodyId = "banned-users-tbody";
                }
                // Append to target tbody
                const targetTbody = document.getElementById(targetTbodyId);
                if (targetTbody) {
                    targetTbody.appendChild(clonedRow);
                    if (DEBUG) console.log("Appended to target tbody:", targetTbodyId);
                }
                // Remove from current
                currentRow.remove();
                if (DEBUG) console.log("Removed from current");
            }
            // Try to update server
            if (DEBUG) console.log("updateUserStatus - userId:", userId, "action:", action);
            fetch("/api/users/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, action: action })
            })
            .then(response => {
                if (DEBUG) console.log("Response status:", response.status);
                return response.json();
            })
            .then(result => {
                if (DEBUG) console.log("Server result:", result);
                if (result.message) {
                    if (DEBUG) console.log("Server updated successfully");
                } else {
                    console.error("Failed to update server:", result.error || "Unknown error");
                }
            })
            .catch(error => {
                console.error("Error updating server:", error);
            });
            // Always reload users
            loadUsers().then(function() {
                if (DEBUG) console.log("Users reloaded");
                if (action === "accept" && user) {
                    var email = user.personal_email || user.email;
                    var subject = "Account Verified";
                    var message = "Dear " + user.name + ",\\n\\n" +
                        "Your account has been verified by the admin.\\n\\n" +
                        "You can now log in using your registered email:\\n\\n" +
                        "Email: " + email + "\\n\\n" +
                        "If you did not set a password yet, please use the verification code sent to your email to create one.\\n\\n" +
                        "Best regards,\\n" +
                        "STI Archives Admin";
    
                    fetch("/api/auth/send-update-email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ to_email: email, subject: subject, message: message })
                    }).then(function(response) {
                        return response.json();
                    }).then(function(result) {
                        if (result.message) {
                            if (DEBUG) console.log("Verification email sent successfully");
                        } else {
                            console.error("Failed to send verification email:", result.error);
                        }
                    }).catch(function(error) {
                        console.error("Error sending verification email:", error);
                    });
                }
            }).catch(function() {
                if (DEBUG) console.log("Load users failed, reloading page");
                // Fallback if async fails
                location.reload();
            });
        }

        function previewUserDocs(userId) {
            // Find the user by ID
            const users = JSON.parse(localStorage.getItem("users")) || [];
            const user = users.find(u => (u.user_id || u.id) === userId);
            if (!user) {
                alert("User not found.");
                return;
            }

            // Check if modal exists, create if not
            let modal = document.getElementById("user-docs-preview-modal");
            if (!modal) {
                modal = document.createElement("div");
                modal.id = "user-docs-preview-modal";
                modal.className = "modal";
                modal.style.display = "flex";
                modal.style.justifyContent = "center";
                modal.style.alignItems = "center";
                modal.innerHTML = `
                    <div class="modal-content" style="margin: 0; max-width: 800px; max-height: 80vh; overflow-y: auto;">
                        <span class="close-modal" onclick="closeUserDocsModal()">&times;</span>
                        <h3>User Documents Preview</h3>
                        <div id="user-docs-preview-content" style="margin-top: 15px;"></div>
                    </div>
                `;
                document.body.appendChild(modal);
            }
            modal.style.display = "flex";
            const content = document.getElementById("user-docs-preview-content");
            let html = `<p><strong>User:</strong> ${user.name}</p>`;

            // Display RAF document
            if (user.raf_path) {
                const rafUrl = "https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/uploads/Raf-edu_id/" + user.raf_path;
                const rafExt = user.raf_path.split(".").pop().toLowerCase();
                html += `<h4>RAF Document</h4>`;
                if (["jpg", "jpeg", "png"].includes(rafExt)) {
                    html += `<img src="${rafUrl}" alt="RAF Document" style="max-width: 100%; max-height: 400px;">`;
                } else if (rafExt === "pdf") {
                    html += `<embed src="${rafUrl}" type="application/pdf" width="100%" height="400px">`;
                } else {
                    html += `<a href="${rafUrl}" target="_blank">Download RAF Document</a>`;
                }
            }

            // Display Educator ID document
            if (user.educator_id) {
                const eduUrl = "https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/uploads/Raf-edu_id/" + user.educator_id;
                const eduExt = user.educator_id.split(".").pop().toLowerCase();
                html += `<h4>Educator ID</h4>`;
                if (["jpg", "jpeg", "png"].includes(eduExt)) {
                    html += `<img src="${eduUrl}" alt="Educator ID" style="max-width: 100%; max-height: 400px;">`;
                } else if (eduExt === "pdf") {
                    html += `<embed src="${eduUrl}" type="application/pdf" width="100%" height="400px">`;
                } else {
                    html += `<a href="${eduUrl}" target="_blank">Download Educator ID</a>`;
                }
            }

            content.innerHTML = html;
        }

        function closeUserDocsModal() {
            const modal = document.getElementById("user-docs-preview-modal");
            if (modal) {
                modal.style.display = "none";
            }
        }

        // === GLOBAL FUNCTIONS ===

        // Moved outside DOMContentLoaded to ensure availability on page load
        let currentUser = null;
        let isLoadingUsers = false;
        let users = [];

        function generateNotifications(users) {
            if (!Array.isArray(users)) users = [];
            const removedUsers = JSON.parse(localStorage.getItem('removedUsers')) || [];
            const filteredUsers = users.filter(u => !removedUsers.includes(u.user_id || u.id));
            const signingUpUsers = filteredUsers.filter(u => !u.verified && !u.rejected && !u.banned);
            const verifiedUsers = filteredUsers.filter(u => u.verified);
            const notifications = [];

            // Add notifications for signing up users
            signingUpUsers.forEach(user => {
                const id = `signup-${user.id}`;
                notifications.push({
                    id: id,
                    type: 'new-user',
                    typeText: 'New User Access Request',
                    content: `${getUserName(user)} signed up!`,
                    time: user.created_at ? new Date(user.created_at).toLocaleString() : 'Just now',
                    timestamp: user.created_at ? new Date(user.created_at).getTime() : Date.now(),
                    priority: 1 // Signing up first
                });
            });

            // Add notifications for verified users (recent)
            verifiedUsers.slice(-5).forEach(user => {
                const id = `verified-${user.id}`;
                notifications.push({
                    id: id,
                    type: 'new-user',
                    typeText: 'New User Verified',
                    content: `${getUserName(user)} was verified!`,
                    time: user.verified_at ? new Date(user.verified_at).toLocaleString() : 'Recently',
                    timestamp: user.verified_at ? new Date(user.verified_at).getTime() : Date.now() - 1000,
                    priority: 2 // Verified second
                });
            });

            // Filter out deleted notifications
            const deletedNotifications = JSON.parse(localStorage.getItem('deletedNotifications')) || [];
            let filteredNotifications = notifications.filter(notif => !deletedNotifications.includes(notif.id));

            // Sort by priority (signing up first), then by timestamp (newest first)
            filteredNotifications.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority; // Lower priority first
                }
                return b.timestamp - a.timestamp; // Newest first
            });

            return filteredNotifications;
        }

        // Update dashboard counts
        async function updateDashboardCounts() {
            console.log('updateDashboardCounts called');

            // Get total counts without pagination limits
            try {
                const token = localStorage.getItem('sti_auth_token');
                const response = await fetch('/api/users/count?_=' + Date.now(), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                console.log('API response status:', response.status);

                if (response.ok) {
                    const countData = await response.json();
                    console.log('Count data:', countData);
                    if (countData.success && countData.counts) {
                        const verifiedEl = document.getElementById('verified-users-count');
                        const adminEl = document.getElementById('admin-users-count');
                        const signingUpEl = document.getElementById('signing-up-users-count');

                        if (verifiedEl) verifiedEl.textContent = countData.counts.usersCount || 0;
                        if (adminEl) adminEl.textContent = countData.counts.adminUsers || 0;
                        if (signingUpEl) signingUpEl.textContent = countData.counts.newSignups || 0;
                        console.log('Updated dashboard counts from API');
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch total user counts, falling back to local data:', error);
                // Fallback to local calculation
                if (!Array.isArray(users)) users = [];
                const usersCount = users.filter(u => getUserStatus(u) === 'approved' && !['admin', 'coadmin', 'subadmin'].includes(u.role)).length;
                const adminCount = users.filter(u => u.role === 'admin').length;
                const signingUpCount = users.filter(u => getUserStatus(u) === 'pending').length;

                const verifiedEl = document.getElementById('verified-users-count');
                const adminEl = document.getElementById('admin-users-count');
                const signingUpEl = document.getElementById('signing-up-users-count');

                if (verifiedEl) verifiedEl.textContent = usersCount;
                if (adminEl) adminEl.textContent = adminCount;
                if (signingUpEl) signingUpEl.textContent = signingUpCount;
            }

            // Update article counts (these come from localStorage, no API limit needed)
            const allArticles = JSON.parse(localStorage.getItem('allArticles')) || [];
            const researchCount = allArticles.filter(a => a.category === 'research').length;
            const capstoneCount = allArticles.filter(a => a.category === 'capstone').length;
            const totalUploads = researchCount + capstoneCount;

            const revenueEl = document.getElementById('revenue-count');
            if (revenueEl) revenueEl.textContent = totalUploads;
        }

        async function loadUsers() {
            if (DEBUG) console.log('DEBUG: loadUsers called');
            users = await getUsers(false);
            if (DEBUG) console.log('DEBUG: getUsers returned:', users);
            if (!Array.isArray(users)) users = [];
            if (DEBUG) console.log('DEBUG: loadUsers got users, count:', users.length);

            // Map fields for display - handle all field variations
            users.forEach(user => {
                // Handle grade field variations
                user.grade = user.grade || user.Grade || user.year_level || '-';

                // Sec_Degr contains:
                // - For SHS: strand values (ABM, ITMAWD, STEM)
                // - For College: degree values (BSBA, BSCS, BSIT)
                user.Sec_Degr = user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course || '-';
            });

            // Set global users
            window.users = users;

            // Clear all tbodys
            document.querySelectorAll('#users tbody').forEach(tbody => tbody.innerHTML = '');

            // Process users
            users.forEach(user => {
                if (DEBUG) console.log('DEBUG: Processing user:', user.id, user.name, user.role, user.email, user.personal_email, user.verified);
                const date = formatDate(user.verified_at || user.created_at);
                let actions = '';
                const userId = user.user_id || user.id;
                if (user.verified) {
                    actions = `<button class="btn btn-danger btn-sm" onclick="removeUser('${userId}')">Remove</button>`;
                } else if (user.banned_user) {
                    actions = `<button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>`;
                } else {
                    actions = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>
                            <button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button>
                        </div>
                    `;
                }
                let emailToUse = user.personal_email || user.email;
                const rafEduIdCell = (user.raf_path || user.educator_id) ? `<button class="view-pdf-btn" onclick="previewUserDocs('${userId}')">Preview</button>` : `${user.raf_path || ''} ${user.educator_id || ''}`.trim() || '-';
                const rowWithEmail = `<tr>
                    <td><input type="checkbox" class="user-checkbox" data-user-id="${userId}"></td>
                    <td>${getUserName(user)}</td>
                    <td>${emailToUse}</td>
                    <td>${formatRole(user.role)}</td>
                    <td>${user.grade || user.Grade || user.year_level || '-'}</td>
                    <td>${user.Sec_Degr || '-'}</td>
                    <td>${date}</td>
                    <td>${rafEduIdCell}</td>
                    <td>${actions}</td>
                </tr>`;
                const rowWithoutActions = `<tr>
                    <td><input type="checkbox" class="user-checkbox" data-user-id="${userId}"></td>
                    <td>${getUserName(user)}</td>
                    <td>${emailToUse}</td>
                    <td>${formatRole(user.role)}</td>
                    <td>${user.grade || user.Grade || user.year_level || '-'}</td>
                    <td>${user.Sec_Degr || '-'}</td>
                    <td>${date}</td>
                    <td>${rafEduIdCell}</td>
                </tr>`;

                // Check admin role first (case-insensitive)
                const roleLower = (user.role || '').toLowerCase();
                if (DEBUG) console.log('DEBUG: User role check:', user.fullname, 'role:', user.role, 'roleLower:', roleLower);
                const isAdminRole = roleLower === 'admin' || roleLower === 'coadmin' || roleLower === 'subadmin';
                // For coadmin, only show coadmin and subadmin, not full admin
                const currentUserRole = 'coadmin'; // Hardcoded for coadmin page
                const shouldShowAdmin = currentUserRole === 'admin' || (currentUserRole === 'coadmin' && (roleLower === 'coadmin' || roleLower === 'subadmin'));
                if (isAdminRole) {
                    if (shouldShowAdmin) {
                    if (DEBUG) console.log('DEBUG: Adding admin user to table:', user.fullname, user.email, 'role:', roleLower);
                    // Determine role display
                    let roleDisplay;
                    if (user.fullname === 'admin2' || user.fullname === 'Admin2') {
                        roleDisplay = 'Co-Admin';
                    } else if (user.fullname === 'admin3' || user.fullname === 'Admin3') {
                        roleDisplay = 'Sub-Admin';
                    } else {
                        roleDisplay = (roleLower === 'coadmin' ? 'Co-Admin' : roleLower === 'subadmin' ? 'Sub-Admin' : 'Admin');
                    }
                    let badgeClass = roleLower === 'coadmin' ? 'badge-coadmin' : roleLower === 'subadmin' ? 'badge-subadmin' : 'badge-admin';
                    let permissions = user.permissions || (roleLower === 'admin' ? 'Full Access - All Features' : roleLower === 'coadmin' ? 'Limited Access - User & File Management' : 'User Approver - Accept/Reject Registrations');
                    const currentUserRole = 'coadmin';
                        const adminRow = `<tr>
                            <td>${userId}</td>
                            <td>${getUserName(user)}</td>
                            <td>${user.email || 'N/A'}</td>
                            <td><span class="badge ${badgeClass}">${roleDisplay}</span></td>
                            <td>${permissions}</td>
                            <td>${formatDate(user.created_at)}</td>
                        </tr>`;
                        document.getElementById('admins-tbody').innerHTML += adminRow;
                    }
                } else {
                    // Status categorization for regular users
                    const userStatus = getUserStatus(user);
                    if (userStatus === 'approved') {
                        if (DEBUG) console.log('DEBUG: Adding verified user to table:', user.name, user.email);
                        document.getElementById('verified-users-tbody').innerHTML += rowWithEmail;
                    } else if (userStatus === 'banned' || userStatus === 'rejected') {
                        document.getElementById('banned-users-tbody').innerHTML += rowWithEmail;
                    } else if (userStatus === 'pending') {
                        if (DEBUG) console.log('DEBUG: Adding signing-up user to table:', user.name, user.email);
                        document.getElementById('signing-up-users-tbody').innerHTML += rowWithEmail;
                    }
                }
            });

            // Update counts
            updateDashboardCounts();

            // Apply pagination
            paginateTable('verified-users-tbody', 10);
            paginateTable('signing-up-users-tbody', 10);
            paginateTable('banned-users-tbody', 10);

            return users;
        }
        async function getUsers(forceRefresh = false, page = 1, limit = 50) {
            if (forceRefresh) {
                // Clear localStorage and force reload from server
                localStorage.removeItem('users');
                isLoadingUsers = false;
                if (DEBUG) console.log('DEBUG: Force refresh - cleared localStorage and reset isLoadingUsers');
            }
            if (isLoadingUsers && !forceRefresh) return JSON.parse(localStorage.getItem('users') || '[]');
            isLoadingUsers = true;
            if (DEBUG) console.log('DEBUG: Attempting to fetch users from server...');
            try {
                // Get auth token from localStorage (optional for admin)
                const token = localStorage.getItem('sti_auth_token');
                if (DEBUG) console.log('DEBUG: Auth token:', token ? 'present' : 'missing');

                const offset = (page - 1) * limit;
                // Add cache-busting query parameter
                const response = await fetch(`/api/users?limit=${limit}&offset=${offset}&_=${Date.now()}`, {
                    headers: token ? {
                        'Authorization': `Bearer ${token}`
                    } : {}
                });
                if (DEBUG) console.log('DEBUG: Fetch response status:', response.status);
                if (response.ok) {
                    if (DEBUG) console.log('DEBUG: Server responded successfully, parsing JSON...');
                    const usersData = await response.json();
                    if (DEBUG) console.log('DEBUG: Raw API response:', usersData);
                    // Handle {success: true, users: []} format from API
                    const users = usersData.success ? usersData.users : usersData;
                    if (DEBUG) console.log('DEBUG: Extracted users array:', users);
                    // Handle both array and {users: []} response formats
                    const userData = Array.isArray(users) ? users : (users.users || []);
                    if (DEBUG) console.log('DEBUG: Final userData array, count:', userData.length);
                    if (DEBUG) console.log('DEBUG: First user sample:', userData[0]);
                    // Add backward compatibility: map fullname to name
                    userData.forEach(user => {
                        if (user.fullname && !user.name) {
                            user.name = user.fullname;
                        }
                    });
                    // Store pagination info
                    if (usersData.total !== undefined) {
                        userData._total = usersData.total;
                        userData._limit = usersData.limit || limit;
                        userData._offset = usersData.offset || offset;
                    }
                    // Save to localStorage for offline use
                    localStorage.setItem('users', JSON.stringify(userData));
                    isLoadingUsers = false;
                    return userData;
                } else {
                    if (DEBUG) console.log('DEBUG: Server returned error:', response.status, 'falling back to localStorage');
                }
            } catch (e) {
                if (DEBUG) console.log('DEBUG: Could not load from server, error:', e.message, 'using localStorage');
            }
            let localUsers = JSON.parse(localStorage.getItem('users') || '[]');
            localStorage.setItem('users', JSON.stringify(localUsers)); // Save users
            if (DEBUG) console.log('DEBUG: Loaded users from localStorage, count:', localUsers.length);
            isLoadingUsers = false;
            return localUsers;
        }
        // Add this helper function


        async function refreshUsers() {
            if (DEBUG) console.log('DEBUG: Auto refreshing users from server...');
            try {
                await getUsers(true);
                await loadUsers();
            } catch (error) {
                console.error('Error auto-refreshing users:', error);
            }
        }
        function saveUsers(users) {
            localStorage.setItem('users', JSON.stringify(users));
        }
        function getArticles() {
            return JSON.parse(localStorage.getItem('articles')) || [];
        }
        function saveArticles(articles) {
            localStorage.setItem('articles', JSON.stringify(articles));
        }
        function getAdminArticles() {
            return JSON.parse(localStorage.getItem('adminArticles')) || [];
        }
        function saveAdminArticles(articles) {
            localStorage.setItem('adminArticles', JSON.stringify(articles));
        }
        function loadArticlesFromServer() {
            return fetch('/api/articles?limit=10&offset=0')
                .then(response => {
                    if (!response.ok) throw new Error('Server error');
                    return response.json();
                })
                .then(data => {
                    // Handle both 'success' (new) and 'status' (old) response formats
                    const isSuccess = data.status === 'success' || data.success === true;
                    if (isSuccess) {
                        const articles = data.articles || [];
                        saveArticles(articles);
                        saveAdminArticles(articles);
                        localStorage.setItem('allArticles', JSON.stringify(articles));
                        renderAdminArticles();
                        updateDashboardCounts();
                    } else {
                        console.error('✗ Failed to load articles:', data.error || 'Unknown error');
                    }
                })
                .catch(error => {
                    if (DEBUG) console.log('✗ Error fetching articles (server may be down):', error.message);
                });
        }

        // Load user uploads for admin
        function loadUserUploadsForAdmin() {
            return fetch('/api/admin/user-uploads?limit=10&offset=0')
                .then(response => {
                    if (!response.ok) throw new Error('Server error');
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        window.userUploadsData = data.uploads;
                        renderUserUploads(data.uploads);
                    } else {
                        console.error('✗ Failed to load user uploads:', data.error);
                    }
                })
                .catch(error => {
                    console.error('✗ Error fetching user uploads:', error);
                });
        }

        // Render user uploads in admin
        function renderUserUploads(uploads) {
            const container = document.getElementById('user-uploaded-articles');

            if (!uploads || uploads.length === 0) {
                container.innerHTML = '<p class="empty-state">No articles uploaded by users yet.</p>';
                return;
            }

            container.innerHTML = uploads.map(upload => {
                // Test PDF URL - hardcoded for testing
                const testPdfUrl = 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf';
                const pdfUrl = testPdfUrl;
                const hasPdf = pdfUrl && pdfUrl.length > 0;

                // Create onclick handler - call the modal PDF viewer function
                const safeTitle = upload.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const cardClick = `displayArticlePDF('${testPdfUrl}', '${safeTitle}')`;

                // Get user initials for profile picture
                const userInitials = (upload.userName || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';

                // Format user metadata based on role
                let userMeta = '';
                const role = upload.userRole || 'unknown';
                const program = upload.userProgram || 'N/A';

                if (role === 'shs') {
                    userMeta = `SHS Student - ${program}`;
                } else if (role === 'college') {
                    userMeta = `College Student - ${program}`;
                } else if (role === 'educator') {
                    userMeta = `Teacher - ${program}`;
                } else {
                    userMeta = `${role.charAt(0).toUpperCase() + role.slice(1)} - ${program}`;
                }

                return `
                <div class="user-uploaded" data-id="${upload.id}">
                    <div class="user-info">
                        <div class="user-pfp">${userInitials}</div>
                        <div class="user-details">
                            <div class="user-fullname">${upload.userName}</div>
                            <div class="user-meta">${userMeta}</div>
                        </div>
                    </div>
                    <div class="uploaded-article" data-id="${upload.id}" ${hasPdf ? "onclick=\"handleUserUploadClick('" + upload.id + "')\" style=\"cursor: pointer;\"" : ''}>
                        <h3>${upload.title}${hasPdf ? ' <i class="fas fa-file-pdf" style="color: #dc3545; margin-left: 5px;"></i>' : ''}</h3>
                        <div class="summary">${upload.abstract || 'N/A'}</div>
                        <div class="meta">
                            <strong>Category:</strong> ${upload.category}<br>
                            <strong>Topic:</strong> ${upload.topic ? upload.topic.charAt(0).toUpperCase() + upload.topic.slice(1) : 'Not set'}<br>
                            <strong>Type:</strong> ${upload.type ? upload.type.charAt(0).toUpperCase() + upload.type.slice(1) : 'Not set'}<br>
                            <strong>Level:</strong> ${upload.level}<br>
                            <strong>Year:</strong> ${upload.year}
                        </div>
                        <div class="edit-fields" style="display: none;">
                            <div style="margin-bottom: 10px;">
                                <label><strong>Title:</strong></label>
                                <input type="text" class="edit-title" value="${upload.title.replace(/"/g, '&quot;')}" style="width: 100%;">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Author:</strong></label>
                                <input type="text" class="edit-author" value="${upload.author || ''}" style="width: 100%;">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Abstract/Summary:</strong></label>
                                <textarea class="edit-abstract" style="width: 100%; min-height: 80px;">${upload.abstract || ''}</textarea>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Category:</strong></label>
                                <select class="edit-category" style="width: 100%;">
                                    <option value="research" ${upload.category === 'research' ? 'selected' : ''}>Research</option>
                                    <option value="capstone" ${upload.category === 'capstone' ? 'selected' : ''}>Capstone</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Topic:</strong></label>
                                <select class="edit-topic" style="width: 100%;">
                                    <option value="">Select Topic</option>
                                    <option value="agriculture" ${upload.topic === 'agriculture' ? 'selected' : ''}>Agriculture</option>
                                    <option value="business" ${upload.topic === 'business' ? 'selected' : ''}>Business</option>
                                    <option value="cosmetics" ${upload.topic === 'cosmetics' ? 'selected' : ''}>Cosmetics</option>
                                    <option value="education" ${upload.topic === 'education' ? 'selected' : ''}>Education</option>
                                    <option value="environment" ${upload.topic === 'environment' ? 'selected' : ''}>Environment</option>
                                    <option value="food" ${upload.topic === 'food' ? 'selected' : ''}>Food</option>
                                    <option value="technology" ${upload.topic === 'technology' ? 'selected' : ''}>Technology</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Type:</strong></label>
                                <select class="edit-type" style="width: 100%;">
                                    <option value="qualitative" ${upload.type === 'qualitative' ? 'selected' : ''}>Qualitative</option>
                                    <option value="quantitative" ${upload.type === 'quantitative' ? 'selected' : ''}>Quantitative</option>
                                    <option value="bsba" ${upload.type === 'bsba' ? 'selected' : ''}>BSBA</option>
                                    <option value="bscs" ${upload.type === 'bscs' ? 'selected' : ''}>BSCS</option>
                                    <option value="bsit" ${upload.type === 'bsit' ? 'selected' : ''}>BSIT</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Level:</strong></label>
                                <select class="edit-level" style="width: 100%;">
                                    <option value="shs" ${upload.level === 'shs' ? 'selected' : ''}>Senior High School</option>
                                    <option value="college" ${upload.level === 'college' ? 'selected' : ''}>College</option>
                                </select>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label><strong>Year:</strong></label>
                                <input type="number" class="edit-year" value="${upload.year}" min="2020" max="2030" style="width: 100%;">
                            </div>
                        </div>
                        <div class="source-tag">
                            <strong>File:</strong> ${upload.filename}<br>
                            <strong>Status:</strong> <span style="color: ${upload.status === 'approved' ? 'green' : upload.status === 'rejected' ? 'red' : 'orange'};">${upload.status}</span><br>
                            <strong>Uploaded:</strong> ${new Date(upload.uploadedAt).toLocaleString()}
                        </div>
                        <div class="actions">
                            ${upload.status === 'pending' ? `
                                <button class="upload-btn" onclick="approveUserUpload('${upload.id}')">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="delete-btn" onclick="rejectUserUpload('${upload.id}')">
                                    <i class="fas fa-times"></i> Reject
                            ` : ''}
                            <button class="edit-btn" onclick="toggleUserUploadEdit('${upload.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('');
        }

        // View PDF for user upload
        function viewUserUploadPDF(pdfUrl, title) {
            // Decode URL-encoded parameters
            pdfUrl = decodeURIComponent(pdfUrl);
            title = decodeURIComponent(title);

            if (DEBUG) console.log('Opening PDF:', pdfUrl, 'Title:', title);

            if (typeof displayArticlePDF === 'function') {
                displayArticlePDF(pdfUrl, title);
            } else if (typeof openPdfModal === 'function') {
                openPdfModal(pdfUrl, title);
            } else {
                // Fallback: open in new window
                window.open(pdfUrl, '_blank');
            }
        }

        // Edit user upload topic and type
        function editUserUploadTopic(id) {
            const uploads = window.userUploadsData || [];
            const upload = uploads.find(u => u.id === id);
            if (!upload) return;

            const topic = prompt('Enter topic for this article:', upload.topic || '');
            if (topic !== null) {
                const type = prompt('Enter type (qualitative/quantitative):', upload.type || '');
                fetch(`/api/admin/user-upload/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topic: topic, type: type })
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        alert('Topic and Type updated successfully!');
                        loadUserUploadsForAdmin();
                    } else {
                        alert('Failed to update: ' + result.error);
                    }
                })
                .catch(error => {
                    console.error('Error updating:', error);
                    alert('Failed to update');
                });
            }
        }

        // Handle click on user uploaded article
        function handleUserUploadClick(id) {
            const uploadedArticle = document.querySelector(`.uploaded-article[data-id="${id}"]`);
            if (uploadedArticle.classList.contains('editing')) {
                return; // Don't open PDF when editing
            }

            const uploads = window.userUploadsData || [];
            const upload = uploads.find(u => u.id === id);
            if (upload && upload.pdfUrl) {
                const testPdfUrl = 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf';
                const safeTitle = upload.title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                displayArticlePDF(testPdfUrl, safeTitle);
            }
        }

        // Toggle edit mode for user uploads
        function toggleUserUploadEdit(id) {
            const userUploadedDiv = document.querySelector(`.user-uploaded[data-id="${id}"]`);
            const uploadedArticle = userUploadedDiv.querySelector('.uploaded-article');
            const editBtn = uploadedArticle.querySelector('.edit-btn');

            // Get PDF info from the uploads data
            const uploads = window.userUploadsData || [];
            const upload = uploads.find(u => u.id === id);
            const hasPdf = upload && upload.pdfUrl && upload.pdfUrl.length > 0;
            const testPdfUrl = 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Research/2023-2024/Cejes%20et%20al.pdf';

            if (uploadedArticle.classList.contains('editing')) {
                // Save changes
                saveUserUploadEdit(id);
                uploadedArticle.classList.remove('editing');
                editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                // Hide edit fields and show meta
                uploadedArticle.querySelector('.edit-fields').style.display = 'none';
                uploadedArticle.querySelector('.meta').style.display = 'block';
                // Restore cursor
                uploadedArticle.style.cursor = hasPdf ? 'pointer' : 'default';
            } else {
                // Enter edit mode
                uploadedArticle.classList.add('editing');
                editBtn.innerHTML = '<i class="fas fa-save"></i> Save';
                // Show edit fields and hide meta
                uploadedArticle.querySelector('.edit-fields').style.display = 'block';
                uploadedArticle.querySelector('.meta').style.display = 'none';
                // Change cursor to default during edit
                uploadedArticle.style.cursor = 'default';
            }
        }

        // Save user upload edits
        function saveUserUploadEdit(id) {
            const upload = uploads.find(u => u.id == id);
            const hasPdf = upload && upload.pdfUrl && upload.pdfUrl.length > 0;
            const pdfName = hasPdf ? upload.pdfUrl.split('/').pop() : '';

            const userUploadedDiv = document.querySelector(`.user-uploaded[data-id="${id}"]`);
            const uploadedArticle = userUploadedDiv.querySelector('.uploaded-article');

            const title = uploadedArticle.querySelector('.edit-title').value;
            const author = uploadedArticle.querySelector('.edit-author').value;
            const abstract = uploadedArticle.querySelector('.edit-abstract').value;
            const category = uploadedArticle.querySelector('.edit-category').value;
            const topic = uploadedArticle.querySelector('.edit-topic').value;
            const type = uploadedArticle.querySelector('.edit-type').value;
            const level = uploadedArticle.querySelector('.edit-level').value;
            const year = uploadedArticle.querySelector('.edit-year').value;

            // Update the display
            uploadedArticle.querySelector('h3').innerHTML = title + (hasPdf ? ' <i class="fas fa-file-pdf" style="color: #dc3545; margin-left: 5px;"></i>' : '');
            uploadedArticle.querySelector('.summary').textContent = abstract || 'N/A';
            uploadedArticle.querySelector('.meta').innerHTML = `
                <strong>Category:</strong> ${category}<br>
                <strong>Topic:</strong> ${topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'Not set'}<br>
                <strong>Type:</strong> ${type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Not set'}<br>
                <strong>Level:</strong> ${level}<br>
                <strong>Year:</strong> ${year}${hasPdf ? '<br><strong>PDF:</strong> ' + pdfName : ''}
            `;

            // Here you would typically send the update to the server
            // For now, just update the display
            alert('Changes saved successfully!');
        }

        // Approve user upload
        async function approveUserUpload(id) {
            try {
                const response = await fetch(`/api/admin/user-upload/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'approved' })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Upload approved successfully!');
                    loadUserUploadsForAdmin();
                } else {
                    alert('Failed to approve: ' + result.error);
                }
            } catch (error) {
                console.error('Error approving upload:', error);
                alert('Failed to approve upload');
            }
        }

        // Reject user upload
        async function rejectUserUpload(id) {
            try {
                const response = await fetch(`/api/admin/user-upload/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'rejected' })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Upload rejected!');
                    loadUserUploadsForAdmin();
                } else {
                    alert('Failed to reject: ' + result.error);
                }
            } catch (error) {
                console.error('Error rejecting upload:', error);
                alert('Failed to reject upload');
            }
        }

        // Delete user upload
        async function deleteUserUpload(id) {
            if (!confirm('Are you sure you want to delete this upload?')) return;

            try {
                const response = await fetch(`/api/admin/user-upload/${id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    alert('Upload deleted successfully!');
                    loadUserUploadsForAdmin();
                } else {
                    alert('Failed to delete: ' + result.error);
                }
            } catch (error) {
                console.error('Error deleting upload:', error);
                alert('Failed to delete upload');
            }
        }
        let currentPage = 1;
        const articlesPerPage = 10;

        function createArticleTemplate(articleData = {}) {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '20px';
            const template = document.createElement('div');
            template.className = `article ${articleData.category === 'capstone' ? 'capstone' : ''}`;
            template.setAttribute('data-category', articleData.category);
            const actionButtons = document.createElement('div');
            actionButtons.style.display = 'flex';
            actionButtons.style.justifyContent = 'flex-start';
            actionButtons.style.gap = '10px';
            actionButtons.style.marginTop = '10px';
            wrapper.appendChild(template);
            wrapper.appendChild(actionButtons);
            function setViewMode() {
                template.classList.remove('editing');
                // Escape special characters for onclick handler
                const safePdfPath = (articleData.pdfPath || articleData.pdf_path || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safeTitle = (articleData.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                if (DEBUG) console.log('Creating View button for article:', articleData.id, 'Title:', safeTitle);
                const hasPdf = articleData.pdfPath || articleData.pdf_path || articleData.pdfId;
                const pdfUrl = hasPdf ? (articleData.pdfPath || articleData.pdf_path ? safePdfPath : '/api/pdf/' + articleData.pdfId) : '';
                template.innerHTML = `
                <h3>${articleData.title}</h3>
                <div class="meta">${articleData.meta}</div>
                ${articleData.topic ? `<div class="meta" style="color: #0057b8;">Topic: ${articleData.topic.charAt(0).toUpperCase() + articleData.topic.slice(1)}</div>` : ''}
                ${(articleData.type || articleData.qualitativeQuantitative) ? `<div class="meta" style="color: #0057b8;">Type: ${(articleData.type || articleData.qualitativeQuantitative).charAt(0).toUpperCase() + (articleData.type || articleData.qualitativeQuantitative).slice(1)}</div>` : ''}
                <div class="summary">${articleData.summary}</div>
                <div class="actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn" onclick="confirmDelete(this)">Delete</button>
                </div>
                `;
                actionButtons.innerHTML = '';
                // Add onclick to article container to show PDF
                if (hasPdf) {
                    template.onclick = (e) => {
                        if (!e.target.classList.contains('edit-btn') && !e.target.classList.contains('delete-btn')) {
                            displayArticlePDF(pdfUrl, articleData.title);
                        }
                    };
                    template.style.cursor = 'pointer';
                }
                // Add event listener for edit button
                const editBtn = template.querySelector('.edit-btn');
                editBtn.addEventListener('click', setEditMode);
            }
            function setEditMode() {
                template.onclick = null;
                template.style.cursor = 'default';
                template.classList.add('editing');
                template.innerHTML = `
                <div>
                <div contenteditable="true" class="article-title" style="border: none; background: transparent; color: #0057b8; font-size: 18px; font-weight: bold; width: 100%; outline: none; white-space: pre-wrap; word-wrap: break-word;">${articleData.title}</div>
                </div>
                <div class="meta">
                <input type="text" class="article-authors" value="${articleData.meta}" placeholder="Authors" style="border: none; background: transparent; color: #555; font-size: 14px; width: auto; outline: none;">
                </div>
                <div class="summary">
                <div contenteditable="true" class="article-summary" style="border: none; background: transparent; color: #333; font-size: 14px; line-height: 1.5; width: 100%; outline: none; white-space: pre-wrap; word-wrap: break-word;">${articleData.summary}</div>
                </div>
                <div class="pdf-management" style="margin: 10px 0; padding: 10px; border: 1px dashed #ccc; border-radius: 4px;">
                <label style="font-weight: bold; color: #0057b8;">PDF Document:</label>
                ${(articleData.pdfPath || articleData.pdf_path || articleData.pdfId) ? `
                <div class="current-pdf" style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                <span style="flex: 1; color: #333; word-break: break-all;">${(articleData.pdfPath || articleData.pdf_path || '').split('/').pop() || 'PDF ID: ' + articleData.pdfId}</span>
                <button type="button" onclick="removeArticlePDF(this, '${articleData.id || articleData.title}')" style="background: #dc3545; color: white; border: none; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 16px;">&times;</button>
                </div>
                ` : '<p style="color: #666; margin: 5px 0;">No PDF uploaded</p>'}
                <div class="pdf-upload" style="margin-top: 10px;">
                <input type="file" id="pdf-upload-${articleData.id || articleData.title}" accept=".pdf" style="display: none;" onchange="handleArticlePDFUpload(this, '${articleData.id || articleData.title}')">
                <button type="button" onclick="document.getElementById('pdf-upload-${articleData.id || articleData.title}').click()" style="background: #0057b8; color: white; border: none; border-radius: 4px; padding: 8px 15px; cursor: pointer;">${(articleData.pdfPath || articleData.pdf_path || articleData.pdfId) ? 'Replace PDF' : 'Upload PDF'}</button>
                </div>
                </div>
                <div class="actions">
                </div>
                <div class="actions-row">
                <label>Category:</label>
                <select class="category-select">
                <option value="research" ${articleData.category === 'research' ? 'selected' : ''}>Research</option>
                <option value="capstone" ${articleData.category === 'capstone' ? 'selected' : ''}>Capstone</option>
                </select>
                <label style="margin-left: 10px;">Topic:</label>
                <select class="topic-select">
                <option value="">Select Topic</option>
                <option value="agriculture" ${articleData.topic === 'agriculture' ? 'selected' : ''}>Agriculture</option>
                <option value="business" ${articleData.topic === 'business' ? 'selected' : ''}>Business</option>
                <option value="cosmetics" ${articleData.topic === 'cosmetics' ? 'selected' : ''}>Cosmetics</option>
                <option value="education" ${articleData.topic === 'education' ? 'selected' : ''}>Education</option>
                <option value="environment" ${articleData.topic === 'environment' ? 'selected' : ''}>Environment</option>
                <option value="food" ${articleData.topic === 'food' ? 'selected' : ''}>Food</option>
                <option value="technology" ${articleData.topic === 'technology' ? 'selected' : ''}>Technology</option>
                </select>
                <label style="margin-left: 10px;">Type:</label>
                <select class="type-select">
                <option value="">Select Type</option>
                <option value="qualitative" ${(articleData.type === 'qualitative' || articleData.qualitativeQuantitative === 'qualitative') ? 'selected' : ''}>Qualitative</option>
                <option value="quantitative" ${(articleData.type === 'quantitative' || articleData.qualitativeQuantitative === 'quantitative') ? 'selected' : ''}>Quantitative</option>
                <option value="bsba" ${(articleData.type === 'bsba' || articleData.qualitativeQuantitative === 'bsba') ? 'selected' : ''}>BSBA</option>
                <option value="bscs" ${(articleData.type === 'bscs' || articleData.qualitativeQuantitative === 'bscs') ? 'selected' : ''}>BSCS</option>
                <option value="bsit" ${(articleData.type === 'bsit' || articleData.qualitativeQuantitative === 'bsit') ? 'selected' : ''}>BSIT</option>
                </select>
                <div class="research-options" style="display: ${articleData.category === 'research' ? 'inline' : 'none'};">
                <label>Grade:</label>
                <select class="grade-select">
                <option value="Grade 11" ${articleData.program === 'Grade 11' ? 'selected' : ''}>Grade 11</option>
                <option value="Grade 12" ${articleData.program === 'Grade 12' ? 'selected' : ''}>Grade 12</option>
                </select>
                <label>Strand:</label>
                <select class="strand-select">
                <option value="ABM" ${articleData.strand === 'ABM' ? 'selected' : ''}>ABM</option>
                <option value="ITMAWD" ${articleData.strand === 'ITMAWD' ? 'selected' : ''}>ITMAWD</option>
                <option value="STEM" ${articleData.strand === 'STEM' ? 'selected' : ''}>STEM</option>
                </select>
                </div>
                <div class="capstone-options" style="display: ${articleData.category === 'capstone' ? 'inline' : 'none'};">
                <label>Program:</label>
                <select class="program-select">
                <option value="BSBA" ${articleData.strand === 'BSBA' ? 'selected' : ''}>BSBA</option>
                <option value="BSCS" ${articleData.strand === 'BSCS' ? 'selected' : ''}>BSCS</option>
                <option value="BSIT" ${articleData.strand === 'BSIT' ? 'selected' : ''}>BSIT</option>
                </select>
                </div>
                </div>
                `;
                // Add event listeners for category
                const categorySelect = template.querySelector('.category-select');
                categorySelect.addEventListener('change', function() {
                    const researchOpts = template.querySelector('.research-options');
                    const capstoneOpts = template.querySelector('.capstone-options');
                    if (this.value === 'research') {
                        researchOpts.style.display = 'inline';
                        capstoneOpts.style.display = 'none';
                        template.classList.remove('capstone');
                    } else {
                        researchOpts.style.display = 'none';
                        capstoneOpts.style.display = 'inline';
                        template.classList.add('capstone');
                    }
                });
                // Create buttons in actionButtons
                actionButtons.innerHTML = '';
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.style.backgroundColor = 'gray';
                editBtn.style.color = 'white';
                editBtn.style.border = 'none';
                editBtn.style.padding = '5px 10px';
                editBtn.style.borderRadius = '4px';
                editBtn.style.cursor = 'pointer';
                editBtn.textContent = 'Edit';
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'cancel-btn';
                cancelBtn.style.backgroundColor = '#6c757d';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = 'none';
                cancelBtn.style.padding = '5px 10px';
                cancelBtn.style.borderRadius = '4px';
                cancelBtn.style.cursor = 'pointer';
                cancelBtn.textContent = 'Cancel';
                cancelBtn.addEventListener('click', setViewMode);
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-btn';
                saveBtn.style.backgroundColor = '#28a745';
                saveBtn.style.color = 'white';
                saveBtn.style.border = 'none';
                saveBtn.style.padding = '5px 10px';
                saveBtn.style.borderRadius = '4px';
                saveBtn.style.cursor = 'pointer';
                saveBtn.textContent = 'Save';
                saveBtn.addEventListener('click', function() {
                    articleData.title = template.querySelector('.article-title').textContent;
                    articleData.authors = template.querySelector('.article-authors').value;
                    articleData.meta = template.querySelector('.article-authors').value;
                    articleData.summary = template.querySelector('.article-summary').textContent;
                    articleData.category = template.querySelector('.category-select').value;
                    articleData.topic = template.querySelector('.topic-select').value;
                    articleData.type = template.querySelector('.type-select').value;
                    articleData.qualitativeQuantitative = template.querySelector('.type-select').value;
                    if (articleData.category === 'research') {
                        articleData.program = template.querySelector('.grade-select').value;
                        articleData.strand = template.querySelector('.strand-select').value;
                    } else {
                        articleData.program = '';
                        articleData.strand = template.querySelector('.program-select').value;
                    }

                    // Update in localStorage
                    const articles = getArticles();
                    const articleIndex = articles.findIndex(a => a.id === articleData.id);
                    if (articleIndex !== -1) {
                        articles[articleIndex] = articleData;
                        saveArticles(articles);
                    }

                    // Update admin articles
                    const adminArticles = getAdminArticles();
                    const adminIndex = adminArticles.findIndex(a => a.id === articleData.id);
                    if (adminIndex !== -1) {
                        adminArticles[adminIndex] = articleData;
                        saveAdminArticles(adminArticles);
                    }

                    // Update in server
                    if (articleData.id) {
                        updateArticleInServer(articleData.id, articleData);
                    }

                    setViewMode();
                    alert('Article updated!');
                });
                actionButtons.appendChild(editBtn);
                actionButtons.appendChild(cancelBtn);
                actionButtons.appendChild(saveBtn);
            }
            setViewMode(); // Start in view mode
            return wrapper;
        }

        function renderAdminArticles(page = 1) {
            // Store current scroll position
            const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

            currentPage = page;
            const adminArticles = getAdminArticles();
            const container = document.getElementById('admin-uploaded-articles');
            const pagination = document.getElementById('admin-pagination');
            const pageNumbers = document.getElementById('admin-page-numbers');

            // Clear existing articles
            container.innerHTML = '';

            if (adminArticles.length === 0) {
                container.innerHTML = '<p class="empty-state">No articles uploaded by admin yet.</p>';
                pagination.style.display = 'none';
                return;
            }

            // Calculate pagination
            const totalPages = Math.ceil(adminArticles.length / articlesPerPage);
            const startIndex = (page - 1) * articlesPerPage;
            const endIndex = startIndex + articlesPerPage;
            const articlesToShow = adminArticles.slice(startIndex, endIndex);

            // Render articles
            articlesToShow.forEach(article => {
                const articleElement = createArticleTemplate(article);
                container.appendChild(articleElement);
            });

            // Render pagination
            pageNumbers.innerHTML = '';
            pageNumbers.style.display = 'flex';
            pageNumbers.style.gap = '5px';
            pageNumbers.style.visibility = 'visible';

            if (DEBUG) console.log('Creating buttons for totalPages:', totalPages);
            for (let i = 1; i <= totalPages; i++) {
                if (DEBUG) console.log('Creating page button:', i);
                try {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = 'page-number' + (i === page ? ' active' : '');
                    pageBtn.textContent = i;
                    // Clean styling
                    pageBtn.style.display = 'inline-flex';
                    pageBtn.style.alignItems = 'center';
                    pageBtn.style.justifyContent = 'center';
                    pageBtn.style.minWidth = '40px';
                    pageBtn.style.height = '36px';
                    pageBtn.style.padding = '0 12px';
                    pageBtn.style.margin = '0 4px';
                    pageBtn.style.visibility = 'visible';
                    pageBtn.style.opacity = '1';
                    // Blue background color
                    pageBtn.style.backgroundColor = i === page ? '#0057b8' : '#e3f2fd';
                    pageBtn.style.color = i === page ? '#ffffff' : '#333333';
                    pageBtn.style.border = '1px solid #0057b8';
                    pageBtn.style.borderRadius = '4px';
                    pageBtn.style.cursor = 'pointer';
                    pageBtn.style.fontSize = '14px';
                    pageBtn.style.fontWeight = '500';
                    pageBtn.style.transition = 'all 0.2s';
                    pageBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        window.scrollTo(0, 0);
                        renderAdminArticles(i);
                    });
                    pageNumbers.appendChild(pageBtn);
                } catch (err) {
                    console.error('Error creating button', i, ':', err);
                }
            }

            pagination.style.display = 'flex';
            pagination.style.justifyContent = 'center';
            pagination.style.padding = '20px 0';
            pagination.style.visibility = 'visible';

            // Restore scroll position after a brief delay to ensure DOM is updated
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPosition,
                    behavior: 'auto'
                });
            }, 0);
        }

        function confirmDelete(buttonElement) {
            const articleElement = buttonElement.closest('.article');
            const title = articleElement.querySelector('h3').textContent;
            showConfirm('Delete Article', `Are you sure you want to delete "${title}"? This action cannot be undone.`, () => {
                // Find and remove the article from adminArticles
                const adminArticles = getAdminArticles();
                const articleIndex = Array.from(articleElement.parentNode.children).indexOf(articleElement);
                const pageStartIndex = (currentPage - 1) * articlesPerPage;
                const globalIndex = pageStartIndex + articleIndex;
                adminArticles.splice(globalIndex, 1);
                saveAdminArticles(adminArticles);
                // Re-render the current page or previous if last article on page
                const newTotalPages = Math.ceil(adminArticles.length / articlesPerPage);
                if (currentPage > newTotalPages && currentPage > 1) {
                    renderAdminArticles(currentPage - 1);
                } else {
                    renderAdminArticles(currentPage);
                }
            });


        }

        function getUserName(user) {
            return user.fullname || user.name || 'Unknown';
        }

        function getUserStatus(user) {
            // Check new boolean columns first
            if (user.new_user === true) return 'pending';
            if (user.banned_user === true) return 'banned';
            if (user.rejected_user === true) return 'rejected';
            if (user.verified === true) return 'approved';

            // Fallback to legacy boolean logic for backward compatibility
            if (user.verified && !user.banned && !user.rejected) return 'approved';
            if (user.banned) return 'banned';
            if (user.rejected) return 'rejected';
            return 'pending';
        }

        function formatRole(role) {
            if (role === 'senior_high') return 'SHS';
            if (role === 'college') return 'College';
            if (role === 'educator') return 'Educator';
            if (role === 'admin') return 'Admin';
            if (role === 'coadmin') return 'CO-Admin';
            if (role === 'subadmin') return 'SUB-Admin';
            if (role === 'tester') return 'Tester';
            return 'Teacher';
        }
        function getSectionDisplay(user) {
            return user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course || '-';
        }
        function getStrandDegree(user) {
            if (user.role === 'senior_high') {
                return user.strand || '-';
            } else if (user.role === 'college') {
                return user.section || '-';
            } else if (user.role === 'educator') {
                return user.section || '-';
            } else {
                return '-';
            }
        }
        function formatDate(dateString) {
            if (!dateString || dateString === 'N/A') return 'N/A';
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            return date.toLocaleDateString('en-US', options);
        }
        function formatNotificationDate(dateString) {
            if (!dateString || dateString === 'N/A' || dateString === 'Just now' || dateString === 'Recently') return dateString;
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; // If not a valid date, return as is
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }
        // Helper function to parse time string to timestamp for sorting
        function parseTimeToTimestamp(timeString) {
            if (!timeString) return Date.now();

            // If it's already a number, assume it's a timestamp
            if (typeof timeString === 'number') return timeString;

            // If it's a date string that can be parsed
            const parsedDate = new Date(timeString);
            if (!isNaN(parsedDate.getTime())) return parsedDate.getTime();

            // Parse relative time strings like "2 hours ago", "30 minutes ago"
            const match = timeString.match(/(\d+)\s*(minute|hour|day|second)s?\s*ago/i);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2].toLowerCase();
                const now = Date.now();
                switch (unit) {
                    case 'second': return now - (value * 1000);
                    case 'minute': return now - (value * 60 * 1000);
                    case 'hour': return now - (value * 60 * 60 * 1000);
                    case 'day': return now - (value * 24 * 60 * 60 * 1000);
                }
            }

            // Default to current time if parsing fails
            return Date.now();
        }
        function updateProfileAvatar(imageUrl) {
            const avatar = document.getElementById('account-profile-avatar');
            avatar.style.backgroundImage = `url(${imageUrl})`;
            avatar.style.backgroundSize = 'cover';
            avatar.style.backgroundPosition = 'center';
            avatar.textContent = '';
            const sidebarAvatar = document.querySelector('.sidebar .admin-info .profile-avatar');
            if (sidebarAvatar) {
                sidebarAvatar.style.backgroundImage = `url(${imageUrl})`;
                sidebarAvatar.style.backgroundSize = 'cover';
                sidebarAvatar.style.backgroundPosition = 'center';
                sidebarAvatar.textContent = '';
            }
        }
        function getStatus(createdAt) {
            if (!createdAt) return 'Pending';
            const now = new Date();
            const created = new Date(createdAt);
            const diffMs = now - created;
            const diffHours = diffMs / (1000 * 60 * 60);
            return diffHours < 1 ? 'Just Now' : 'Pending';
        }
        let dashboardUploadsChartType = 'doughnut';
        function toggleDashboardUploadsChartType() {
            dashboardUploadsChartType = dashboardUploadsChartType === 'pie' ? 'doughnut' : 'pie';
            document.getElementById('toggle-dashboard-uploads-chart').innerText = dashboardUploadsChartType === 'pie' ? 'Doughnut' : 'Pie';
            renderDashboardUploadsChart();
            renderGaugeChart('avg-chart', 'Average Session Duration', 5.0, '#007bff');
        }

        function paginateTable(tbodyId, rowsPerPage) {
            const tbody = document.getElementById(tbodyId);
            if (!tbody) return;

            const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.style.display !== 'none');
            const totalPages = Math.ceil(rows.length / rowsPerPage);
            const paginationDiv = document.getElementById(tbodyId.replace('-tbody', '-pagination'));
            if (!paginationDiv) return;

            let currentPage = parseInt(paginationDiv.dataset.currentPage) || 1;
            if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;
            paginationDiv.dataset.currentPage = currentPage;

            // Show only current page rows among visible
            rows.forEach((row, index) => {
                const page = Math.floor(index / rowsPerPage) + 1;
                row.style.display = page === currentPage ? '' : 'none';
            });

            // Generate pagination buttons (always visible)
            let buttons = '';

            // Previous button
            const prevDisabled = currentPage <= 1 || totalPages <= 1;
            const prevClass = prevDisabled ? 'btn btn-secondary btn-sm disabled' : 'btn btn-secondary btn-sm';
            const prevOnClick = prevDisabled ? '' : `onclick="changePage('${tbodyId}', ${currentPage - 1})"`;
            const prevDisabledAttr = prevDisabled ? ' disabled' : '';
            buttons += `<button class="${prevClass}"${prevDisabledAttr} ${prevOnClick}>Previous</button>`;

            // Page number buttons (always show at least page 1)
            if (totalPages > 0) {
                const maxPagesToShow = Math.min(totalPages, 5); // Show max 5 page numbers
                let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                // Adjust start page if we're near the end
                if (endPage - startPage + 1 < maxPagesToShow) {
                    startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                    const isActive = i === currentPage;
                    const pageDisabled = totalPages <= 1;
                    const pageClass = isActive ?
                        (pageDisabled ? 'btn btn-primary btn-sm active disabled' : 'btn btn-primary btn-sm active') :
                        (pageDisabled ? 'btn btn-outline-secondary btn-sm disabled' : 'btn btn-outline-secondary btn-sm');
                    const pageOnClick = pageDisabled ? '' : `onclick="changePage('${tbodyId}', ${i})"`;
                    const pageDisabledAttr = pageDisabled ? ' disabled' : '';
                    buttons += `<button class="${pageClass}"${pageDisabledAttr} ${pageOnClick}>${i}</button>`;
                }
            } else {
                // No records, show disabled page 1
                buttons += `<button class="btn btn-outline-secondary btn-sm disabled" disabled>1</button>`;
            }

            // Next button
            const nextDisabled = currentPage >= totalPages || totalPages <= 1;
            const nextClass = nextDisabled ? 'btn btn-secondary btn-sm disabled' : 'btn btn-secondary btn-sm';
            const nextOnClick = nextDisabled ? '' : `onclick="changePage('${tbodyId}', ${currentPage + 1})"`;
            const nextDisabledAttr = nextDisabled ? ' disabled' : '';
            buttons += `<button class="${nextClass}"${nextDisabledAttr} ${nextOnClick}>Next</button>`;

            // Add page info
            const startRecord = (currentPage - 1) * rowsPerPage + 1;
            const endRecord = Math.min(currentPage * rowsPerPage, rows.length);
            const infoText = totalPages > 0 ?
                `Showing ${startRecord}-${endRecord} of ${rows.length} records` :
                'No records to display';

            buttons += `<span class="pagination-info" style="margin-left: 15px; font-size: 12px; color: #666;">${infoText}</span>`;

            paginationDiv.innerHTML = buttons;
        }

        function changePage(tbodyId, page) {
            // Prevent clicks on disabled buttons
            const button = event.target;
            if (button.disabled || button.classList.contains('disabled')) {
                return;
            }

            const paginationDiv = document.getElementById(tbodyId.replace('-tbody', '-pagination'));
            paginationDiv.dataset.currentPage = page;
            paginateTable(tbodyId, 10);
        }

        // Navigation setup for coadmin
        function setupNavigation() {
            const sidebarLinks = document.querySelectorAll('.sidebar ul li a[data-section]');
            const contentSections = document.querySelectorAll('.content-section');

            sidebarLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();

                    // Remove active class from all sidebar items
                    document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
                    // Add active class to clicked item
                    this.parentElement.classList.add('active');

                    // Hide all sections
                    contentSections.forEach(section => section.classList.remove('active'));

                    // Show selected section
                    const sectionId = this.getAttribute('data-section');
                    const targetSection = document.getElementById(sectionId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                    }
                });
            });

            // Set up users subsection navigation
            const userNavButtons = document.querySelectorAll('.users-nav .nav-btn');
            const userSubsections = document.querySelectorAll('.user-subsection');

            userNavButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all user nav buttons
                    userNavButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');

                    // Hide all user subsections
                    userSubsections.forEach(section => section.style.display = 'none');

                    // Show selected subsection
                    const sectionId = this.getAttribute('data-section') + '-section';
                    const targetSection = document.getElementById(sectionId);
                    if (targetSection) {
                        targetSection.style.display = 'block';
                    }
                });
            });

            // Set default active section (dashboard)
            const dashboardLink = document.querySelector('.sidebar ul li a[data-section="dashboard"]');
            if (dashboardLink) {
                dashboardLink.click();
            }
        }

        // Stub functions for article management (coadmin has limited article management)
        function displayArticlePDF(pdfUrl, title) {
            console.log('displayArticlePDF called with:', pdfUrl, title);
            // Simple implementation - open in new tab
            window.open(pdfUrl, '_blank');
        }

        function removeArticlePDF(button, articleId) {
            console.log('removeArticlePDF called with:', button, articleId);
            // Stub - not implemented for coadmin
        }

        function handleArticlePDFUpload(input, articleId) {
            console.log('handleArticlePDFUpload called with:', input, articleId);
            // Stub - not implemented for coadmin
        }

        function getArticles() {
            return JSON.parse(localStorage.getItem('articles') || '[]');
        }

        function saveArticles(articles) {
            localStorage.setItem('articles', JSON.stringify(articles));
        }

        function getAdminArticles() {
            return JSON.parse(localStorage.getItem('adminArticles') || '[]');
        }

        function saveAdminArticles(articles) {
            localStorage.setItem('adminArticles', JSON.stringify(articles));
        }

        function updateArticleInServer(articleId, articleData) {
            console.log('updateArticleInServer called with:', articleId, articleData);
            // Stub - API call not implemented for coadmin
        }

        // === INIT ===
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('Coadmin page DOMContentLoaded fired');

            // Dark mode - Apply saved preference on page load
            const darkModeToggle = document.querySelector('.dark-mode-toggle');
            const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;
            const savedDarkMode = localStorage.getItem('darkMode');
            if (savedDarkMode === 'on') {
                document.body.classList.add('dark-mode');
                if (darkModeIcon) {
                    darkModeIcon.className = 'fas fa-sun';
                    darkModeIcon.style.color = '#FFD700';
                }
            }

            // Load users and initialize dashboard
            await loadUsers();
            await updateDashboardCounts();

            // Set up navigation
            setupNavigation();

            // Set up sidebar toggle
            const toggleBtn = document.getElementById('toggle-btn');
            const sidebar = document.querySelector('.sidebar');
            const mainContent = document.querySelector('.main-content');
            const header = document.querySelector('.header');

            if (toggleBtn && sidebar && mainContent && header) {
                toggleBtn.addEventListener('click', function() {
                    sidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('sidebar-collapsed');
                    header.classList.toggle('sidebar-collapsed');
                });
            }

            // Set up dark mode toggle
            if (darkModeToggle) {
                darkModeToggle.addEventListener('click', function() {
                    document.body.classList.toggle('dark-mode');
                    const isDark = document.body.classList.contains('dark-mode');
                    localStorage.setItem('darkMode', isDark ? 'on' : 'off');
                    if (darkModeIcon) {
                        darkModeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
                        darkModeIcon.style.color = isDark ? '#FFD700' : '#777';
                    }
                });
            }

            // Show welcome modal briefly
            const welcomeModal = document.getElementById('welcome-modal');
            if (welcomeModal) {
                welcomeModal.classList.add('show');
                setTimeout(() => {
                    welcomeModal.classList.remove('show');
                }, 3000);
            }
        });