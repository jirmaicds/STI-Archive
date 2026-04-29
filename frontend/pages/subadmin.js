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

        function getUserName(user) {
            return user.fullname || user.name || 'Unknown';
        }

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
                }

                localStorage.setItem("users", JSON.stringify(users));
            }
            
            // Call backend API for accept actions to send emails
            if (action === "accept" && userEmail) {
                const endpoint = "/api/auth/approve-user/" + encodeURIComponent(userEmail);
                
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
                    newActions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button><button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button><button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${user.name}')">Remove</button></div>`;
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
                        grade: user.grade || user.Grade || user.year_level,
                        Sec_Degr: user.Sec_Degr || user.sec_degr || user.strand || user.course,
                        sec_degr: user.sec_degr || user.Sec_Degr,
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
            console.log('loadUsers called for subadmin');

            try {
                users = await getUsers();
                console.log('getUsers returned:', users);
            } catch (error) {
                console.error('Error loading users:', error);
                users = JSON.parse(localStorage.getItem('users')) || [];
                console.log('Fallback to localStorage users:', users);
            }
            if (!Array.isArray(users)) users = [];
            console.log('loadUsers got users, count:', users.length);

            const removedUsers = JSON.parse(localStorage.getItem('removedUsers')) || [];
            const filteredUsers = (users || []).filter(user => !removedUsers.includes(user.id));
            if (DEBUG) console.log('DEBUG: filteredUsers count:', filteredUsers.length);

            // Set global users
            window.users = filteredUsers;

            // Map fields for display - handle all field variations
            filteredUsers.forEach(user => {
                // Handle grade field variations
                user.grade = user.grade || user.Grade || user.year_level || user.grade_level || '-';
                if (String(user.grade).toLowerCase() === 'null' || String(user.grade).toLowerCase() === 'undefined') user.grade = '-';

                // Sec_Degr contains:
                // - For SHS: strand values (ABM, ITMAWD, STEM)
                // - For College: degree values (BSBA, BSCS, BSIT)
                user.Sec_Degr = user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course || user.program || user.str_degr || '-';
                if (String(user.Sec_Degr).toLowerCase() === 'null' || String(user.Sec_Degr).toLowerCase() === 'undefined') user.Sec_Degr = '-';

                // Resolve descriptive role name for the table column
                const typeSlug = (user.user_type || '').toLowerCase();
                const roleVal = (user.role || '').toLowerCase();
                if (typeSlug === 'senior_high' || roleVal === 'senior_high' || roleVal === 'shs') user.role = 'Senior High';
                else if (typeSlug === 'college' || roleVal === 'college') user.role = 'College';
                else if (typeSlug === 'educator' || roleVal === 'educator') user.role = 'Educator';
                else if (roleVal === 'admin' || roleVal === 'coadmin' || roleVal === 'subadmin') {
                    user.role = roleVal.charAt(0).toUpperCase() + roleVal.slice(1);
                }
                else if (user.role === 'user' || !user.role) user.role = user.user_type || 'User';

                // Set appropriate display values for Grade based on resolved role
                if (user.role === 'Senior High') {
                    user.grade = (user.grade && user.grade !== '-' && user.grade !== 'N/A') ? user.grade : '-';
                } else {
                    user.grade = 'N/A'; // College, Educator, Admin, etc.
                }
                // Set appropriate display values for Sec_Degr based on resolved role
                if (user.role === 'Educator' || user.role === 'Admin' || user.role === 'Co-Admin' || user.role === 'Sub-Admin') {
                    user.Sec_Degr = 'N/A';
                } else {
                    user.Sec_Degr = (user.Sec_Degr && user.Sec_Degr !== '-' && user.Sec_Degr !== 'N/A') ? user.Sec_Degr : '-';
                }
            });

            // Clear all tbodys
            document.querySelectorAll('#users tbody').forEach(tbody => tbody.innerHTML = '');

            // Process users - subadmin only sees regular users, not admin accounts
            filteredUsers.forEach(user => {
                if (DEBUG) console.log('DEBUG: Processing user:', user.id, user.name, user.role, user.email, user.personal_email, user.verified);

                // Skip admin accounts for subadmin
                const roleLower = (user.role || '').toLowerCase();
                if (roleLower === 'admin' || roleLower === 'coadmin' || roleLower === 'subadmin') {
                    return; // Skip admin users
                }

                const date = formatDate(user.verified_at || user.created_at);
                let actions = '';
                const userId = user.user_id || user.id;
                if (user.verified) {
                    actions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button></div>`;
                } else if (user.banned_user) {
                    actions = `<div style="display: flex; flex-direction: column; gap: 4px;"><button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Unban</button></div>`;
                } else {
                    actions = `
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>
                        </div>
                    `;
                }
                let emailToUse = user.personal_email || user.email;
                const rafEduIdCell = `<button class="view-pdf-btn" onclick="previewUserDocs('${userId}')">Preview</button>`;
                const rowWithCheckboxAndActions = `<tr>
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
                const rowWithoutCheckbox = `<tr>
                    <td>${getUserName(user)}</td>
                    <td>${emailToUse}</td>
                    <td>${formatRole(user.role)}</td>
                    <td>${user.grade || user.Grade || user.year_level || '-'}</td>
                    <td>${user.Sec_Degr || '-'}</td>
                    <td>${date}</td>
                    <td>${rafEduIdCell}</td>
                </tr>`;

                // Status categorization for regular users only
                const userStatus = getUserStatus(user);
                if (userStatus === 'approved') {
                    if (DEBUG) console.log('DEBUG: Adding verified user to table:', user.name, user.email);
                    document.getElementById('verified-users-tbody').innerHTML += rowWithoutCheckbox;
                } else if (userStatus === 'pending') {
                    if (DEBUG) console.log('DEBUG: Adding signing-up user to table:', user.name, user.email);
                    document.getElementById('signing-up-users-tbody').innerHTML += rowWithCheckboxAndActions;
                }
            });

            // Update counts
            updateDashboardCounts();

            // Apply pagination
            paginateTable('verified-users-tbody', 10);
            paginateTable('signing-up-users-tbody', 10);

            console.log('loadUsers completed for subadmin');
            return users;
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
            if (role === 'senior_high' || role === 'Senior High') return 'Senior High';
            if (role === 'college') return 'College';
            if (role === 'educator') return 'Educator';
            if (role === 'admin') return 'Admin';
            if (role === 'coadmin') return 'CO-Admin';
            if (role === 'subadmin') return 'SUB-Admin';
            if (role === 'tester') return 'Tester';
            return role || 'User';
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
            if (user.banned === true) return 'banned';
            if (user.rejected === true) return 'rejected';
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

        // === NOTIFICATION FUNCTIONS ===

        let confirmAction = null;

        function showConfirm(title, message, action) {
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            confirmAction = action;
            document.getElementById('confirm-modal').classList.add('show');
        }

        function hideConfirm() {
            document.getElementById('confirm-modal').classList.remove('show');
            confirmAction = null;
        }

        function executeConfirmAction() {
            if (confirmAction) {
                confirmAction();
            }
            hideConfirm();
        }

        function toggleNotificationModal() {
            const modal = document.getElementById('notification-modal');
            if (!modal) return;
            modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
            if (DEBUG) console.log('toggleNotificationModal called');
            if (DEBUG) console.log('generateNotifications defined:', typeof generateNotifications);
            if (DEBUG) console.log('localStorage users:', localStorage.getItem('users') ? 'exists' : 'null');
            // Refresh notifications when opening modal
            if (modal.style.display === 'block') {
                const users = JSON.parse(localStorage.getItem('users')) || [];
                if (DEBUG) console.log('Users count for notifications:', users.length);
                if (typeof generateNotifications === 'function') {
                    const freshNotifications = generateNotifications(users);
                    if (DEBUG) console.log('Fresh notifications count:', freshNotifications.length);
                    const notificationList = document.getElementById('notification-list');
                    if (!notificationList) return;
                    notificationList.innerHTML = '';
                    const maxNotifications = 10;
                    const limitedNotifications = freshNotifications.slice(0, maxNotifications);
                    const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
                    limitedNotifications.forEach(notif => {
                        const notifDiv = document.createElement('div');
                        notifDiv.className = 'notification-item';
                        notifDiv.setAttribute('data-id', notif.id);
                        const isRead = readNotifications.includes(notif.id);
                        if (isRead) {
                            notifDiv.classList.add('read');
                        }
                        notifDiv.innerHTML = `
                            <div class="notification-type ${notif.type}">${notif.typeText}</div>
                            <div class="notification-content">${notif.content}</div>
                            <div class="notification-time">${notif.time}</div>
                            <div class="notification-actions">
                                <i class="fas ${isRead ? 'fa-check' : 'fa-times'}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}" onclick="${isRead ? 'markNotificationUnread(this)' : 'markNotificationRead(this)'}"></i>
                            </div>
                        `;
                        notificationList.appendChild(notifDiv);
                    });
                    const placeholder = document.querySelector('.notification-placeholder');
                    if (placeholder) {
                        placeholder.style.display = freshNotifications.length > 0 ? 'none' : 'block';
                    }
                    updateNotificationBadge(freshNotifications);
                }
            }
        }

        window.toggleNotificationModal = toggleNotificationModal;

        function markNotificationRead(icon) {
            const notificationItem = icon.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            notificationItem.classList.add('read');
            // Change icon to check mark
            icon.className = 'fas fa-check';
            icon.title = 'Mark as Unread';
            icon.onclick = function() { markNotificationUnread(this); };

            // Persist read state
            let readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
            if (!readNotifications.includes(notificationId)) {
                readNotifications.push(notificationId);
                localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
            }

            // Update badge count
            updateNotificationBadge();
        }

        function markNotificationUnread(icon) {
            const notificationItem = icon.closest('.notification-item');
            const notificationId = notificationItem.getAttribute('data-id');
            notificationItem.classList.remove('read');
            // Change icon back to cross
            icon.className = 'fas fa-times';
            icon.title = 'Mark as Read';
            icon.onclick = function() { markNotificationRead(this); };

            // Remove from persisted read states
            let readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
            readNotifications = readNotifications.filter(id => id !== notificationId);
            localStorage.setItem('readNotifications', JSON.stringify(readNotifications));

            // Update badge count
            updateNotificationBadge();
        }

        function updateNotificationBadge(notifications) {
            if (!notifications) {
                // If no notifications passed, try to get from DOM
                const notificationItems = document.querySelectorAll('.notification-item');
                const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
                let unreadCount = 0;

                notificationItems.forEach(item => {
                    const notificationId = item.getAttribute('data-id');
                    if (!readNotifications.includes(notificationId)) {
                        unreadCount++;
                    }
                });

                const badge = document.querySelector('.notification-badge');
                if (badge) {
                    badge.textContent = unreadCount;
                    badge.style.display = unreadCount > 0 ? 'flex' : 'none';
                }

                // Show/hide mark all read button based on unread count
                const markAllBtn = document.querySelector('.mark-all-read-btn');
                if (markAllBtn) {
                    markAllBtn.style.display = unreadCount > 0 ? 'flex' : 'none';
                }
                return;
            }

            // If notifications passed, count unread
            const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
            let unreadCount = 0;

            notifications.forEach(notif => {
                if (!readNotifications.includes(notif.id)) {
                    unreadCount++;
                }
            });

            const badge = document.querySelector('.notification-badge');
            if (badge) {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }

            // Show/hide mark all read button based on unread count
            const markAllBtn = document.querySelector('.mark-all-read-btn');
            if (markAllBtn) {
                markAllBtn.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
        }

        function loadAllNotifications() {
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const notifications = generateNotifications(users);
            const allNotificationsContainer = document.getElementById('all-notifications-list');
            const paginationControls = document.getElementById('pagination-controls');
            const pageNumbers = document.getElementById('page-numbers');

            if (!allNotificationsContainer) return;

            allNotificationsContainer.innerHTML = '';

            if (notifications.length === 0) {
                allNotificationsContainer.innerHTML = '<div class="notification-placeholder">No notifications available.</div>';
                if (paginationControls) paginationControls.style.display = 'none';
                return;
            }

            // Setup pagination
            const itemsPerPage = 10;
            const totalPages = Math.ceil(notifications.length / itemsPerPage);
            let currentPage = 1;

            // Store pagination state globally
            window.notificationPagination = {
                notifications: notifications,
                currentPage: currentPage,
                totalPages: totalPages,
                itemsPerPage: itemsPerPage
            };

            function renderPage(page) {
                allNotificationsContainer.innerHTML = '';
                const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];

                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = Math.min(startIndex + itemsPerPage, notifications.length);

                for (let i = startIndex; i < endIndex; i++) {
                    const notif = notifications[i];
                    const notifDiv = document.createElement('div');
                    notifDiv.className = 'notification-item';
                    notifDiv.setAttribute('data-id', notif.id);

                    const isRead = readNotifications.includes(notif.id);
                    if (isRead) {
                        notifDiv.classList.add('read');
                    }

                    notifDiv.innerHTML = `
                        <input type="checkbox" class="notification-checkbox">
                        <div class="notification-details">
                            <div class="notification-type ${notif.type}">${notif.typeText}</div>
                            <div class="notification-content">${notif.content}</div>
                            <div class="notification-time">${notif.time}</div>
                        </div>
                        <div class="notification-actions">
                            <i class="fas ${isRead ? 'fa-check' : 'fa-times'}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}" onclick="${isRead ? 'markNotificationUnread(this)' : 'markNotificationRead(this)'}"></i>
                        </div>
                    `;
                    allNotificationsContainer.appendChild(notifDiv);
                }
            }

            function renderPagination() {
                pageNumbers.innerHTML = '';

                for (let i = 1; i <= totalPages; i++) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = 'page-number' + (i === currentPage ? ' active' : '');
                    pageBtn.textContent = i;
                    pageBtn.onclick = function() {
                        currentPage = i;
                        window.notificationPagination.currentPage = i;
                        renderPage(i);
                        renderPagination();
                    };
                    pageNumbers.appendChild(pageBtn);
                }
            }

            renderPage(currentPage);
            renderPagination();

            if (paginationControls) {
                paginationControls.style.display = totalPages > 1 ? 'block' : 'none';
            }
        }

        function showNotificationsFromModal() {
            // Navigate to notifications section and load all notifications
            document.querySelectorAll('.sidebar ul li').forEach(function(li){li.classList.remove('active')});
            var notifLink = document.querySelector('.sidebar ul li a[data-section="notifications"]');
            if(notifLink){
                notifLink.parentElement.classList.add('active');
            }
            document.querySelectorAll('.content-section').forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });
            const notificationsSection = document.getElementById('notifications');
            if (notificationsSection) {
                notificationsSection.classList.add('active');
                notificationsSection.style.display = 'block';
                loadAllNotifications();
            }
            toggleNotificationModal();
        }

        function showMarkAllConfirm() {
            showConfirm('Mark All as Read', 'Are you sure you want to mark all notifications as read? This action cannot be undone.', () => {
                // Mark all notifications as read
                const notificationItems = document.querySelectorAll('.notification-item');
                let readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];

                notificationItems.forEach(item => {
                    const notificationId = item.getAttribute('data-id');
                    item.classList.add('read');
                    const icon = item.querySelector('.notification-actions i');
                    if (icon && icon.classList.contains('fa-times')) {
                        icon.className = 'fas fa-check';
                        icon.title = 'Mark as Unread';
                        icon.onclick = function() { markNotificationUnread(this); };
                    }

                    // Persist read state
                    if (!readNotifications.includes(notificationId)) {
                        readNotifications.push(notificationId);
                    }
                });

                // Save to localStorage
                localStorage.setItem('readNotifications', JSON.stringify(readNotifications));

                // Hide the mark all read button and its icon
                const markAllBtn = document.querySelector('.mark-all-read-btn');
                if (markAllBtn) {
                    markAllBtn.style.display = 'none';
                }

                // Update the notification badge
                updateNotificationBadge();
            });
        }

        // === INIT ===
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('Subadmin page DOMContentLoaded fired');

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

            // Setup notification controls
            const markSelectedReadBtn = document.getElementById('mark-selected-read');
            const deleteSelectedBtn = document.getElementById('delete-selected');
            const selectAllNotifications = document.getElementById('select-all-notifications');

            if (markSelectedReadBtn) {
                markSelectedReadBtn.addEventListener('click', function() {
                    const selectedNotifications = document.querySelectorAll('#all-notifications-list .notification-checkbox:checked');
                    selectedNotifications.forEach(checkbox => {
                        const notificationItem = checkbox.closest('.notification-item');
                        const notificationId = notificationItem.getAttribute('data-id');
                        markNotificationRead(notificationItem.querySelector('.notification-actions i'));
                    });
                });
            }

            if (deleteSelectedBtn) {
                deleteSelectedBtn.addEventListener('click', function() {
                    const selectedNotifications = document.querySelectorAll('#all-notifications-list .notification-checkbox:checked');
                    const notificationIds = Array.from(selectedNotifications).map(checkbox => {
                        return checkbox.closest('.notification-item').getAttribute('data-id');
                    });

                    if (notificationIds.length === 0) {
                        alert('Please select notifications to delete.');
                        return;
                    }

                    if (confirm(`Are you sure you want to delete ${notificationIds.length} notification(s)?`)) {
                        let deletedNotifications = JSON.parse(localStorage.getItem('deletedNotifications')) || [];
                        deletedNotifications = deletedNotifications.concat(notificationIds);
                        localStorage.setItem('deletedNotifications', JSON.stringify(deletedNotifications));

                        // Remove from DOM
                        selectedNotifications.forEach(checkbox => {
                            checkbox.closest('.notification-item').remove();
                        });

                        // Reload notifications to update pagination
                        loadAllNotifications();
                    }
                });
            }

            if (selectAllNotifications) {
                selectAllNotifications.addEventListener('change', function() {
                    const checkboxes = document.querySelectorAll('#all-notifications-list .notification-checkbox');
                    checkboxes.forEach(checkbox => {
                        checkbox.checked = this.checked;
                    });
                });
            }
        });

        // Navigation setup for subadmin
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
                        // Special handling for notifications section
                        if (sectionId === 'notifications') {
                            loadAllNotifications();
                        }
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