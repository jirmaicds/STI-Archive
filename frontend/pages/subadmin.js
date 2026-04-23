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

        // === PDF MODAL FUNCTIONS ===
        // For subadmin users - just close the modal and stay in current location
        function closePdfEditorModal() {
            const modal = document.getElementById('pdfEditorModal');
            if (modal) {
                modal.style.display = 'none';
            }
            // Admin users stay in their current location
        }

        // === UTILS ===
        let isLoadingUsers = false;
        async function getUsers(forceRefresh = false, page = 1, limit = 50) {
            if (forceRefresh) {
                localStorage.removeItem('users');
                isLoadingUsers = false;
                if (DEBUG) console.log('DEBUG: Force refresh requested for users');
            }
            if (isLoadingUsers) return JSON.parse(localStorage.getItem('users') || '[]');
            isLoadingUsers = true;
            if (DEBUG) console.log('DEBUG: Attempting to fetch users from user.json...');
            try {
                const offset = (page - 1) * limit;
                const response = await fetch(`/api/users?limit=${limit}&offset=${offset}&_=${Date.now()}`);
                if (DEBUG) console.log('DEBUG: Fetch response status:', response.status);
                if (response.ok) {
                    if (DEBUG) console.log('DEBUG: Server responded successfully, parsing JSON...');
                    const data = await response.json();
                    // Map user.json fields to the format expected by loadUsers()
                    const users = (data.users || []).map(user => ({
                        id: user.user_id,
                        user_id: user.user_id,
                        name: user.fullname,
                        email: user.email,
                        personal_email: user.email,
                        role: user.role,
                        isActive: user.verified,
                        verified: user.verified,
                        rejected: user.rejected_user,
                        banned: user.banned,
                        new_user: user.new_user,
                        created_at: user.created_at,
                        updated_at: user.updated_at,
                        type: user.user_type,
                        grade: user.grade,
                        Sec_Degr: user.Sec_Degr,
                        sec_degr: user.sec_degr,
                        strand: user.strand,
                        section: user.section,
                        course: user.course,
                        department: user.department
                    }));
                    // Store pagination info
                    if (data.total !== undefined) {
                        users._total = data.total;
                        users._limit = data.limit || limit;
                        users._offset = data.offset || offset;
                    }
                    // Save to localStorage for fallback
                    localStorage.setItem('users', JSON.stringify(users));
                    isLoadingUsers = false;
                    return users;
                } else {
                    if (DEBUG) console.log('DEBUG: Server returned error:', response.status, 'falling back to localStorage');
                }
            } catch (e) {
                if (DEBUG) console.log('DEBUG: Could not load users from user.json:', e.message);
            }
            const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
            if (DEBUG) console.log('DEBUG: Loaded users from localStorage, count:', localUsers.length);
            isLoadingUsers = false;
            return localUsers;
        }
        function saveUsers(users) {
            localStorage.setItem('users', JSON.stringify(users));
        }

        // Function to load users from user.json file
        async function getUsersFromJson() {
            try {
                const response = await fetch('api/data/users.json');
                if (response.ok) {
                    const data = await response.json();
                    return data.users || [];
                }
            } catch (e) {
                if (DEBUG) console.log('DEBUG: Could not load users from user.json:', e.message);
            }
            return [];
        }

        // Current filter states
        let currentFilters = {
            admins: { role: '', search: '', filterType: 'unified' },
            verified: { role: '', search: '', filterType: 'unified' },
            'signing-up': { role: '', search: '', filterType: 'unified' },
            banned: { role: '', search: '', filterType: 'unified' }
        };

        async function loadUsers() {
            try {
                const response = await fetch('/api/users?limit=100&offset=0');
                const data = await response.json();
                if (Array.isArray(data)) {
                    users = data;
                } else if (data.users && Array.isArray(data.users)) {
                    users = data.users;
                } else {
                    users = [];
                }
                users = Array.isArray(users) ? users : [];
                localStorage.setItem('users', JSON.stringify(users));
                updateDashboardCounts();
            } catch (error) {
                // console.error('Error loading users:', error);
                try {
                    const stored = localStorage.getItem('users');
                    users = stored ? JSON.parse(stored) : [];
                } catch (e) {
                    users = [];
                }
            }
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

        function getActivityLogs() {
            return JSON.parse(localStorage.getItem('activityLogs')) || [];
        }
        function saveActivityLogs(logs) {
            localStorage.setItem('activityLogs', JSON.stringify(logs));
        }
        function formatRole(role) {
            if (role === 'senior_high') return 'SHS';
            if (role === 'college') return 'College';
            if (role === 'admin') return 'Admin';
            if (role === 'coadmin') return 'CO-Admin';
            if (role === 'subadmin') return 'SUB-Admin';
            if (role === 'tester') return 'Tester';
            return 'Teacher';
        }
        function getSectionDisplay(user) {
            if (user.role === 'senior_high') {
                const grade = user.grade_level || user.Grade_level;
                const section = user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course;
                if (section && grade) {
                    return `${grade} - ${section}`;
                } else if (section) {
                    return section;
                } else if (grade) {
                    return grade;
                } else {
                    return '-';
                }
            } else if (user.role === 'college') {
                return user.Str_Degr || '-';
            } else if (user.role === 'educator') {
                return user.Str_Degr || '-';
            } else {
                return user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course || '-';
            }
        }
        // Helper function for subadmin status detection
        function getUserStatus(user) {
            if (user.new_user === true) return 'pending';
            if (user.banned_user === true) return 'banned';
            if (user.rejected_user === true) return 'rejected';
            if (user.verified === true) return 'approved';
            // Fallback
            if (user.verified && !user.banned && !user.rejected) return 'approved';
            if (user.banned) return 'banned';
            if (user.rejected) return 'rejected';
            return 'pending';
        }

        // Update dashboard counts
        async function updateDashboardCounts() {
            // Get total counts without pagination limits
            try {
                const token = localStorage.getItem('sti_auth_token');
                const response = await fetch('/api/users/count?_=' + Date.now(), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (response.ok) {
                    const countData = await response.json();
                    if (countData.success && countData.counts) {
                        const verifiedEl = document.getElementById('verified-users-count');
                        const signingUpEl = document.getElementById('signing-up-users-count');

                        if (verifiedEl) verifiedEl.textContent = countData.counts.usersCount || 0;
                        if (signingUpEl) signingUpEl.textContent = countData.counts.newSignups || 0;
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch total user counts, falling back to local data:', error);
                // Fallback to local calculation
                if (!Array.isArray(users)) users = [];
                const usersCount = users.filter(u => u.user_type === 'user').length;
                const signingUpCount = users.filter(u => getUserStatus(u) === 'pending').length;

                const verifiedEl = document.getElementById('verified-users-count');
                const signingUpEl = document.getElementById('signing-up-users-count');

                if (verifiedEl) verifiedEl.textContent = usersCount;
                if (signingUpEl) signingUpEl.textContent = signingUpCount;
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
        function getStatus(createdAt) {
            if (!createdAt) return 'Pending';
            const now = new Date();
            const created = new Date(createdAt);
            const diffMs = now - created;
            const diffHours = diffMs / (1000 * 60 * 60);
            return diffHours < 1 ? 'Just Now' : 'Pending';
        }
        let timeChartType = 'line';
        function toggleTimeChartType() {
            timeChartType = timeChartType === 'line' ? 'bar' : 'line';
            document.getElementById('toggle-time-chart').innerText = timeChartType === 'line' ? 'Bar' : 'Line';
        }

        // === INIT ===
        document.addEventListener('DOMContentLoaded', async function() {
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

        // Navigation setup for subadmin
        function setupNavigation() {
            const navButtons = document.querySelectorAll('.nav-btn');
            const contentSections = document.querySelectorAll('.content-section');

            navButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Remove active class from all buttons
                    navButtons.forEach(btn => btn.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');

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

            // Set default active section (dashboard)
            const dashboardBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
            if (dashboardBtn) {
                dashboardBtn.click();
            }
        }