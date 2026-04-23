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
        }// === GLOBAL VARIABLES ===
let currentPeriod = '';

// === GLOBAL FUNCTIONS ===
// Moved outside DOMContentLoaded to ensure availability on page load
function generateNotifications(users) {
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

// === PDF MODAL FUNCTIONS ===
// For admin users - just close the modal and stay in current location
function closePdfEditorModal() {
const modal = document.getElementById('pdfEditorModal');
if (modal) {
modal.style.display = 'none';
}
// Admin users stay in their current location
}

// === UTILS ===
// Helper function to get user name with backward compatibility
function getUserName(user) {
return user.fullname || user.name || 'Unknown';
}

let isLoadingUsers = false;
async function getUsers(forceRefresh = false, page = 1, limit = 50) {
if (forceRefresh) {
// Clear localStorage and force reload from server
localStorage.removeItem('users');
isLoadingUsers = false;
if (DEBUG) console.log('DEBUG: Force refresh - cleared localStorage and reset isLoadingUsers');
}
if (isLoadingUsers && !forceRefresh) return JSON.parse(localStorage.getItem('users')) || [];
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
let localUsers = JSON.parse(localStorage.getItem('users')) || [];
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
return fetch('/api/articles')
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
console.error('âœ— Failed to load articles:', data.error || 'Unknown error');
}
})
.catch(error => {
if (DEBUG) console.log('âœ— Error fetching articles (server may be down):', error.message);
});
}

// Load user uploads for admin
function loadUserUploadsForAdmin() {
return fetch('/api/admin/user-uploads')
.then(response => {
if (!response.ok) throw new Error('Server error');
return response.json();
})
.then(data => {
if (data.success) {
window.userUploadsData = data.uploads;
renderUserUploads(data.uploads);
} else {
console.error('âœ— Failed to load user uploads:', data.error);
}
})
.catch(error => {
console.error('âœ— Error fetching user uploads:', error);
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
<label><strong>Abstract:</strong></label>
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

// Sort signing-up users by created_at descending (newest first)
signingUpUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// Duplicate prevention: use a Set to track already added user IDs
const addedSigningUpUsers = new Set();

// Append sorted signing-up users
signingUpUsers.forEach(user => {
const userId = user.user_id || user.id;
// Skip if this user ID has already been added
if (addedSigningUpUsers.has(userId)) {
return;
}
addedSigningUpUsers.add(userId);
const date = formatDate(user.created_at);
let actions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${user.id}', 'accept')">Accept</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${user.id}', 'ban')">Ban</button>
</div>
`;
let emailToUse = user.personal_email || user.email;
const row = `<tr>
<td><input type="checkbox" class="user-checkbox" data-user-id="${user.id}"></td>
<td>${user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${user.role}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>${user.raf_path || ''} / ${user.educator_id || ''}</td>
<td>${actions}</td>
</tr>`;
document.getElementById('signing-up-users-tbody').innerHTML += row;
});
}

function formatRole(role) {
if (role === 'senior_high') return 'SHS';
if (role === 'college') return 'College';
if (role === 'admin') return 'Admin';
if (role === 'coadmin') return 'CO-Admin';
if (role === 'subadmin') return 'SUB-Admin';
if (role === 'tester') return 'Tester';
if (role === 'educator') return 'Educator';
return role; // Default to the original role if not matched
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
function toggleTimeChartType() {
timeChartType = timeChartType === 'line' ? 'bar' : 'line';
document.getElementById('toggle-time-chart').innerText = timeChartType === 'line' ? 'Bar' : 'Line';
}

// === CREATE ARTICLE TEMPLATE (VIEW/EDIT TOGGLE) ===
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

// === UPLOAD FORM HANDLER ===
document.getElementById('article-upload-form').addEventListener('submit', async function(e) {
e.preventDefault();

const category = document.getElementById('article-category').value;
const pdfInput = document.getElementById('article-pdf');
const pdfStatus = document.getElementById('pdf-upload-status');

let pdfId = null;
let pdfFilename = null;

// Handle PDF upload to Couchbase if file is selected
if (pdfInput && pdfInput.files.length > 0) {
const pdfFile = pdfInput.files[0];
pdfStatus.textContent = 'Uploading PDF to Couchbase...';
pdfStatus.style.color = '#0057b8';

try {
// Read file as base64
const reader = new FileReader();
const fileData = await new Promise((resolve, reject) => {
reader.onload = () => resolve(reader.result);
reader.onerror = reject;
reader.readAsDataURL(pdfFile);
});

// Upload to Couchbase via API
if (DEBUG) console.log('Uploading PDF to:', window.location.origin + '/api/pdf/upload');
const uploadResponse = await fetch('/api/pdf/upload', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({
fileData: fileData,
filename: pdfFile.name
})
});

if (DEBUG) console.log('PDF upload response status:', uploadResponse.status);
if (DEBUG) console.log('PDF upload response statusText:', uploadResponse.statusText);

const responseText = await uploadResponse.text();
if (DEBUG) console.log('PDF upload response text:', responseText);

if (!uploadResponse.ok || !responseText) {
throw new Error('Failed to upload PDF: ' + uploadResponse.status + ' ' + uploadResponse.statusText + ' - ' + responseText);
}

const uploadResult = JSON.parse(responseText);
pdfId = uploadResult.fileId;
pdfFilename = uploadResult.filename;
pdfStatus.textContent = 'PDF uploaded successfully!';
pdfStatus.style.color = 'green';

} catch (pdfError) {
console.error('Error uploading PDF - full error:', pdfError);
console.error('Error message:', pdfError.message);
if (pdfError.response) {
console.error('Response data:', pdfError.response.data);
}
pdfStatus.textContent = 'Error uploading PDF: ' + pdfError.message;
pdfStatus.style.color = 'red';
alert('Warning: PDF upload failed. Article will be saved without PDF.');
}
}

const topicValue = document.getElementById('article-topic').value;
const levelValue = category === 'research' ? '' : document.getElementById('capstone-grade').value;

const formData = {
title: document.getElementById('article-title').value,
authors: document.getElementById('article-authors-year').value,
meta: document.getElementById('article-authors-year').value,
summary: document.getElementById('article-summary').value,
category: category,
strand: category === 'research' ? document.getElementById('article-strand').value : document.getElementById('article-program').value,
level: levelValue,
program: document.getElementById('article-program').value,
year: document.getElementById('article-year').value,
citation: document.getElementById('article-citation').value,
qualitativeQuantitative: category === 'research' ? document.getElementById('article-qualitative-quantitative').value : '',
topic: topicValue,
pdfUrl: pdfUrl
};
const articles = getArticles();
articles.push(formData);
saveArticles(articles);

// Add to admin articles for pagination
const adminArticles = getAdminArticles();
adminArticles.push(formData);
saveAdminArticles(adminArticles);

// Refresh pagination display
renderAdminArticles();
// Reset form
this.reset();
document.getElementById('article-category').value = 'research';
document.getElementById('article-level').value = 'shs';
// Reset topic dropdown
document.getElementById('article-topic').innerHTML = '<option value="">Select Topic</option><option value="agriculture">Agriculture</option><option value="business">Business</option><option value="cosmetics">Cosmetics</option><option value="education">Education</option><option value="environment">Environment</option><option value="food">Food</option><option value="technology">Technology</option>';
// Reset visibility
document.querySelector('.research-options').style.display = 'inline';
document.querySelector('.capstone-options').style.display = 'none';
document.querySelector('.article-template').classList.remove('capstone');
document.getElementById('article-qualitative-quantitative').value = 'qualitative';
// Reset PDF upload status
if (pdfStatus) {
pdfStatus.textContent = '';
}
});

// Add event listener for category change in upload form
document.getElementById('article-category').addEventListener('change', function() {
const researchOpts = document.querySelector('.research-options');
const capstoneOpts = document.querySelector('.capstone-options');
const template = document.querySelector('.article-template');
// Update topic options based on category
const baseTopics = [
{ value: 'agriculture', text: 'Agriculture' },
{ value: 'business', text: 'Business' },
{ value: 'cosmetics', text: 'Cosmetics' },
{ value: 'education', text: 'Education' },
{ value: 'environment', text: 'Environment' },
{ value: 'food', text: 'Food' },
{ value: 'technology', text: 'Technology' }
 ];

let topicOptions = '<option value="">Select Topic</option>';
baseTopics.forEach(t => {
topicOptions += `<option value="${t.value}">${t.text}</option>`;
});
 
if (this.value === 'research') {
researchOpts.style.display = 'inline';
capstoneOpts.style.display = 'none';
template.classList.remove('capstone');
} else {
researchOpts.style.display = 'none';
capstoneOpts.style.display = 'inline';
template.classList.add('capstone');
}
document.getElementById('article-topic').innerHTML = topicOptions;
});

// Add event listener for level change in upload form
const levelSelect = document.getElementById('article-level');
if (levelSelect) {
levelSelect.addEventListener('change', function() {
const strandSelect = document.getElementById('article-strand');
const label = document.getElementById('strand-degree-label');
if (this.value === 'college') {
label.textContent = 'Degree:';
strandSelect.innerHTML = `
<option value="BSBA">BSBA</option>
<option value="BSCS">BSCS</option>
<option value="BSIT">BSIT</option>
`;
} else {
label.textContent = 'Strand:';
strandSelect.innerHTML = `
<option value="ABM">ABM</option>
<option value="ITMAWD">ITMAWD</option>
<option value="STEM">STEM</option>
`;
}
});
}
 
 
// Flag to prevent storage event from switching sections
let isReloadingUsers = false;
+</body>
+</html>
         
// === INIT ===
document.addEventListener('DOMContentLoaded', async function() {
// Listen for user data changes from other admin tabs
window.addEventListener('storage', function(e) {
if (e.key === 'users' && !isReloadingUsers) {
if (DEBUG) console.log('DEBUG: Users changed in another tab, reloading...');
isReloadingUsers = true;
loadUsers().then(() => {
// DON'T switch to users section - just reload data
if (DEBUG) console.log('DEBUG: User tables refreshed (section unchanged)');
isReloadingUsers = false;
});
}
});

// Show welcome modal
const welcomeModal = document.getElementById('welcome-modal');
const welcomeModalContent = document.querySelector('.welcome-modal-content');
function closeWelcomeModal() {
welcomeModal.classList.remove('show');
}
welcomeModal.classList.add('show');
setTimeout(closeWelcomeModal, 4000); // 4 seconds
// Close modal when clicking outside
welcomeModal.addEventListener('click', function(e) {
if (e.target === welcomeModal) {
closeWelcomeModal();
}
});
// Dark mode - Apply saved preference on page load
const darkModeToggle = document.querySelector('.dark-mode-toggle');
const darkModeIcon = darkModeToggle ? darkModeToggle.querySelector('i') : null;
const savedDarkMode = localStorage.getItem('darkMode');
if (DEBUG) console.log('Admin page loaded, darkMode from localStorage:', savedDarkMode);
if (savedDarkMode === 'on') {
document.body.classList.add('dark-mode');
if (DEBUG) console.log('Applied dark-mode class to body');
if (darkModeIcon) {
darkModeIcon.className = 'fas fa-sun';
darkModeIcon.style.color = '#FFD700';
if (DEBUG) console.log('Updated icon to sun');
}
}

// Load articles from server (await to ensure they're loaded before proceeding)
await loadArticlesFromServer();
// Load user uploads for admin
// loadUserUploadsForAdmin(); // Commented out to prevent network error if API not available
// Load settings
const savedSettings = JSON.parse(localStorage.getItem('adminSettings')) || {};
document.getElementById('site-title').value = savedSettings.siteTitle || 'STI Archives';
// Update title preview on load
updateTitlePreview();
// Update favicon preview on load
if (savedSettings.siteLogo) {
updateFaviconPreview(savedSettings.siteLogo);
}
// Load logo if exists
if (savedSettings.siteLogo) {
const sidebarImg = document.querySelector('.sidebar-header img');
sidebarImg.src = savedSettings.siteLogo;
// Update favicon
updateFavicon(savedSettings.siteLogo);
}
// Load account settings
const accountSettings = JSON.parse(localStorage.getItem('accountSettings')) || {};
document.getElementById('admin-fullname').value = accountSettings.fullname || 'Admin';
document.getElementById('admin-username').value = accountSettings.username || '';
document.getElementById('admin-gmail').value = accountSettings.fullname || '';
document.getElementById('admin-password').value = accountSettings.password || '';
// Update profile avatar display
const avatarElement = document.getElementById('account-profile-avatar');
if (accountSettings.profilePic) {
updateProfileAvatar(accountSettings.profilePic);
} else if (accountSettings.fullname) {
avatarElement.textContent = accountSettings.fullname.charAt(0).toUpperCase();
}
// Profile picture upload handler
const profilePicUpload = document.getElementById('admin-profile-pic-upload');
profilePicUpload.addEventListener('change', function(e) {
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onload = function(e) {
const imageUrl = e.target.result;
updateProfileAvatar(imageUrl);
const accountSettings = JSON.parse(localStorage.getItem('accountSettings')) || {};
accountSettings.profilePic = imageUrl;
localStorage.setItem('accountSettings', JSON.stringify(accountSettings));
};
reader.readAsDataURL(file);
}
});
// Load terms and privacy
const defaultTerms = `<h1>Terms & Conditions</h1>
<p class="last-updated">Last Updated: February 2026</p>

<h2>1. Acceptance of Terms</h2>
<p>By accessing and using STI Archives, you accept and agree to be bound by the terms and provision of this agreement.</p>

<h2>2. Use License</h2>
<p>Permission is granted to temporarily use STI Archives for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
<ul>
<li>Modify or copy the materials</li>
<li>Use the materials for any commercial purpose or public display</li>
<li>Transfer the materials to another person or entity</li>
<li>Attempt to reverse engineer any software contained on the website</li>
</ul>

<h2>3. User Account Responsibilities</h2>
<p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.</p>

<h2>4. Content Submission</h2>
<p>Users may submit articles and documents to STI Archives. By submitting content, you grant us the right to use, modify, and display such content on our platform.</p>

<h2>5. Disclaimer</h2>
<p>The materials on STI Archives are provided "as is". STI Archives makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties, including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

<h2>6. Limitations</h2>
<p>In no event shall STI Archives or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on STI Archives.</p>

<h2>7. Privacy Policy</h2>
<p>Your privacy is important to us. Please review our <a href="/privacy.html">Privacy Policy</a> which describes how we collect, use, and protect your personal information.</p>

<h2>8. Governing Law</h2>
<p>These terms and conditions are governed by and construed in accordance with the laws of the Philippines and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>

<h2>9. Contact Us</h2>
<p>If you have any questions regarding these terms and conditions, you may contact us at [contact information].</p>`;
const defaultPrivacy = `<h1>Privacy Policy</h1>
<p class="last-updated">Last Updated: February 2026</p>

<h2>1. Introduction</h2>
<p>STI Archives ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by STI Archives when you use our website.</p>

<h2>2. Information We Collect</h2>
<p>We may collect the following types of information:</p>
<ul>
<li><strong>Personal Information:</strong> Name, email address, student ID, and other information you provide when creating an account</li>
<li><strong>Profile Information:</strong> Profile picture and other information you choose to add to your profile</li>
<li><strong>Usage Data:</strong> Information about how you interact with our website, including pages visited and features used</li>
<li><strong>Content:</strong> Articles, documents, and other materials you upload or save on our platform</li>
</ul>

<h2>3. How We Use Your Information</h2>
<p>We use your information to:</p>
<ul>
<li>Provide and maintain our services</li>
<li>Process your registrations and account management</li>
<li>Improve and personalize your experience</li>
<li>Send you important updates and notifications</li>
<li>Respond to your comments, questions, and requests</li>
<li>Analyze usage patterns to enhance our services</li>
</ul>

<h2>4. Data Security</h2>
<p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>

<h2>5. Third-Party Services</h2>
<p>Our website may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of those third parties.</p>

<h2>6. Cookies and Tracking Technologies</h2>
<p>We use cookies and similar tracking technologies to track the activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.</p>

<h2>7. Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access the personal information we hold about you</li>
<li>Request correction of inaccurate personal information</li>
<li>Request deletion of your personal information</li>
<li>Object to processing of your personal information</li>
<li>Request restriction of processing your personal information</li>
<li>Request transfer of your personal information</li>
</ul>

<h2>8. Children's Privacy</h2>
<p>Our service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.</p>

<h2>9. Changes to This Privacy Policy</h2>
<p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>

<h2>10. Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us.</p>`;
document.getElementById('terms-text').innerHTML = localStorage.getItem('termsContent') || defaultTerms;
document.getElementById('privacy-text').innerHTML = localStorage.getItem('privacyContent') || defaultPrivacy;
// Load notifications
const requests = [
{ action: 'Request: Accept approval for new user interface design', time: '2023-10-01 10:00 AM' },
{ action: 'Request: Grant permission to upload research articles', time: '2023-10-02 02:15 PM' },
{ action: 'Request: Accept approval and permission for site logo update', time: '2023-10-03 09:00 AM' }
];
const suggestions = [
{ action: 'Suggestion by admin: Implement dark mode', time: '2023-10-01 11:30 AM' },
{ action: 'Suggestion by user: Add search filters', time: '2023-10-02 04:45 PM' }
];
const bugs = [
{ action: 'Bug report: Login page not loading on mobile', time: '2023-10-04 01:00 PM' },
{ action: 'Bug report: Search function returns incorrect results', time: '2023-10-05 03:30 PM' }
];

// Load users first, then generate notifications
let notifications = [];
isReloadingUsers = true;
loadUsers().then(() => {
if (DEBUG) console.log('DEBUG: Initial loadUsers completed');
isReloadingUsers = false;
// Start polling for new users every 5 seconds
setInterval(async () => {
try {
const response = await fetch('/api/users');
if (response.ok) {
const serverUsers = await response.json();
if (DEBUG) console.log('DEBUG: Polled users from server, count:', serverUsers.length);
// Update localStorage with server users
localStorage.setItem('users', JSON.stringify(serverUsers));
// Reload the user tables to show new signups
isReloadingUsers = true;
loadUsers();
// Also regenerate notifications
notifications = generateNotifications(serverUsers);
updateNotificationBadge(notifications);
if (DEBUG) console.log('DEBUG: Tables reloaded with new users');
setTimeout(() => { isReloadingUsers = false; }, 100);
}
} catch (error) {
// Silent fail - polling continues in background
}
}, 5000); // Poll every 5 seconds

const users = JSON.parse(localStorage.getItem('users')) || [];
notifications = generateNotifications(users);
updateNotificationBadge(notifications);

// Set sidebar admin info from current logged in user
let currentUser = JSON.parse(localStorage.getItem('currentUser'));

// If no currentUser, try to get from users array based on role
if (!currentUser || !currentUser.name) {
const users = JSON.parse(localStorage.getItem('users')) || [];
currentUser = users.find(u => u.role === 'admin');
}

if (currentUser && currentUser.name) {
const initial = currentUser.name.charAt(0).toUpperCase();
document.querySelector('.admin-name').innerHTML = `<span class="a-prefix">${initial} </span>${currentUser.name}`;
document.querySelector('.profile-avatar').textContent = initial;
}

// Populate notification modal
const notificationList = document.getElementById('notification-list');
if (notificationList) {
notificationList.innerHTML = ''; // Clear existing
if (DEBUG) console.log('DEBUG: Populating notification modal with', notifications.length, 'notifications');
const maxNotifications = 10;
const limitedNotifications = notifications.slice(0, maxNotifications);
const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
if (limitedNotifications.length === 0) {
notificationList.innerHTML = '<div class="notification-placeholder">No new notifications.</div>';
} else {
limitedNotifications.forEach(notif => {
const notifDiv = document.createElement('div');
notifDiv.className = 'notification-item';
notifDiv.setAttribute('data-id', notif.id);

// Apply read state if previously marked as read
const isRead = readNotifications.includes(notif.id);
if (isRead) {
notifDiv.classList.add('read');
}

notifDiv.innerHTML = `
<div class="notification-details">
<div class="notification-type ${notif.type}">${notif.typeText}</div>
<div class="notification-content">${notif.content}</div>
<div class="notification-time">${formatNotificationDate(notif.time)}</div>
</div>
<div class="notification-actions">
<i class="fas ${isRead ? 'fa-check' : 'fa-times'}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}" onclick="${isRead ? 'markNotificationUnread' : 'markNotificationRead'}(this)"></i>
</div>
`;
notificationList.appendChild(notifDiv);
});
}
}

// Update badge count
updateNotificationBadge();

// Populate all notifications list with pagination
const allNotificationsContainer = document.getElementById('all-notifications-list');
if (allNotificationsContainer) {
allNotificationsContainer.innerHTML = ''; // Clear existing
const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];
const itemsPerPage = 10;
const totalPages = Math.ceil(notifications.length / itemsPerPage);
let currentPage = 1;

// Store pagination state globally
window.notificationPagination = {
currentPage: currentPage,
totalPages: totalPages,
itemsPerPage: itemsPerPage,
notifications: notifications
};

// Show notifications for current page (newest first)
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, notifications.length);

for (let i = endIndex - 1; i >= startIndex; i--) {
const notif = notifications[i];
const notifDiv = document.createElement('div');
notifDiv.className = 'notification-item';
notifDiv.setAttribute('data-id', notif.id);

// Apply read state if previously marked as read
const isRead = readNotifications.includes(notif.id);
if (isRead) {
notifDiv.classList.add('read');
}

notifDiv.innerHTML = `
<input type="checkbox" class="notification-checkbox">
<div class="notification-details">
<div class="notification-type ${notif.type}">${notif.typeText}</div>
<div class="notification-content">${notif.content}</div>
<div class="notification-time">${formatNotificationDate(notif.time)}</div>
</div>
<div class="notification-actions">
<i class="fas ${isRead ? 'fa-check' : 'fa-times'}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}" onclick="${isRead ? 'markNotificationUnread' : 'markNotificationRead'}(this)"></i>
</div>
`;
allNotificationsContainer.insertBefore(notifDiv, allNotificationsContainer.firstChild);
}

// Update pagination controls
updatePaginationControls();
}
// Update notification badge
updateNotificationBadge(notifications);

// Add event listeners for notification controls
document.getElementById('select-all-notifications').addEventListener('change', function() {
const checkboxes = document.querySelectorAll('.notification-checkbox');
checkboxes.forEach(cb => cb.checked = this.checked);
});

document.getElementById('mark-selected-read').addEventListener('click', function() {
const checkboxes = document.querySelectorAll('.notification-checkbox:checked');
if (checkboxes.length === 0) {
showTemporaryMessage('No items were selected');
return;
}
checkboxes.forEach(cb => {
const item = cb.closest('.notification-item');
const icon = item.querySelector('.notification-actions i');
if (icon && icon.classList.contains('fa-times')) {
markNotificationRead(icon);
}
});
});

document.getElementById('delete-selected').addEventListener('click', function() {
const checkboxes = document.querySelectorAll('.notification-checkbox:checked');
if (checkboxes.length === 0) {
alert('No notifications selected.');
return;
}
showConfirm('Delete Selected Notifications', 'Are you sure you want to delete the selected notifications? This action cannot be undone.', () => {
let deletedNotifications = JSON.parse(localStorage.getItem('deletedNotifications')) || [];
checkboxes.forEach(cb => {
const item = cb.closest('.notification-item');
const notificationId = item.getAttribute('data-id');
deletedNotifications.push(notificationId);
item.remove();
});
localStorage.setItem('deletedNotifications', JSON.stringify(deletedNotifications));
updateNotificationBadge();
});
});
}).catch(() => {
// No fallback notifications
const notificationList = document.getElementById('notification-list');
if (notificationList) {
notificationList.innerHTML = '';
// Update pagination controls
updatePaginationControls();
}
});

// Account form
document.getElementById('account-form').addEventListener('submit', function(e) {
e.preventDefault();
const existingSettings = JSON.parse(localStorage.getItem('accountSettings')) || {};
const accountSettings = {
...existingSettings,
fullname: document.getElementById('admin-fullname').value,
username: document.getElementById('admin-username').value,
fullname: document.getElementById('admin-gmail').value,
password: document.getElementById('admin-password').value
};
localStorage.setItem('accountSettings', JSON.stringify(accountSettings));
// Update profile avatar display if no profile pic
const avatarElement = document.getElementById('account-profile-avatar');
if (!accountSettings.profilePic && accountSettings.fullname) {
avatarElement.textContent = accountSettings.fullname.charAt(0).toUpperCase();
avatarElement.style.backgroundImage = '';
}
alert('Account settings saved!');
});
// Function to show save button when inputs change
function showSaveButton() {
document.getElementById('save-settings-btn').style.display = 'block';
}

// Function to update title preview
function updateTitlePreview() {
const siteTitle = document.getElementById('site-title').value || 'STI Archives';
document.getElementById('site-title-preview').textContent = siteTitle;
}

// Function to update favicon preview
function updateFaviconPreview(logoSrc) {
const faviconImg = document.getElementById('favicon-preview');
if (logoSrc) {
faviconImg.src = logoSrc;
}
}

// Add event listeners to inputs
document.getElementById('site-title').addEventListener('input', function() {
showSaveButton();
updateTitlePreview();
});
document.getElementById('site-favicon').addEventListener('change', function(e) {
showSaveButton();
const file = e.target.files[0];
if (file) {
const reader = new FileReader();
reader.onload = function(e) {
updateFaviconPreview(e.target.result);
};
reader.readAsDataURL(file);
}
});

// Settings form
document.getElementById('settings-form').addEventListener('submit', function(e) {
e.preventDefault();
const faviconFile = document.getElementById('site-favicon').files[0];
const settings = {
siteTitle: document.getElementById('site-title').value,
siteFavicon: faviconFile ? URL.createObjectURL(faviconFile) : null
};
localStorage.setItem('adminSettings', JSON.stringify(settings));

// Update page title immediately
document.title = 'Admin Panel | ' + settings.siteTitle;

// Update favicon if provided
if (settings.siteFavicon) {
const faviconLink = document.querySelector('link[rel="icon"]');
if (faviconLink) {
// Add timestamp to force browser refresh
faviconLink.href = settings.siteFavicon + '?t=' + Date.now();
}
// Update preview favicon
updateFaviconPreview(settings.siteFavicon);
}

// Hide save button after saving
document.getElementById('save-settings-btn').style.display = 'none';

alert('Settings saved!');
});
// Initialize - always default to dashboard on fresh page load
// Clear any saved section to ensure we start fresh
localStorage.removeItem('adminCurrentSection');
if (DEBUG) console.log('DEBUG: Initializing admin page - defaulting to dashboard');
showSection('dashboard');
// Set initial header padding and main-content margin for open sidebar
if (window.innerWidth >= 768) {
const marginValue = window.innerWidth >= 1025 ? '200px' : window.innerWidth >= 769 ? '220px' : '160px';
document.querySelector('.header').style.paddingLeft = marginValue;
document.getElementById('main-content').style.marginLeft = marginValue;
}
loadUsers().then(() => {
// Counts are now updated automatically when tables are populated
renderUserChart();
renderSigningUpChart();
renderDashboardUploadsChart();
renderGaugeChart('session-duration-gauge', 'Average Session Duration', 2.5, '#007bff');
}).catch(() => {
// Fallback if async fails
renderUserChart();
renderSigningUpChart();
renderDashboardUploadsChart();
});
// Clear the saved section after loading
localStorage.removeItem('adminCurrentSection');

// Hide all user subsections except the default verified section
document.querySelectorAll('.user-subsection').forEach(sub => {
if (sub.id !== 'verified-section') {
sub.style.display = 'none';
}
});

// Add event listener to toggle button
const toggleBtn = document.getElementById('toggle-btn');
if (toggleBtn) {
toggleBtn.addEventListener('click', toggleSidebar);
}


// === SEND UPDATE MODAL FUNCTIONS ===
function openSendUpdateModal(email, name) {
document.getElementById('update-email').value = email;
document.getElementById('update-subject').value = `Update for ${name}`;
document.getElementById('update-message').value = `Dear ${name},
[Enter reason, news, or update here]
Best regards,
STI Archives Admin`;
document.getElementById('send-update-modal').style.display = 'block';
}
function sendUpdateEmail() {
const email = document.getElementById('update-email').value;
const subject = document.getElementById('update-subject').value;
const message = document.getElementById('update-message').value;
if (!email || !subject || !message) {
alert('Please fill in all fields.');
return;
}
fetch('/send_update_email', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ to_email: email, subject: subject, message: message })
})
.then(response => response.json())
.then(result => {
if (result.message) {
alert('Email sent successfully!');
closeSendUpdateModal();
} else {
alert('Failed to send email: ' + (result.error || 'Unknown error'));
}
})
.catch(error => {
console.error('Error sending email:', error);
alert('Failed to send email. Please check your connection.');
});
}

function removeUser(userId, userName, event) {
if (confirm(`Are you sure you want to remove ${userName}'s information? This action cannot be undone.`)) {
// Track removed users for persistence
let removedUsers = JSON.parse(localStorage.getItem('removedUsers')) || [];
if (!removedUsers.includes(userId)) {
removedUsers.push(userId);
localStorage.setItem('removedUsers', JSON.stringify(removedUsers));
}

// Remove from localStorage
const users = JSON.parse(localStorage.getItem('users')) || [];
const updatedUsers = users.filter(user => (user.user_id || user.id) !== userId);
localStorage.setItem('users', JSON.stringify(updatedUsers));

// Remove the row from ALL tables that contain this user
// Find all rows with the matching user ID in any table
const allCheckboxes = document.querySelectorAll(`.user-checkbox[data-user-id="${userId}"]`);
allCheckboxes.forEach(checkbox => {
const row = checkbox.closest('tr');
if (row) {
row.remove();
}
});

// Also try to find and remove rows by looking for buttons with the specific onclick handler
// This catches any remaining rows that might have the userId in the onclick
const allRows = document.querySelectorAll('tr');
allRows.forEach(row => {
const removeButton = row.querySelector(`button[onclick*="removeUser('${userId}')"]`);
if (removeButton) {
row.remove();
}
});

// Also try server-side removal
fetch('/api/users/remove', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ user_id: userId })
})
.then(response => response.json())
.then(result => {
if (result.message) {
if (DEBUG) console.log('User removed from server successfully');
} else {
console.error('Failed to remove from server:', result.error);
}
})
.catch(error => {
console.error('Error removing user from server:', error);
});

alert('User removed successfully!');
}
}
function closeSendUpdateModal() {
document.getElementById('send-update-modal').style.display = 'none';
}

// Filter Modal Functions


function getStatus(user) {
if (user.verified) return 'Verified';
if (user.banned) return 'Banned';
if (user.role === 'admin') return 'Active';
// For signing up
if (!user.created_at) return 'N/A';
const now = new Date();
const created = new Date(user.created_at);
const diffMs = now - created;
const diffHours = diffMs / (1000 * 60 * 60);
if (diffHours < 1) {
return 'Just now';
} else {
return 'Pending';
}
}

// === LOAD USERS FUNCTION ===

// Helper function to get user status (supports new boolean columns and legacy fallback)
function getUserStatus(user) {
// Check new boolean columns first
if (user.new_user === true) return 'pending';
if (user.banned === true) return 'banned';
if (user.rejected_user === true) return 'rejected';
if (user.verified === true) return 'approved';

// Fallback to legacy boolean logic for backward compatibility
if (user.verified && !user.banned && !user.rejected) return 'approved';
if (user.banned) return 'banned';
if (user.rejected) return 'rejected';
return 'pending';
}

async function loadUsers() {
if (DEBUG) console.log('DEBUG: loadUsers called');

// Save checkbox states before re-rendering
const savedCheckboxStates = {};
document.querySelectorAll('.user-checkbox').forEach(cb => {
const userId = cb.getAttribute('data-user-id');
if (userId) {
savedCheckboxStates[userId] = cb.checked;
}
});

try {
users = await getUsers();
if (DEBUG) console.log('DEBUG: getUsers returned:', users);
} catch (error) {
console.error('DEBUG: Error loading users:', error);
users = JSON.parse(localStorage.getItem('users')) || [];
if (DEBUG) console.log('DEBUG: Fallback to localStorage users:', users);
}
if (!Array.isArray(users)) users = [];
if (DEBUG) console.log('DEBUG: loadUsers got users, count:', users.length);
const removedUsers = JSON.parse(localStorage.getItem('removedUsers')) || [];
const filteredUsers = (users || []).filter(user => !removedUsers.includes(user.id));
if (DEBUG) console.log('DEBUG: filteredUsers count:', filteredUsers.length);
// Set global users
window.users = filteredUsers; // Or assign to global users
// Map fields for display - handle all field variations
filteredUsers.forEach(user => {
// Handle grade field variations
user.grade = user.grade || user.Grade || user.year_level || '-';

// Sec_Degr contains:
// - For SHS: strand values (ABM, ITMAWD, STEM)
// - For College: degree values (BSBA, BSCS, BSIT)
user.Sec_Degr = user.Sec_Degr || user.sec_degr || user.strand || user.section || user.course || '-';
});
// Clear all tbodys
document.querySelectorAll('#users tbody').forEach(tbody => tbody.innerHTML = '');
let signingUpUsers = [];
filteredUsers.forEach(user => {
if (DEBUG) console.log('DEBUG: Processing user:', user.id, user.name, user.role, user.email, user.personal_email, user.verified, user.isActive);
const date = formatDate(user.verified_at || user.created_at);
let actions = '';
const userId = user.user_id || user.id;
if (user.verified) {
actions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button>
</div>
`;
} else if (user.banned) {
actions = `
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${user.id}', 'accept')">Accept</button>
<button class="btn btn-warning btn-sm" onclick="updateUserStatus('${user.user_id || user.id}', 'reject')">Reject</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${user.id}', 'ban')">Ban</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${user.id}', '${user.name}')">Remove</button>
`;
} else {
actions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button>
</div>
`;
}
let emailToUse = user.personal_email || user.email;
const rowWithEmail = `<tr>
<td><input type="checkbox" class="user-checkbox" data-user-id="${user.user_id || user.id}"></td>
<td>${user.user_id || user.id}</td>
<td>${getUserName(user)}</td>
<td>${emailToUse}</td>
<td>${formatRole(user.role)}</td>
<td>${user.grade || '-'}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>
<div style="display: flex; align-items: center; gap: 5px;">
<span>${user.raf_path || ''} ${user.educator_id || ''}</span>
<button class="btn btn-sm btn-info" onclick="previewUserDocs('${user.user_id || user.id}')">Preview</button>
</div>
</td>
<td>${actions}</td>
</tr>`;
const rowWithoutEmail = `<tr>
<td><input type="checkbox" class="user-checkbox" data-user-id="${user.user_id || user.id}"></td>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${user.role}</td>
<td>${user.grade || '-'}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>
<div style="display: flex; align-items: center; gap: 5px;">
<span>${user.raf_path || ''} ${user.educator_id || ''}</span>
<button class="btn btn-sm btn-info" onclick="previewUserDocs('${user.user_id || user.id}')">Preview</button>
</div>
</td>
<td>${actions}</td>
</tr>`;
// categorized
let tbodyId = '';
if (user.role === 'senior_high') {
const grade = user.grade === 'Grade 11' ? 'gr11' : 'gr12';
const strand = user.strand ? user.strand.toLowerCase().replace(' ', '') : 'abm';
tbodyId = grade + '-' + strand + '-tbody';
} else if (user.role === 'college') {
const program = user.section ? user.section.toLowerCase() : 'bsba';
tbodyId = program + '-tbody';
} else if (user.role === 'educator') {
const dept = user.section === 'Department SHS' ? 'shs' : 'college';
tbodyId = 'educator-' + dept + '-tbody';
}
if (tbodyId) {
const tbody = document.getElementById(tbodyId);
if (tbody) {
tbody.innerHTML += rowWithEmail;
}
}
// status - check admin role first (case-insensitive)
const roleLower = (user.role || '').toLowerCase();
if (DEBUG) console.log('DEBUG: User role check:', user.fullname, 'role:', user.role, 'roleLower:', roleLower, 'user_type:', user.user_type, 'verified:', user.verified);
const isAdminRole = roleLower === 'admin' || roleLower === 'coadmin' || roleLower === 'subadmin' || roleLower === 'Admin' || roleLower === 'Co-Admin' || roleLower === 'Sub-Admin';
const isAdminByName = user.fullname && user.fullname.toLowerCase().includes('admin');
if (DEBUG) console.log('DEBUG: isAdminRole:', isAdminRole, 'isAdminByName:', isAdminByName);
if (isAdminRole || isAdminByName) {
if (DEBUG) console.log('DEBUG: Adding admin user to table:', user.fullname, user.email, 'role:', roleLower);
// Determine role display based on role field or specific user names
let roleDisplay;
if (user.fullname === 'admin2' || user.fullname === 'Admin2') {
roleDisplay = 'Co-Admin';
} else if (user.fullname === 'admin3' || user.fullname === 'Admin3') {
roleDisplay = 'Sub-Admin';
} else {
roleDisplay = (roleLower === 'coadmin' ? 'Co-Admin' : roleLower === 'subadmin' ? 'Sub-Admin' : 'Admin');
}
let badgeClass;
let permissions;
if (user.fullname === 'admin2' || user.fullname === 'Admin2') {
badgeClass = 'badge-coadmin';
permissions = 'Limited Access - User & File Management';
} else if (user.fullname === 'admin3' || user.fullname === 'Admin3') {
badgeClass = 'badge-subadmin';
permissions = 'User Approver - Accept/Reject Registrations';
} else {
badgeClass = roleLower === 'coadmin' ? 'badge-coadmin' : roleLower === 'subadmin' ? 'badge-subadmin' : 'badge-admin';
permissions = user.permissions || (roleLower === 'admin' ? 'Full Access - All Features' : roleLower === 'coadmin' ? 'Limited Access - User & File Management' : roleLower === 'subadmin' ? 'User Approver - Accept/Reject Registrations' : 'Full Access');
}
const adminRow = `<tr>
<td><input type="checkbox" class="user-checkbox" data-user-id="${user.id}"></td>
<td>${user.user_id || user.id}</td>
<td>${getUserName(user)}</td>
<td>${user.email || 'N/A'}</td>
<td><span class="badge ${badgeClass}">${roleDisplay}</span></td>
<td>${permissions}</td>
<td>${formatDate(user.created_at)}</td>
<td>
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${user.user_id || user.id}')">Edit</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}', '${getUserName(user)}')">Remove</button>
</div>
</td>
</tr>`;
document.getElementById('admins-tbody').innerHTML += adminRow;
} else {
const userStatus = getUserStatus(user);
if (userStatus === 'approved') {
if (DEBUG) console.log('DEBUG: Adding verified user to table:', user.name, user.email, user.personal_email);
document.getElementById('verified-users-tbody').innerHTML += rowWithEmail;
} else if (userStatus === 'banned') {
document.getElementById('banned-users-tbody').innerHTML += rowWithEmail;
} else if (userStatus === 'pending') {
signingUpUsers.push(user);
}
}
});

// Add signing-up users to the table
if (DEBUG) console.log('DEBUG: Rendering signingUpUsers, count:', signingUpUsers.length);
signingUpUsers.forEach(user => {
if (DEBUG) console.log('DEBUG: Rendering signing-up user:', user.name, 'role:', user.role, 'section:', user.section, 'grade:', user.grade, 'personal_email:', user.personal_email);
const date = formatDate(user.created_at);
let actions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${user.id}', 'accept')">Accept</button>
<button class="btn btn-warning btn-sm" onclick="openRejectModal('${user.id}')">Reject</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${user.id}', 'ban')">Ban</button>
</div>
`;
let emailToUse = user.personal_email || user.email;
const row = `<tr>
<td><input type="checkbox" class="user-checkbox" data-user-id="${user.id}"></td>
<td>${user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${formatRole(user.role)}</td>
<td>${user.grade || '-'}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>
<div style="display: flex; align-items: center; gap: 5px;">
<span>${user.raf_path || ''} ${user.educator_id || ''}</span>
<button class="btn btn-sm btn-info" onclick="previewUserDocs('${user.id}')">Preview</button>
</div>
</td>
<td>${actions}</td>
</tr>`;
document.getElementById('signing-up-users-tbody').innerHTML += row;
});

// Paginate tables
paginateTable('admins-tbody', 10);
paginateTable('verified-users-tbody', 10);
paginateTable('signing-up-users-tbody', 10);
paginateTable('banned-users-tbody', 10);

// Reapply current filters after reload
for (const section in currentFilters) {
const f = currentFilters[section];
if (f.role) {
document.getElementById(`role-filter-${section}`).value = f.role;
updateFilters(section);
}
if (f.search) {
const searchInput = document.querySelector(`#${section}-section input[onkeyup*="filterTable"]`);
if (searchInput) searchInput.value = f.search;
document.getElementById(`search-filter-${section}`).value = f.filterType;
filterTable(f.search, section, f.filterType);
}
}

updateDashboardCounts();

// Update dashboard counts by counting actual table rows
// This ensures counts always match what's displayed

// Count rows in verified users table (tbody)
const verifiedTbody = document.getElementById('verified-users-tbody');
const usersCount = verifiedTbody ? verifiedTbody.querySelectorAll('tr').length : 0;

// Count rows in admin users table (tbody)
const adminTbody = document.getElementById('admins-tbody');
const adminCount = adminTbody ? adminTbody.querySelectorAll('tr').length : 0;

// Count signing up users: use same logic as signingUpUsers array
const filteredForCount = users.filter(u => !removedUsers.includes(u.user_id || u.id));
const signingUpCount = filteredForCount.filter(u => getUserStatus(u) === 'pending').length;

if (DEBUG) console.log('DEBUG: Table row counts - Users:', usersCount, 'Admin:', adminCount, 'Signing up:', signingUpCount);
document.getElementById('verified-users-count').textContent = usersCount;
document.getElementById('admin-users-count').textContent = adminCount;
document.getElementById('signing-up-users-count').textContent = signingUpCount;

// Update pending requests badge
const pendingBadge = document.getElementById('pending-requests-badge');
if (pendingBadge) {
pendingBadge.textContent = signingUpCount;
pendingBadge.style.display = signingUpCount > 0 ? 'flex' : 'none';
}

// Restore checkbox states after re-rendering
Object.keys(savedCheckboxStates).forEach(userId => {
const checkbox = document.querySelector(`.user-checkbox[data-user-id="${userId}"]`);
if (checkbox) {
checkbox.checked = savedCheckboxStates[userId];
}
});
}

// === LOAD ADMINS FUNCTION ===
// This function is no longer needed - admins are loaded by loadUsers
async function loadAdmins() {
// Admins are now handled by loadUsers function
// This function is kept for backward compatibility but does nothing
if (DEBUG) console.log('loadAdmins called - admins are loaded by loadUsers');
}

async function renderUserChart() {
// Example data for demonstration
const exampleData = {
shs: 150,
college: 80,
educator: 25,
admin: 5
};
const barColors = [
'#008000', // SHS Emerald Green
'#00008B', // College Deep Blue
'#FFA500', // Teacher Warm Orange
'#8A2BE2'  // Admin Cool Purple
];
const labels = ['SHS', 'COLLEGE', 'TEACHER', 'ADMIN'];
const ctx = document.getElementById('user-chart').getContext('2d');
if (window.userChart) {
window.userChart.destroy();
}
const isDarkMode = document.body.classList.contains('dark-mode');
const textColor = isDarkMode ? '#ffffff' : '#000000';
window.userChart = new Chart(ctx, {
type: 'bar',
data: {
labels: labels,
datasets: [{
data: [exampleData.shs, exampleData.college, exampleData.educator, exampleData.admin],
backgroundColor: barColors,
borderColor: barColors,
borderWidth: 1
}]
},
options: {
responsive: true,
plugins: {
legend: {
display: false
}
},
scales: {
x: {
ticks: {
color: textColor
}
},
y: {
beginAtZero: true,
max: 400,
ticks: {
color: textColor
}
}
}
}
});
}


function renderSigningUpChart(period = 'day', filter = null) {
if (DEBUG) console.log('DEBUG: Rendering signing up chart');
const ctx = document.getElementById('signing-up-chart').getContext('2d');
if (window.signingUpChart) {
window.signingUpChart.destroy();
}
let users = JSON.parse(localStorage.getItem('users')) || [];
if (!Array.isArray(users)) {
users = [];
}
let filteredUsers = users.filter(user => !user.verified && !user.rejected && !user.banned);
if (filter) {
filteredUsers = filteredUsers.filter(user => user.role === filter);
}
const now = new Date();
let labels = [];
let data = [];
if (period === 'day') {
// Last 7 days
for (let i = 6; i >= 0; i--) {
const date = new Date(now);
date.setDate(now.getDate() - i);
const dateStr = date.toISOString().split('T')[0];
labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
const count = filteredUsers.filter(user => user.created_at && user.created_at.split('T')[0] === dateStr).length;
data.push(count);
}
} else if (period === 'month') {
// Last 12 months
for (let i = 11; i >= 0; i--) {
const date = new Date(now);
date.setMonth(now.getMonth() - i);
const monthStr = date.toISOString().slice(0, 7);
labels.push(date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
const count = filteredUsers.filter(user => user.created_at && user.created_at.slice(0, 7) === monthStr).length;
data.push(count);
}
}
window.signingUpChart = new Chart(ctx, {
type: 'line',
data: {
labels: labels,
datasets: [{
label: 'Sign-ups',
data: data,
borderColor: '#007bff',
backgroundColor: 'rgba(0, 123, 255, 0.1)',
borderWidth: 2,
fill: true
}]
},
options: {
responsive: true,
scales: {
y: {
beginAtZero: true
}
}
}
});
}


function renderDashboardUploadsChart() {
const ctx = document.getElementById('dashboard-uploadsChart').getContext('2d');
if (window.dashboardUploadsChart) {
window.dashboardUploadsChart.destroy();
}

const barColors = [
'#8A2BE2', // Admin Cool Purple
'#FFA500', // Teacher Warm Orange
'#008000', // SHS Emerald Green
'#00008B'  // College Deep Blue
];
const labels = ['ADMIN', 'TEACHER', 'SHS', 'COLLEGE'];
const data = [1, 1, 1, 1]; // Demo data
const total = data.reduce((a, b) => a + b, 0);
const percentageData = data.map(d => (d / total) * 100);

window.dashboardUploadsChart = new Chart(ctx, {
type: 'doughnut',
data: {
labels: labels,
datasets: [{
data: percentageData,
backgroundColor: barColors,
borderWidth: 1
}]
},
options: {
responsive: true,
plugins: {
legend: {
display: true
},
tooltip: {
callbacks: {
label: function(context) {
return context.label + ': ' + context.parsed + '%';
}
}
}
}
}
});
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
const adminEl = document.getElementById('admin-users-count');
const signingUpEl = document.getElementById('signing-up-users-count');

if (verifiedEl) verifiedEl.textContent = countData.counts.usersCount || 0;
if (adminEl) adminEl.textContent = countData.counts.adminUsers || 0;
if (signingUpEl) signingUpEl.textContent = countData.counts.newSignups || 0;
}
}
} catch (error) {
console.warn('Failed to fetch total user counts, falling back to local data:', error);
// Fallback to local calculation
if (!Array.isArray(users)) users = [];
const usersCount = users.filter(u => getUserStatus(u) === 'approved').length;
const adminCount = users.filter(u => ['admin', 'coadmin', 'subadmin'].includes(u.role)).length;
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

// === STUB FUNCTIONS (to prevent errors) ===
function toggleSidebar() {
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const mainContent = document.getElementById('main-content');
const header = document.querySelector('.header');
const body = document.body;
// Check if mobile view
if (window.innerWidth <= 767) {
// Mobile: toggle overlay and sidebar
sidebar.classList.toggle('open');
overlay.classList.toggle('show');
} else {
// Desktop/tablet: collapse sidebar
sidebar.classList.toggle('collapsed');
const isCollapsed = sidebar.classList.contains('collapsed');
const marginValue = window.innerWidth >= 1025 ? '200px' : window.innerWidth >= 769 ? '220px' : window.innerWidth >= 768 ? '160px' : '0';
const paddingValue = isCollapsed ? '20px' : marginValue;
if (isCollapsed) {
mainContent.style.marginLeft = '0';
header.style.paddingLeft = paddingValue;
body.classList.add('sidebar-collapsed');
} else {
mainContent.style.marginLeft = marginValue;
header.style.paddingLeft = paddingValue;
body.classList.remove('sidebar-collapsed');
}
}
}

function toggleDarkMode() {
document.body.classList.toggle('dark-mode');
const darkModeToggle = document.querySelector('.dark-mode-toggle');
const toggleBtn = darkModeToggle ? darkModeToggle.querySelector('i') : null;
if (document.body.classList.contains('dark-mode')) {
if (toggleBtn) {
toggleBtn.className = 'fas fa-sun';
toggleBtn.style.color = '#FFD700';
}
localStorage.setItem('darkMode', 'on');
} else {
if (toggleBtn) {
toggleBtn.className = 'fas fa-moon';
toggleBtn.style.color = '#777';
}
localStorage.setItem('darkMode', 'off');
}
}

const closeDropdownOnOutsideClick = function(e) {
if (!e.target.closest('.dropdown')) {
document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('show'));
document.querySelectorAll('.dropdown-content').forEach(dd => dd.classList.remove('show'));
document.removeEventListener('click', closeDropdownOnOutsideClick);
}
};

const toggleDropdown = function(dropdownId) {
// Close all dropdowns first
document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('show'));
document.querySelectorAll('.dropdown-content').forEach(dd => dd.classList.remove('show'));
// Open the clicked dropdown
const dropdown = document.getElementById(dropdownId).parentElement;
dropdown.classList.toggle('show');
// Add event listener to close dropdown when clicking outside
if (dropdown.classList.contains('show')) {
setTimeout(() => {
document.addEventListener('click', closeDropdownOnOutsideClick);
}, 1);
}
}


function setPeriod(period) {
currentPeriod = period;
// Only remove active from period buttons (inside dropdowns)
document.querySelectorAll('.dropdown .filter-btn').forEach(btn => btn.classList.remove('active'));
document.querySelectorAll('.dropdown-content').forEach(dd => dd.classList.remove('show'));
// Find the parent button and make it active
const button = event.target.closest('.dropdown').querySelector('.filter-btn');
button.classList.add('active');
button.innerHTML = period.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' <i class="fas fa-chevron-down"></i>';
// Reset the other button to default
const isWeek = event.target.closest('.dropdown').querySelector('#week-dropdown') !== null;
if (isWeek) {
const monthButton = document.querySelector('#month-dropdown').parentElement.querySelector('.filter-btn');
monthButton.innerHTML = 'Month <i class="fas fa-chevron-down"></i>';
} else {
const weekButton = document.querySelector('#week-dropdown').parentElement.querySelector('.filter-btn');
weekButton.innerHTML = 'Week <i class="fas fa-chevron-down"></i>';
}
}

function setCategory(category) {
currentCategory = category;
// Only remove active from category buttons (not dropdowns)
document.querySelectorAll('.filter-buttons button:not(.dropdown .filter-btn)').forEach(btn => btn.classList.remove('active'));
event.target.classList.add('active');
}

// Handle sidebar link clicks with inline onclick
function handleSidebarClick(event, section) {
event.preventDefault();
if (DEBUG) console.log('DEBUG: handleSidebarClick called with:', section);

// Remove active class from all sidebar links
document.querySelectorAll('.sidebar ul li').forEach(li => {
li.classList.remove('active');
});

// Add active class to clicked link's parent li
event.target.closest('li').classList.add('active');

showSection(section);
}

function showSection(sectionId) {
if (DEBUG) console.log('DEBUG: showSection called with:', sectionId);

try {
// Check if element exists before trying to modify it
const targetSection = document.getElementById(sectionId);
if (!targetSection) {
console.error('DEBUG: Section not found:', sectionId);
alert('Error: Section "' + sectionId + '" not found');
return;
}

// Remove active class and hide ALL content sections
document.querySelectorAll('.content-section').forEach(s => {
s.classList.remove('active');
s.style.display = 'none'; // Force hide
if (DEBUG) console.log('DEBUG: Removed active from:', s.id);
});

// Add active class to target section and show it
targetSection.classList.add('active');
targetSection.style.display = 'block'; // Force show
if (DEBUG) console.log('DEBUG: Added active to:', sectionId);
} catch (e) {
console.error('DEBUG: Error in showSection:', e);
alert('Error switching section: ' + e.message);
}

document.getElementById('page-title').textContent =
sectionId === 'dashboard' ? 'Dashboard' :
sectionId === 'upload' ? 'Upload' :
sectionId === 'users' ? 'Users Management' :
sectionId === 'profile' ? 'Profile' :
sectionId === 'settings' ? 'Settings' :
'Notifications';
// Reset upload section to default (PDF Upload) when navigating to upload
if (sectionId === 'upload') {
// Reset to PDF Upload form (default)
document.querySelectorAll('.upload-subsection').forEach(sub => sub.classList.remove('active'));
document.getElementById('upload-form-section').classList.add('active');
// Reset buttons to PDF Upload as active
document.querySelectorAll('.upload-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
document.getElementById('btn-pdf-upload').classList.add('active');
}
if (sectionId === 'dashboard') {
// Dashboard counts are updated when tables are populated
setTimeout(() => {
renderUserChart();
renderSigningUpChart();
renderDashboardUploadsChart();
renderGaugeChart('session-duration-gauge', 'Average Session Duration', 2.5, '#007bff');
}, 100);
}
}

// Add event listeners for sidebar navigation
document.querySelectorAll('.sidebar a[data-section]').forEach(link => {
link.addEventListener('click', function(event) {
event.preventDefault();
const section = this.getAttribute('data-section');
handleSidebarClick(event, section);
});
});

// Add event listener for profile avatar
const avatarRow = document.querySelector('.avatar-name-row[data-section]');
if (avatarRow) {
avatarRow.addEventListener('click', function() {
const section = this.getAttribute('data-section');
showSection(section);
});
}

function toggleProfileDropdown() {
const dropdown = document.getElementById('profile-dropdown');
const isOpen = dropdown.classList.contains('open');
dropdown.classList.toggle('open');
if (!isOpen) {
// Add listener to close on outside click
setTimeout(() => {
document.addEventListener('click', closeProfileDropdownOnOutsideClick);
}, 1);
}
}

function toggleAdminDropdown() {
const dropdown = document.querySelector('.admin-dropdown');
const isOpen = dropdown.classList.contains('open');
dropdown.classList.toggle('open');
if (!isOpen) {
// Add listener to close on outside click
setTimeout(() => {
document.addEventListener('click', closeAdminDropdownOnOutsideClick);
}, 1);
}
}

function closeAdminDropdownOnOutsideClick(e) {
const dropdown = document.querySelector('.admin-dropdown');
const btn = document.querySelector('.admin-btn');
if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
dropdown.classList.remove('open');
document.removeEventListener('click', closeAdminDropdownOnOutsideClick);
}
}

function toggleSidebarProfileDropdown() {
const dropdown = document.querySelector('.sidebar-profile-menu');
const isOpen = dropdown.classList.contains('open');
dropdown.classList.toggle('open');
if (!isOpen) {
// Add listener to close on outside click
setTimeout(() => {
document.addEventListener('click', closeSidebarProfileDropdownOnOutsideClick);
}, 1);
}
}

function closeSidebarProfileDropdownOnOutsideClick(e) {
const dropdown = document.querySelector('.sidebar-profile-menu');
const adminInfo = document.querySelector('.admin-info');
if (!dropdown.contains(e.target) && !adminInfo.contains(e.target)) {
dropdown.classList.remove('open');
document.removeEventListener('click', closeSidebarProfileDropdownOnOutsideClick);
}
}

function closeProfileDropdownOnOutsideClick(e) {
const dropdown = document.getElementById('profile-dropdown');
const btn = document.querySelector('.profile-btn');
if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
dropdown.classList.remove('open');
document.removeEventListener('click', closeProfileDropdownOnOutsideClick);
}
}

function closeSidebarOnOverlayClick() {
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
sidebar.classList.remove('open');
overlay.classList.remove('show');
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

function updatePaginationControls() {
const paginationControls = document.getElementById('pagination-controls');
const pageNumbersContainer = document.getElementById('page-numbers');

if (!window.notificationPagination) return;

const { currentPage, totalPages, notifications } = window.notificationPagination;

// Show/hide pagination controls - only show if notifications exceed 10
if (notifications.length > 10) {
paginationControls.style.display = 'flex';
} else {
paginationControls.style.display = 'none';
}

// Clear existing page numbers
pageNumbersContainer.innerHTML = '';

// Create page number buttons
for (let i = 1; i <= totalPages; i++) {
const pageBtn = document.createElement('button');
pageBtn.className = 'page-number';
pageBtn.textContent = i;

if (i === currentPage) {
pageBtn.classList.add('active');
}

pageBtn.addEventListener('click', function() {
goToPage(i);
});

pageNumbersContainer.appendChild(pageBtn);
}
}

function goToPage(page) {
if (!window.notificationPagination) return;

const { totalPages, itemsPerPage, notifications } = window.notificationPagination;

if (page < 1 || page > totalPages) return;

window.notificationPagination.currentPage = page;

// Re-render notifications for the new page
const allNotificationsContainer = document.getElementById('all-notifications-list');
if (allNotificationsContainer) {
allNotificationsContainer.innerHTML = '';
const readNotifications = JSON.parse(localStorage.getItem('readNotifications')) || [];

const startIndex = (page - 1) * itemsPerPage;
const endIndex = Math.min(startIndex + itemsPerPage, notifications.length);

for (let i = endIndex - 1; i >= startIndex; i--) {
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
<div class="notification-time">${formatNotificationDate(notif.time)}</div>
</div>
<div class="notification-actions">
<i class="fas ${isRead ? 'fa-check' : 'fa-times'}" title="${isRead ? 'Mark as Unread' : 'Mark as Read'}" onclick="${isRead ? 'markNotificationUnread' : 'markNotificationRead'}(this)"></i>
</div>
`;
allNotificationsContainer.insertBefore(notifDiv, allNotificationsContainer.firstChild);
}
}

updatePaginationControls();
}

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

function showUploadSection(section, btnElement) {
// Hide all upload subsections
document.querySelectorAll('.upload-subsection').forEach(sub => sub.classList.remove('active'));
// Show the selected section
if (section === 'pdf-form') {
document.getElementById('upload-form-section').classList.add('active');
} else if (section === 'image-form') {
document.getElementById('image-form-section').classList.add('active');
} else if (section === 'admin') {
document.getElementById('admin-uploads-section').classList.add('active');
// Force re-render of admin uploads section to ensure articles display correctly
const adminContainer = document.getElementById('admin-uploaded-articles');
const currentContent = adminContainer.innerHTML;
// Temporarily clear and re-fetch articles
loadArticlesFromServerForAdmin();
} else if (section === 'users') {
document.getElementById('user-uploads-section').classList.add('active');
} else if (section === 'carousel') {
document.getElementById('carousel-section').classList.add('active');
// Load carousel items and articles for PDF selection
showCarouselItemsList();
loadArticlesForCarouselSelect();
}
// Update nav button active state - remove all active first
document.querySelectorAll('.upload-nav .nav-btn').forEach(btn => btn.classList.remove('active'));

// Add active to the correct button based on section
if (section === 'pdf-form') {
document.getElementById('btn-pdf-upload').classList.add('active');
} else if (section === 'admin') {
document.getElementById('btn-admin-uploads').classList.add('active');
} else if (section === 'users') {
document.getElementById('btn-user-uploads').classList.add('active');
} else if (section === 'carousel') {
document.getElementById('btn-carousel').classList.add('active');
}
}

// Add event listeners for upload navigation buttons
document.querySelectorAll('.upload-nav .nav-btn[data-section]').forEach(btn => {
btn.addEventListener('click', function() {
const section = this.getAttribute('data-section');
showUploadSection(section, this);
});
});

// Load articles from server specifically for admin uploads section
function loadArticlesFromServerForAdmin() {
fetch('/api/articles')
.then(response => response.json())
.then(data => {
// Handle both 'success' (new) and 'status' (old) response formats
const isSuccess = data.status === 'success' || data.success === true;
if (isSuccess) {
const articles = data.articles || [];
// Save to localStorage for other functions that might need it
localStorage.setItem('allArticles', JSON.stringify(articles));
localStorage.setItem('adminArticles', JSON.stringify(articles));
// Render the articles in admin uploads section
renderAdminUploadsFromServer(articles);
} else {
console.error('âœ— Failed to load articles:', data.error || 'Unknown error');
document.getElementById('admin-uploaded-articles').innerHTML = '<p class="empty-state">Failed to load articles</p>';
}
})
.catch(error => {
console.error('Error loading articles:', error);
document.getElementById('admin-uploaded-articles').innerHTML = '<p class="empty-state">Error loading articles</p>';
});
}

// Render articles in admin uploads section
function renderAdminUploadsFromServer(articles) {
const container = document.getElementById('admin-uploaded-articles');
if (!articles || articles.length === 0) {
container.innerHTML = '<p class="empty-state">No articles found.</p>';
return;
}

// Clear container first
container.innerHTML = '';

// Use the original createArticleTemplate function for proper formatting
articles.forEach(article => {
const articleElement = createArticleTemplate(article);
container.appendChild(articleElement);
});
}

function viewAdminArticle(id) {
window.open('/library.html?article=' + id, '_blank');
}

function deleteAdminArticle(id) {
if (confirm('Are you sure you want to delete this article?')) {
fetch('/api/articles/' + id, { method: 'DELETE' })
.then(response => response.json())
.then(data => {
if (data.status === 'success') {
alert('Article deleted successfully!');
loadArticlesFromServerForAdmin();
} else {
alert('Failed to delete article: ' + data.error);
}
})
.catch(error => {
console.error('Error deleting article:', error);
alert('Error deleting article');
});
}
}

function showUploadForm() {
showSection('upload');
showUploadSection('upload-form');
}

function showUploaded(type) {
showSection('upload');
showUploadSection(type + '-uploads');
}

function showUserCategory(type) {
// Hide all spec sections
document.getElementById('shs-spec').style.display = 'none';
document.getElementById('college-spec').style.display = 'none';
document.getElementById('educator-spec').style.display = 'none';
// Show selected spec section
document.getElementById(type + '-spec').style.display = 'block';
}



async function loadStrandUsersForStatus(status, grade, strand) {
const users = await getUsers();
const tbody = document.getElementById(status + '-strand-users-tbody');
tbody.innerHTML = '';
const statusFilter = status === 'signing-up' ? !user.verified && !user.rejected && !user.banned :
status === 'banned' ? user.banned : false;
users.forEach(user => {
if (user.role === 'senior_high' && user.grade === 'Grade ' + grade && user.strand === strand && statusFilter) {
const date = formatDate(status === 'verified' ? user.verified_at : user.created_at);
const dateHeader = status === 'signing-up' ? 'Date Signed Up' : 'Date Banned';
let emailToUse = user.personal_email || user.email;
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${user.role}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>${user.raf_path || ''} / ${user.educator_id || ''}</td>
<td>
<div style="display: flex; flex-direction: column; gap: 4px;">
<button type="button" class="btn btn-success btn-sm" onclick="acceptUser('${user.user_id || user.id}')">Accept</button>
<button type="button" class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button>
</div>
</td>
</tr>`;
tbody.innerHTML += row;
}
});
}

async function loadDegreeUsersForStatus(status, degree) {
const users = await getUsers();
const tbody = document.getElementById(status + '-degree-users-tbody');
tbody.innerHTML = '';
const statusFilter = status === 'signing-up' ? !user.verified && !user.rejected && !user.banned :
status === 'banned' ? user.banned : false;
users.forEach(user => {
if (user.role === 'college' && user.section === degree.toUpperCase() && statusFilter) {
const date = formatDate(status === 'verified' ? user.verified_at : user.created_at);
let emailToUse = user.personal_email || user.email;
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${user.role}</td>
<td>${date}</td>
<td><button class="btn btn-sm" onclick="previewRaf('${user.raf_path || ''}')">Preview</button></td>
<td>
<div style="display: flex; flex-direction: column; gap: 4px;">
<button type="button" class="btn btn-success btn-sm" onclick="acceptUser('${user.user_id || user.id}')">Accept</button>
<button type="button" class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button>
</div>
</td>
</tr>`;
tbody.innerHTML += row;
}
});
}

async function loadDepartmentUsersForStatus(status, dept) {
const users = await getUsers();
const tbody = document.getElementById(status + '-department-users-tbody');
tbody.innerHTML = '';
const statusFilter = status === 'signing-up' ? !user.verified && !user.rejected && !user.banned :
status === 'banned' ? user.banned : false;
users.forEach(user => {
if (user.role === 'educator' && user.section === 'Department ' + dept.toUpperCase() && statusFilter) {
const date = formatDate(status === 'verified' ? user.verified_at : user.created_at);
let emailToUse = user.personal_email || user.email;
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${emailToUse}</td>
<td>${user.role}</td>
<td>${user.raf_path || ''} / ${user.educator_id || ''}</td>
<td>
<button type="button" class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button>
</td>
</tr>`;
tbody.innerHTML += row;
}
});
}

function showGrade(grade) {
document.getElementById('grade-selection').style.display = 'block';
document.getElementById('grade-title').textContent = 'Grade ' + grade;
document.getElementById('grade-selection').dataset.grade = grade;
}

function showStrand(strand) {
const grade = document.getElementById('grade-selection').dataset.grade;
document.getElementById('strand-table').style.display = 'block';
document.getElementById('strand-title').textContent = 'Grade ' + grade + ' - ' + strand.toUpperCase();
loadStrandUsers(grade, strand);
}

function showDegree(degree) {
document.getElementById('degree-table').style.display = 'block';
document.getElementById('degree-title').textContent = degree.toUpperCase();
loadDegreeUsers(degree);
}

function showDepartment(dept) {
document.getElementById('department-table').style.display = 'block';
document.getElementById('department-title').textContent = 'Department ' + dept.toUpperCase();
loadDepartmentUsers(dept);
}

async function loadStrandUsers(grade, strand) {
const users = await getUsers();
const tbody = document.getElementById('strand-users-tbody');
tbody.innerHTML = '';
users.forEach(user => {
if (user.role === 'senior_high' && user.grade === 'Grade ' + grade && user.strand === strand) {
const date = formatDate(user.verified ? user.verified_at : user.created_at);
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${user.email}</td>
<td>${user.role}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>${user.raf_path || ''} / ${user.educator_id || ''}</td>
<td>${getStrandDegree(user)}</td>
<td>
<div style="display: flex; flex-direction: column; gap: 4px;">
<button type="button" class="btn btn-success btn-sm" onclick="acceptUser('${user.user_id || user.id}')">Accept</button>
<button type="button" class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button>
</div>
</td>
</tr>`;
tbody.innerHTML += row;
}
});
}

async function loadDegreeUsers(degree) {
const users = await getUsers();
const tbody = document.getElementById('degree-users-tbody');
tbody.innerHTML = '';
users.forEach(user => {
if (user.role === 'college' && user.section === degree.toUpperCase()) {
const date = formatDate(user.verified ? user.verified_at : user.created_at);
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${user.email}</td>
<td>${user.role}</td>
<td>${user.Sec_Degr || '-'}</td>
<td>${date}</td>
<td>${getStatus(user)}</td>
<td>${user.raf_path || ''} / ${user.educator_id || ''}</td>
<td>${getStrandDegree(user)}</td>
<td><button type="button" class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button></td>
</tr>`;
tbody.innerHTML += row;
}
});
}

async function loadDepartmentUsers(dept) {
const users = await getUsers();
const tbody = document.getElementById('department-users-tbody');
tbody.innerHTML = '';
users.forEach(user => {
if (user.role === 'educator' && user.section === 'Department ' + dept.toUpperCase()) {
const date = formatDate(user.verified ? user.verified_at : user.created_at);
const row = `<tr>
<td>${user.user_id || user.id}</td>
<td>${user.name}</td>
<td>${user.email}</td>
<td>${user.role}</td>
<td>${date}</td>
<td><button class="btn btn-sm" onclick="previewRaf('${user.raf_path || ''}')">Preview</button></td>
<td>
<div style="display: flex; flex-direction: column; gap: 4px;">
<button type="button" class="btn btn-success btn-sm" onclick="acceptUser('${user.user_id || user.id}')">Accept</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${user.user_id || user.id}')">Remove</button>
</div>
</td>
</tr>`;
tbody.innerHTML += row;
}
});
}

function navigateToUploads(type) { 
try {
if (DEBUG) console.log('navigateToUploads called with type:', type);
// First show the upload section
document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
document.getElementById('upload').classList.add('active');
document.getElementById('page-title').textContent = 'Upload';

// Hide all upload subsections and show admin uploads
document.querySelectorAll('.upload-subsection').forEach(sub => sub.classList.remove('active'));
document.getElementById('admin-uploads-section').classList.add('active');

// Remove active from all nav buttons and add to Admin Uploads
document.querySelectorAll('.upload-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
document.getElementById('btn-admin-uploads').classList.add('active');
if (DEBUG) console.log('navigateToUploads completed successfully');
} catch (e) {
console.error('Error in navigateToUploads:', e);
alert('Error navigating to uploads: ' + e.message);
}
}
function navigateToUsers() { 
showSection('users');
// Update sidebar active state
document.querySelectorAll('.sidebar ul li').forEach(li => {
li.classList.remove('active');
});
var usersLink = document.querySelector('.sidebar ul li a[data-section="users"]');
if (usersLink) {
usersLink.closest('li').classList.add('active');
}
}
// Make functions globally accessible
window.navigateToUsers = navigateToUsers;
window.navigateToNotifications = navigateToNotifications;
window.navigateToUploads = navigateToUploads;
window.navigateToUploadSection = navigateToUploadSection;
window.showNotificationsFromModal = showNotificationsFromModal;
window.scrollToUserSection = scrollToUserSection;
window.handleProfileClick = handleProfileClick;
window.openProfileModal = openProfileModal;
function navigateToNotifications() { showSection('notifications'); }
function showNotificationsFromModal() {
showSection('notifications');
toggleNotificationModal();
document.querySelectorAll('.sidebar ul li').forEach(function(li){li.classList.remove('active')});
var notifLink = document.querySelector('.sidebar ul li a[data-section="notifications"]');
if(notifLink){
notifLink.parentElement.classList.add('active');
}
}
function navigateToUploadSection() {
document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
document.getElementById('upload').classList.add('active');
document.getElementById('page-title').textContent = 'Upload';
document.querySelectorAll('.upload-subsection').forEach(sub => sub.classList.remove('active'));
document.getElementById('admin-uploads-section').classList.add('active');
}
function scrollToUserSection(type) {
showSection('users');
showUserSection(type);
}
function handleProfileClick() { showSection('profile'); }
function openProfileModal() { showSection('profile'); }
function openProfileModal() {
// Create and show profile edit modal
const modal = document.createElement('div');
modal.className = 'modal';
modal.id = 'profile-modal';
modal.innerHTML = `
<div class="modal-content">
<span class="close" onclick="closeProfileModal()">&times;</span>
<h2>Edit Profile</h2>
<form id="profile-form">
<label for="profile-name">Name:</label>
<input type="text" id="profile-name" value="Admin" required>
<label for="profile-email">Email:</label>
<input type="email" id="profile-email" value="admin@example.com" required>
<button type="submit">Save Changes</button>
</form>
</div>
`;
document.body.appendChild(modal);
modal.style.display = 'block';

// Handle form submission
document.getElementById('profile-form').addEventListener('submit', function(e) {
e.preventDefault();
const name = document.getElementById('profile-name').value;
const email = document.getElementById('profile-email').value;
alert('Profile updated successfully!');
closeProfileModal();
});
}
function closeProfileModal() {
const modal = document.getElementById('profile-modal');
if (modal) {
modal.remove();
}
}
function handleLogoutClick() { localStorage.removeItem('currentUser'); window.location.href = 'index.html'; }


function saveUsers(users) {
localStorage.setItem('users', JSON.stringify(users));
}

function openRejectModal(userId) {
// Create the modal
let modal = document.getElementById('reject-modal');
if (!modal) {
modal = document.createElement('div');
modal.id = 'reject-modal';
modal.className = 'modal';
modal.style.display = 'flex';
modal.style.justifyContent = 'center';
modal.style.alignItems = 'center';
modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
modal.innerHTML = `
<div class="modal-content" style="background-color: #ffebee; border: 1px solid #f44336; max-width: 400px; text-align: center;">
<h3 style="color: #f44336; margin-bottom: 15px;">Rejected for a reason</h3>
<p style="margin-bottom: 15px; color: #333;">Message: did not fulfill the requirements needed</p>
<textarea id="reject-reason" placeholder="Optional additional reason..." style="width: 100%; height: 60px; margin-bottom: 20px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" maxlength="200"></textarea>
<div style="display: flex; gap: 10px; justify-content: center;">
<button id="confirm-reject" style="background-color: #f44336; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Reject</button>
<button id="cancel-reject" style="background-color: #ccc; color: #333; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
</div>
</div>
`;
document.body.appendChild(modal);

// Add event listeners
document.getElementById('confirm-reject').addEventListener('click', function() {
const reason = document.getElementById('reject-reason').value.trim();
updateUserStatus(userId, 'reject', reason);
closeRejectModal();
});
document.getElementById('cancel-reject').addEventListener('click', function() {
closeRejectModal();
});
}
modal.style.display = 'flex';
}

function closeRejectModal() {
const modal = document.getElementById('reject-modal');
if (modal) {
modal.style.display = 'none';
}
}

function previewEducatorId(educatorId) {
// Similar to previewRaf but for educator ID
alert('Preview functionality for Educator ID: ' + educatorId);
// Implement similar to previewRaf if needed
}

function previewRaf(rafPath) {
// For testing, use a hardcoded PDF from Supabase
rafPath = 'https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/Studies/Santibanez%20et%20al.pdf';
if (!rafPath || rafPath === '') {
alert('No RAF file available for preview.');
return;
}
// Check if modal exists, create if not
let modal = document.getElementById('raf-preview-modal');
if (!modal) {
modal = document.createElement('div');
modal.id = 'raf-preview-modal';
modal.className = 'modal';
modal.style.display = 'flex';
modal.style.justifyContent = 'center';
modal.style.alignItems = 'center';
modal.innerHTML = `
<div class="modal-content" style="margin: 0;">
<span class="close-modal" onclick="closeRafModal()">&times;</span>
<h3>RAF Preview</h3>
<div id="raf-preview-content" style="margin-top: 15px;"></div>
</div>
`;
document.body.appendChild(modal);
}
modal.style.display = 'flex';
const content = document.getElementById('raf-preview-content');
if (rafPath.startsWith('local:')) {
const key = rafPath.substring(6); // remove 'local:'
const dataUrl = localStorage.getItem(key + '_raf');
if (dataUrl) {
content.innerHTML = '<iframe src="' + dataUrl + '" width="100%" height="600px" frameborder="0"></iframe>';
} else {
content.innerHTML = '<p>RAF file not found in local storage.</p>';
}
} else {
// Open the file in Google Docs Viewer in a modal
const viewerUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent(rafPath);
content.innerHTML = '<iframe src="' + viewerUrl + '" width="100%" height="600px" frameborder="0"></iframe>';
}
}
function closeRafModal() { document.getElementById('raf-preview-modal').style.display = 'none'; }

function displayArticlePDF(pdfUrl, title) {
if (DEBUG) console.log('displayArticlePDF called with:', pdfUrl, title);
if (!pdfUrl || pdfUrl === '') {
alert('No PDF file available for preview.');
return;
}
// Check if modal exists, create if not
let modal = document.getElementById('pdf-preview-modal');
if (!modal) {
modal = document.createElement('div');
modal.id = 'pdf-preview-modal';
modal.className = 'modal';
modal.innerHTML = `
<div class="modal-content" style="width: 90%; max-width: 800px; max-height: 90vh;">
<span class="close-modal" onclick="closePdfModal()">&times;</span>
<h3>${title}</h3>
<div id="pdf-preview-content" style="margin-top: 15px; height: 600px;"></div>
</div>
`;
document.body.appendChild(modal);
}
modal.style.display = 'flex';
const content = document.getElementById('pdf-preview-content');
// Use iframe to display PDF
content.innerHTML = '<iframe src="' + pdfUrl + '" width="100%" height="100%" frameborder="0"></iframe>';
}

function closePdfModal() { document.getElementById('pdf-preview-modal').style.display = 'none'; }
function toggleUploadsDropdown(e) {
e.preventDefault();
e.stopPropagation();
const users = document.getElementById('users-dropdown');
const uploads = document.getElementById('uploads-dropdown');
const notifications = document.getElementById('notifications-dropdown');
const terms = document.getElementById('terms-dropdown');
if (users) users.classList.remove('open');
if (uploads) uploads.classList.toggle('open');
if (notifications) notifications.classList.remove('open');
if (terms) terms.classList.remove('open');
// Add click listener to close dropdown when clicking outside
if (uploads && uploads.classList.contains('open')) {
setTimeout(() => {
document.addEventListener('click', closeUploadsDropdownOnOutsideClick);
}, 1);
}
}
function closeUploadsDropdownOnOutsideClick(e) {
const uploads = document.getElementById('uploads-dropdown');
if (uploads && !uploads.contains(e.target)) {
uploads.classList.remove('open');
document.removeEventListener('click', closeUploadsDropdownOnOutsideClick);
}
}

// Users Navigation Functions
function showUserSection(section) {
// Hide all user subsections
document.querySelectorAll('.user-subsection').forEach(sub => sub.style.display = 'none');
// Show the selected section
document.getElementById(section + '-section').style.display = 'block';
// Update nav button active state
document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
const activeBtn = document.querySelector(`.nav-btn[data-section="${section}"]`);
if (activeBtn) activeBtn.classList.add('active');

// Load data for specific sections
if (section === 'admins') {
loadAdmins();
} else if (section === 'verified') {
// Ensure verified users table is populated
loadUsers();
} else if (section === 'activity') {
loadActivityLogs();
}
}

// Add event listeners for user cards
document.querySelectorAll('.user-card').forEach(card => {
card.addEventListener('click', () => {
const section = card.getAttribute('data-section');
navigateToUsers();
showUserSection(section);
});
});

// Add event listeners for nav buttons
document.querySelectorAll('.users-nav .nav-btn').forEach(btn => {
const section = btn.getAttribute('data-section');
if (section) {
btn.addEventListener('click', () => showUserSection(section));
}
});

function toggleReportsDropdown(e) {
e.preventDefault();
e.stopPropagation();
const users = document.getElementById('users-dropdown');
const uploads = document.getElementById('uploads-dropdown');
const notifications = document.getElementById('notifications-dropdown');
const terms = document.getElementById('terms-dropdown');
if (users) users.classList.remove('open');
if (uploads) uploads.classList.remove('open');
if (notifications) notifications.classList.toggle('open');
if (terms) terms.classList.remove('open');
}
function toggleTermsDropdown(e) {
e.preventDefault();
e.stopPropagation();
const users = document.getElementById('users-dropdown');
const uploads = document.getElementById('uploads-dropdown');
const notifications = document.getElementById('notifications-dropdown');
const terms = document.getElementById('terms-dropdown');
if (users) users.classList.remove('open');
if (uploads) uploads.classList.remove('open');
if (notifications) notifications.classList.remove('open');
if (terms) terms.classList.toggle('open');
}
function showNotificationsSection(type) {
document.querySelectorAll('.notifications-subsection').forEach(s => s.classList.remove('active'));
document.getElementById('notifications-' + type).classList.add('active');
}
function openPasswordChangeModal() { document.getElementById('password-change-modal').style.display = 'block'; }
function closePasswordChangeModal() { document.getElementById('password-change-modal').style.display = 'none'; }
function togglePasswordVisibility() {
const passwordInput = document.getElementById('admin-password');
const eyeIcon = event.target;
if (passwordInput.type === 'password') {
passwordInput.type = 'text';
eyeIcon.className = 'fas fa-eye-slash';
} else {
passwordInput.type = 'password';
eyeIcon.className = 'fas fa-eye';
}
}

function toggleCreateAdminPasswordVisibility() {
const passwordInput = document.getElementById('create-admin-password');
const passwordToggleBtn = document.getElementById('create-admin-password-toggle');
const eyeIcon = passwordToggleBtn.querySelector('i');

if (passwordInput.type === 'password') {
passwordInput.type = 'text';
eyeIcon.className = 'fas fa-eye-slash';
} else {
passwordInput.type = 'password';
eyeIcon.className = 'fas fa-eye';
}
}

function togglePasswordVisibility() {
if (DEBUG) console.log('togglePasswordVisibility called');
const passwordInput = document.getElementById('create-admin-password');
const toggle = document.getElementById('create-admin-password-toggle');
const eyeIcon = toggle.querySelector('i');
if (passwordInput.type === 'password') {
passwordInput.type = 'text';
eyeIcon.className = 'fas fa-eye-slash';
} else {
passwordInput.type = 'password';
eyeIcon.className = 'fas fa-eye';
}
}

// Add event listener to Create New Admin button
document.addEventListener('DOMContentLoaded', function() {
const createAdminBtn = document.getElementById('create-admin-btn');
if (DEBUG) console.log('Create New Admin button found:', createAdminBtn);
if (createAdminBtn) {
createAdminBtn.addEventListener('click', function() {
if (DEBUG) console.log('Create New Admin button clicked');
const modal = document.getElementById('create-admin-modal');
modal.style.display = 'flex';
modal.style.justifyContent = 'center';
modal.style.alignItems = 'center';
});
}
});
function getVerificationCode() {
document.getElementById('get-code-btn').disabled = true;
let time = 60;
const timerEl = document.getElementById('timer');
const interval = setInterval(() => {
timerEl.textContent = time;
time--;
if (time < 0) {
clearInterval(interval);
document.getElementById('get-code-btn').disabled = false;
timerEl.textContent = 'Code sent!';
}
}, 1000);
}
function verifyCode() {
const code = document.getElementById('verification-code').value;
if (code === '123456') { // Demo code
alert('Password changed successfully!');
closePasswordChangeModal();
} else {
alert('Invalid code!');
}
}
function showSettingsSection(section) {
document.querySelectorAll('.settings-subsection').forEach(sub => sub.classList.remove('active'));
document.getElementById(section + '-settings').classList.add('active');
document.querySelectorAll('.settings-sidebar li').forEach(li => li.style.color = 'black');
event.target.style.color = '#007bff';
}
function editContent(type) {
const viewMode = document.querySelector(`#${type}-content .view-mode`);
const editMode = document.querySelector(`#${type}-content .edit-mode`);
const textDiv = document.getElementById(`${type}-text`);
const textarea = document.getElementById(`${type}-textarea`);
textarea.value = textDiv.innerHTML.replace(/<br>/g, '\n').replace(/<\/?[^>]+(>|$)/g, '');
viewMode.style.display = 'none';
editMode.style.display = 'block';
}
function saveContent(type) {
const viewMode = document.querySelector(`#${type}-content .view-mode`);
const editMode = document.querySelector(`#${type}-content .edit-mode`);
const textDiv = document.getElementById(`${type}-text`);
const textarea = document.getElementById(`${type}-textarea`);
const content = textarea.value.replace(/\n/g, '<br>');
textDiv.innerHTML = content;
localStorage.setItem(`${type}Content`, content);
viewMode.style.display = 'block';
editMode.style.display = 'none';
alert(`${type === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'} saved successfully!`);
}
function cancelEdit(type) {
const viewMode = document.querySelector(`#${type}-content .view-mode`);
const editMode = document.querySelector(`#${type}-content .edit-mode`);
viewMode.style.display = 'block';
editMode.style.display = 'none';
}

// Citation modal functions
function openCitationModal(el) {
const modal = document.getElementById('citationModal');
modal.classList.add('show');
// Generate citation based on article data
const article = el.closest('.article');
const title = article.querySelector('h3').textContent;
const authors = article.querySelector('.meta').textContent.split(' â€“ ')[0];
const year = new Date().getFullYear();
// Default to APA
switchCitationTab('APA');
}
function closeCitationModal() {
const modal = document.getElementById('citationModal');
modal.classList.remove('show');
}
function switchCitationTab(format) {
document.querySelectorAll('.citation-tab').forEach(tab => tab.classList.remove('active'));
event.target.classList.add('active');
const content = document.getElementById('citationContent');
// Placeholder citations
const citations = {
APA: `${authors} (${year}). ${title}. STI College Calamba.`,
MLA: `${authors}. "${title}." STI College Calamba, ${year}.`,
Chicago: `${authors}. "${title}." STI College Calamba, ${year}.`,
IEEE: `[1] ${authors}, "${title}," STI College Calamba, ${year}.`,
Harvard: `${authors} (${year}) ${title}. STI College Calamba.`
};
content.textContent = citations[format] || 'Citation format not available.';
}
function copyCitation() {
const content = document.getElementById('citationContent').textContent;
navigator.clipboard.writeText(content).then(() => {
const btn = document.querySelector('.citation-copy-btn');
btn.textContent = 'Copied!';
btn.classList.add('copied');
setTimeout(() => {
btn.textContent = 'Copy Citation';
btn.classList.remove('copied');
}, 2000);
});
}

// Edit User Modal Functions
function openEditUserModal(button, userId) {
const row = button.closest('tr');
const tbody = row.closest('tbody');
const tds = row.querySelectorAll('td');
let oldUserId;

// Reset form fields
document.getElementById('edit-user-id').value = '';
document.getElementById('edit-user-fullname').value = '';
document.getElementById('edit-user-email').value = '';
document.getElementById('edit-user-section').value = '';

// Hide both sections initially
document.getElementById('edit-admin-roles-section').style.display = 'none';
document.getElementById('edit-regular-user-fields').style.display = 'none';

// Reset radio buttons
document.querySelectorAll('input[name="edit-admin-role"]').forEach(rb => rb.checked = false);

if (tbody.id === 'admins-tbody') {
// Admin user - show admin roles section
oldUserId = tds[1].textContent;
document.getElementById('edit-user-id').value = oldUserId;
document.getElementById('edit-user-id').setAttribute('data-old-id', oldUserId);
document.getElementById('edit-user-fullname').value = tds[2].textContent;
document.getElementById('edit-user-email').value = tds[3].textContent !== 'N/A' ? tds[3].textContent : '';

// Show admin roles section
document.getElementById('edit-admin-roles-section').style.display = 'block';

// Set admin role based on what's in the table
const permissionsText = tds[5].textContent;
if (permissionsText.includes('Admin') && permissionsText.includes('Full Access')) {
document.querySelector('input[name="edit-admin-role"][value="admin"]').checked = true;
} else if (permissionsText.includes('Co-Admin')) {
document.querySelector('input[name="edit-admin-role"][value="coadmin"]').checked = true;
} else if (permissionsText.includes('Sub-Admin')) {
document.querySelector('input[name="edit-admin-role"][value="subadmin"]').checked = true;
} else {
document.querySelector('input[name="edit-admin-role"][value="admin"]').checked = true;
}
} else {
// Regular user - show regular fields
oldUserId = tds[1].textContent;
document.getElementById('edit-user-id').value = oldUserId;
document.getElementById('edit-user-id').setAttribute('data-old-id', oldUserId);
document.getElementById('edit-user-fullname').value = tds[2].textContent;
document.getElementById('edit-user-email').value = tds[3].textContent !== 'N/A' ? tds[3].textContent : '';

const roleText = tds[4].textContent;
let roleValue = 'senior_high';
if (roleText === 'SHS') roleValue = 'senior_high';
else if (roleText === 'College') roleValue = 'college';
else if (roleText === 'Educator') roleValue = 'educator';
document.getElementById('edit-user-role').value = roleValue;
document.getElementById('edit-user-section').value = tds[5].textContent;

// Show regular user fields
document.getElementById('edit-regular-user-fields').style.display = 'block';
}
document.getElementById('edit-user-modal').style.display = 'block';
}

function closeEditUserModal() {
document.getElementById('edit-user-modal').style.display = 'none';
}


// Edit user form submission
document.getElementById('edit-user-form').addEventListener('submit', function(e) {
e.preventDefault();
const oldUserId = document.getElementById('edit-user-id').getAttribute('data-old-id') || document.getElementById('edit-user-id').value;
const newUserId = document.getElementById('edit-user-id').value;
const userEmail = document.getElementById('edit-user-email').value;

// Check if we're editing an admin (check if admin roles section is visible)
const isAdmin = document.getElementById('edit-admin-roles-section').style.display !== 'none';

let userData;
let permissionsText = '';

if (isAdmin) {
// Get admin role from radio buttons
const selectedRole = document.querySelector('input[name="edit-admin-role"]:checked');
const adminRole = selectedRole ? selectedRole.value : 'admin';

// Build permissions text based on role
if (adminRole === 'admin') {
permissionsText = 'Full Access - All Features';
} else if (adminRole === 'coadmin') {
permissionsText = 'Limited Access - User & File Management';
} else if (adminRole === 'subadmin') {
permissionsText = 'User Approver - Accept/Reject Registrations';
}

userData = {
user_id: oldUserId,
student_id: newUserId,
name: document.getElementById('edit-user-fullname').value,
email: userEmail,
role: adminRole,
admin_role: adminRole,
permissions: permissionsText
};
} else {
userData = {
user_id: oldUserId,
student_id: newUserId,
name: document.getElementById('edit-user-fullname').value,
email: userEmail,
role: document.getElementById('edit-user-role').value,
section: document.getElementById('edit-user-section').value,
strand: document.getElementById('edit-user-section').value
};
}

fetch('/api/update_user', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(userData)
})
.then(response => response.json())
.then(result => {
if (result.message) {
alert('User updated successfully!');
closeEditUserModal();
// Force refresh from server to update login system and admin table
getUsers(true).then(() => {
loadUsers();
});
} else {
alert('Failed to update user: ' + (result.error || 'Unknown error'));
}
})
.catch(error => {
console.error('Error updating user:', error);
alert('Failed to update user. Please check your connection.');
});
});

// Create Admin Modal Functions
// Create Admin Modal Functions
function openCreateAdminModal() {
document.getElementById('create-admin-modal').style.display = 'block';
if (DEBUG) console.log('Modal opened');
// Force reset - unselect ALL radio buttons by setting checked to false
const roleRadios = document.getElementsByName('admin-role');
for (let i = 0; i < roleRadios.length; i++) {
roleRadios[i].checked = false;
}
// Hide inputs and show select role message
document.getElementById('admin-inputs-container').style.display = 'none';
document.getElementById('select-role-message').style.display = 'block';
// Clear all input fields and remove required
const fullname = document.getElementById('create-admin-fullname');
const email = document.getElementById('create-admin-email');
const password = document.getElementById('create-admin-password');
if (fullname) {
fullname.value = '';
fullname.removeAttribute('required');
}
if (email) {
email.value = '';
email.removeAttribute('required');
}
if (password) {
password.value = '';
password.removeAttribute('required');
}
}

// Add event listener to the Create New Admin button
document.addEventListener('DOMContentLoaded', function() {
const createAdminBtn = document.getElementById('create-admin-btn');
if (createAdminBtn) {
createAdminBtn.addEventListener('click', function() {
if (DEBUG) console.log('Create Admin button clicked');
openCreateAdminModal();
});
} else {
console.error('Create Admin button not found');
}
});

function closeCreateAdminModal() {
document.getElementById('create-admin-modal').style.display = 'none';
// Clear all input fields
document.getElementById('create-admin-fullname').value = '';
document.getElementById('create-admin-email').value = '';
document.getElementById('create-admin-password').value = '';
document.getElementById('create-admin-grade').value = 'Grade 11';
document.getElementById('create-admin-section').value = '';
// Uncheck all role radio buttons (no selection)
const roleRadios = document.querySelectorAll('input[name="admin-role"]');
roleRadios.forEach(radio => radio.checked = false);
// Hide inputs and show select role message
document.getElementById('admin-inputs-container').style.display = 'none';
document.getElementById('select-role-message').style.display = 'block';
}

// Show admin input fields when role is selected
function showAdminInputs() {
const roleRadios = document.querySelectorAll('input[name="admin-role"]');
let selectedRole = '';
roleRadios.forEach(radio => {
if (radio.checked) {
selectedRole = radio.value;
}
});

if (selectedRole) {
document.getElementById('admin-inputs-container').style.display = 'block';
document.getElementById('select-role-message').style.display = 'none';
// Add required attribute to inputs when shown
document.getElementById('create-admin-fullname').setAttribute('required', 'required');
document.getElementById('create-admin-email').setAttribute('required', 'required');
document.getElementById('create-admin-password').setAttribute('required', 'required');

// Move modal slightly up for better centering with inputs
const modalContent = document.querySelector('#create-admin-modal .modal-content');
if (modalContent) {
modalContent.style.top = '40%';
}
} else {
document.getElementById('admin-inputs-container').style.display = 'none';
document.getElementById('select-role-message').style.display = 'block';
// Remove required attributes when hidden
document.getElementById('create-admin-fullname').removeAttribute('required');
document.getElementById('create-admin-email').removeAttribute('required');
document.getElementById('create-admin-password').removeAttribute('required');

// Reset modal position
const modalContent = document.querySelector('#create-admin-modal .modal-content');
if (modalContent) {
modalContent.style.top = '50%';
}
}
}


// Toggle all permissions based on Manage Users checkbox
function toggleAllPermissions(checkbox) {
const specificPermissions = checkbox.closest('div[style*="flex-direction: column"]').querySelector('#specific-permissions, #edit-specific-permissions');
const checkboxes = specificPermissions.querySelectorAll('input[type="checkbox"]');
if (checkbox.checked) {
// Check all specific permissions
checkboxes.forEach(cb => cb.checked = true);
} else {
// Uncheck all specific permissions
checkboxes.forEach(cb => cb.checked = false);
}
}

// Toggle password visibility
function togglePasswordVisibility() {
const passwordInput = document.getElementById('create-admin-password');
const toggleIcon = document.getElementById('create-admin-password-toggle');

if (passwordInput.type === 'password') {
passwordInput.type = 'text';
toggleIcon.innerHTML = '<i class="fas fa-eye-slash"></i>';
} else {
passwordInput.type = 'password';
toggleIcon.innerHTML = '<i class="fas fa-eye"></i>';
}
}

// Add User Modal Functions
function openAddUserModal() {
document.getElementById('add-user-modal').style.display = 'block';
}

function closeAddUserModal() {
document.getElementById('add-user-modal').style.display = 'none';
}

// Handle role change in add user form
document.getElementById('add-user-role').addEventListener('change', function() {
const gradeSection = document.getElementById('add-user-grade-section');
if (this.value === 'senior_high') {
gradeSection.style.display = 'block';
} else {
gradeSection.style.display = 'none';
}
});

// Add user form submission
document.getElementById('add-user-form').addEventListener('submit', function(e) {
e.preventDefault();
const userData = {
name: document.getElementById('add-user-fullname').value,
email: document.getElementById('add-user-email').value,
personal_email: document.getElementById('add-user-personal-email').value,
password: document.getElementById('add-user-password').value,
role: document.getElementById('add-user-role').value,
grade: document.getElementById('add-user-grade').value || null,
section: document.getElementById('add-user-section').value
};

fetch('/api/auth/register', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(userData)
})
.then(response => response.json())
.then(result => {
if (result.status === 'success') {
alert('User added successfully!');
closeAddUserModal();
this.reset();
getUsers(true).then(() => loadUsers()); // Refresh the users list
} else {
alert('Failed to add user: ' + (result.message || result.error || 'Unknown error'));
}
})
.catch(error => {
console.error('Error adding user:', error);
alert('Failed to add user. Please check your connection.');
});
});

// Handle Create Admin Form Submission (inline handler)
async function handleCreateAdminSubmit(e) {
e.preventDefault();

if (DEBUG) console.log('[DEBUG ADMIN CREATE] Form submission started');

const fullname = document.getElementById('create-admin-fullname').value;
const email = document.getElementById('create-admin-email').value;
const password = document.getElementById('create-admin-password').value;

if (!fullname || !email || !password) {
alert('Please fill in all fields');
return false;
}

// Get selected role
const roleRadios = document.getElementsByName('admin-role');
let selectedRole = 'admin';
for (const radio of roleRadios) {
if (radio.checked) {
selectedRole = radio.value;
break;
}
}

if (DEBUG) console.log('[DEBUG ADMIN CREATE] Submitting:', { fullname, email, role: selectedRole });

try {
const response = await fetch('/api/auth/register', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
name: fullname,
email: email,
password: password,
role: selectedRole,
personal_email: email
})
});

if (DEBUG) console.log('[DEBUG ADMIN CREATE] Response status:', response.status);

// Check if response is OK and has content
if (!response.ok) {
// Try to parse error response, otherwise use generic message
try {
const errorResult = await response.json();
alert('Failed: ' + (errorResult.error || errorResult.message || 'Unknown error'));
} catch (e) {
// Response is not JSON or empty
const text = await response.text();
console.error('[DEBUG ADMIN CREATE] Non-JSON error response:', text);
alert('Failed to create admin. Server returned error: ' + response.status);
}
// Reset form on error
document.getElementById('create-admin-form').reset();
return false;
}

// Try to parse successful response
const text = await response.text();
if (!text || text.trim() === '') {
// Empty but OK response - treat as success
if (DEBUG) console.log('[DEBUG ADMIN CREATE] Empty success response, treating as success');
alert('Admin created successfully!');
closeCreateAdminModal();
document.getElementById('create-admin-form').reset();
await getUsers(true);
loadUsers();
return false;
}

// Try to parse JSON response safely
let result;
try {
result = JSON.parse(text);
} catch (parseError) {
if (DEBUG) console.log('[DEBUG ADMIN CREATE] Non-JSON response, treating as success:', text);
alert('Admin created successfully!');
closeCreateAdminModal();
document.getElementById('create-admin-form').reset();
await getUsers(true);
loadUsers();
return false;
}
if (DEBUG) console.log('[DEBUG ADMIN CREATE] Response:', result);

alert('Admin created successfully!');
closeCreateAdminModal();
document.getElementById('create-admin-form').reset();
await getUsers(true);
loadUsers();
} catch (error) {
console.error('[DEBUG ADMIN CREATE] Error:', error);
alert('Failed to create admin. Please try again.');
// Reset form on error
document.getElementById('create-admin-form').reset();
}
return false;
}

// Update role description and show/hide additional fields
function updateRoleDescription() {
const roleRadios = document.getElementsByName('admin-role');
let selectedRole = 'admin';
for (const radio of roleRadios) {
if (radio.checked) {
selectedRole = radio.value;
break;
}
}

const adminRoles = ['admin', 'coadmin', 'subadmin'];
const isAdminRole = adminRoles.includes(selectedRole);

// Update modal title
const modalTitle = document.getElementById('create-user-modal-title');
if (selectedRole === 'senior_high') {
modalTitle.textContent = 'Create Senior High Student';
} else if (selectedRole === 'college') {
modalTitle.textContent = 'Create College Student';
}  else if (selectedRole === 'educator') {
modalTitle.textContent = 'Create Educator';
} else if (selectedRole === 'coadmin') {
modalTitle.textContent = 'Create Co-Admin';
} else if (selectedRole === 'subadmin') {
modalTitle.textContent = 'Create Sub-Admin';
} else {
modalTitle.textContent = 'Create Admin';
}

// Show/hide grade and section fields
const gradeSection = document.getElementById('grade-section');
const sectionSection = document.getElementById('section-section');
const submitBtn = document.getElementById('create-user-btn');

if (selectedRole === 'senior_high') {
gradeSection.style.display = 'block';
sectionSection.style.display = 'block';
submitBtn.textContent = 'Create Student';
} else if (selectedRole === 'college') {
gradeSection.style.display = 'none';
sectionSection.style.display = 'block';
submitBtn.textContent = 'Create Student';
} else if (selectedRole === 'educator') {
gradeSection.style.display = 'none';
sectionSection.style.display = 'block';
submitBtn.textContent = 'Create Educator';
} else {
gradeSection.style.display = 'none';
sectionSection.style.display = 'none';
submitBtn.textContent = 'Create Admin';
}
}





function renderDashboardUploadsChart(category = 'grade11') {
const ctx = document.getElementById('dashboard-uploadsChart').getContext('2d');
if (window.dashboardUploadsChart) {
window.dashboardUploadsChart.destroy();
}

let labels = ['SHS', 'College', 'Teacher', 'Admin'];
let data = [30, 25, 40, 35];

const barColors = [
'#008000', // SHS Emerald Green
'#00008B', // College Deep Blue
'#FFA500', // Teacher Warm Orange
'#8A2BE2'  // Admin Cool Purple
];
const total = data.reduce((a, b) => a + b, 0);
const percentageData = data.map(d => (d / total) * 100);

window.dashboardUploadsChart = new Chart(ctx, {
type: dashboardUploadsChartType,
data: {
labels: labels,
datasets: [{
data: percentageData,
backgroundColor: barColors.slice(0, labels.length),
borderWidth: 1
}]
},
options: {
responsive: true,
plugins: {
legend: {
display: true
},
tooltip: {
callbacks: {
label: function(context) {
return context.label + ': ' + context.parsed.toFixed(1) + '%';
}
}
}
}
}
});
}



function renderGaugeChart(canvasId, label, averageDuration, gaugeColor) {
const canvas = document.getElementById(canvasId);
if (!canvas) return;

const ctx = canvas.getContext('2d');

// Destroy existing chart if it exists
if (window[canvasId + 'Chart']) {
window[canvasId + 'Chart'].destroy();
}

const maxDuration = 5; // Max hours for gauge
const percentage = (averageDuration / maxDuration) * 100;

const isDarkMode = document.body.classList.contains('dark-mode');
const textColor = isDarkMode ? '#ffffff' : '#000000';
const emptyColor = isDarkMode ? '#444' : '#e0e0e0';

window[canvasId + 'Chart'] = new Chart(ctx, {
type: 'doughnut',
data: {
datasets: [{
data: [percentage, 100 - percentage],
backgroundColor: [gaugeColor, emptyColor],
borderWidth: 0
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
cutout: '50%',
plugins: {
legend: { display: false },
tooltip: { enabled: false },
centerText: {
averageDuration: averageDuration,
textColor: textColor
}
},
rotation: 0,
circumference: 360,
elements: {
arc: {
borderRadius: 10
}
}
},
plugins: [{
id: 'centerText',
afterDraw: function(chart) {
const ctx = chart.ctx;
const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
const averageDuration = chart.options.plugins.centerText.averageDuration;
const textColor = chart.options.plugins.centerText.textColor;
ctx.save();
ctx.font = 'bold 16px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = textColor;
ctx.fillText(averageDuration + ' hours', centerX, centerY);
ctx.restore();
}
}]
});
}







// General Settings Functionality
document.addEventListener('DOMContentLoaded', function() {
const siteTitleInput = document.getElementById('site-title');
const siteFaviconInput = document.getElementById('site-favicon');
const settingsForm = document.getElementById('settings-form');
const faviconPreview = document.getElementById('favicon-preview');
const siteTitlePreview = document.getElementById('site-title-preview');

// Load saved settings from server on page load
loadSiteSettings();

var isLoadingSiteSettings = false;
async function loadSiteSettings() {
if (isLoadingSiteSettings) return;
isLoadingSiteSettings = true;
if (DEBUG) console.log('DEBUG: Attempting to load site settings from server...');
try {
const response = await fetch('/api/site-settings');
if (DEBUG) console.log('DEBUG: Site settings fetch response status:', response.status);
if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`);
}
const responseData = await response.json();
if (DEBUG) console.log('DEBUG: Loaded response:', responseData);
const settings = responseData.settings || responseData;
if (DEBUG) console.log('DEBUG: Extracted settings:', settings);
// Check if favicon is a blob URL and reset to default if so
if (settings.siteFavicon && settings.siteFavicon.startsWith('blob:')) {
if (DEBUG) console.log('DEBUG: Invalid blob URL detected, resetting to default favicon');
settings.siteFavicon = '370044409_696741882497707_8408055328080058811_n.jpg';
}
siteTitleInput.value = settings.siteTitle || 'STI Archives';
siteTitlePreview.textContent = settings.siteTitle || 'STI Archives';
faviconPreview.src = settings.siteFavicon || '370044409_696741882497707_8408055328080058811_n.jpg';
updateDocumentTitle(settings.siteTitle || 'STI Archives');
updateDocumentFavicon(settings.siteFavicon || '370044409_696741882497707_8408055328080058811_n.jpg');
} catch (error) {
console.error('Failed to load site settings:', error);
// Fallback to defaults
const defaultTitle = 'STI Archives';
const defaultFavicon = '370044409_696741882497707_8408055328080058811_n.jpg';
siteTitleInput.value = defaultTitle;
siteTitlePreview.textContent = defaultTitle;
faviconPreview.src = defaultFavicon;
updateDocumentTitle(defaultTitle);
updateDocumentFavicon(defaultFavicon);
} finally {
isLoadingSiteSettings = false;
}
}

// Real-time preview updates
siteTitleInput.addEventListener('input', function() {
const newTitle = this.value || 'STI Archives';
siteTitlePreview.textContent = newTitle;
});

siteFaviconInput.addEventListener('change', function() {
const file = this.files[0];
if (file) {
const reader = new FileReader();
reader.onload = function(e) {
const newFavicon = e.target.result;
faviconPreview.src = newFavicon;
};
reader.readAsDataURL(file);
}
});

// Save settings on form submit
settingsForm.addEventListener('submit', async function(e) {
e.preventDefault();
const title = siteTitleInput.value || 'STI Archives';
const faviconFile = siteFaviconInput.files[0];

let faviconData = '370044409_696741882497707_8408055328080058811_n.jpg'; // Default

if (faviconFile) {
// Convert file to base64 for server storage
const reader = new FileReader();
reader.onload = async function(e) {
faviconData = e.target.result;
await saveSettings(title, faviconData);
};
reader.readAsDataURL(faviconFile);
} else {
// Use current favicon preview src
faviconData = faviconPreview.src;
await saveSettings(title, faviconData);
}
});

async function saveSettings(title, favicon) {
try {
const response = await fetch('/api/site-settings/update', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({
siteTitle: title,
siteFavicon: favicon
})
});

if (response.ok) {
// Update document title and favicon only on successful save
updateDocumentTitle(title);
updateDocumentFavicon(favicon);
alert('Settings saved successfully!');
} else {
alert('Failed to save settings. Please try again.');
}
} catch (error) {
console.error('Error saving settings:', error);
alert('Failed to save settings. Please try again.');
}
}
});

function updateDocumentTitle(siteTitle) {
const pageName = 'Admin Panel';
document.title = `${pageName} | ${siteTitle}`;
document.getElementById('page-title-preview').textContent = pageName;
}

function updateDocumentFavicon(faviconSrc) {
let faviconLink = document.querySelector('link[rel="icon"]');
if (!faviconLink) {
faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.type = 'image/png';
document.head.appendChild(faviconLink);
}
// Add version parameter only for non-data URLs to avoid issues with base64
const href = faviconSrc.startsWith('data:') ? faviconSrc : faviconSrc + '?v=1';
faviconLink.href = href;
}

function updateFavicon(logoSrc) {
updateDocumentFavicon(logoSrc);
// Keep sidebar logo as STI Logo.png
const sidebarImg = document.querySelector('.sidebar-header img');
if (sidebarImg) {
sidebarImg.src = 'STI Logo.png';
}
}

// Current filter states
let currentFilters = {
admins: { role: '', search: '', filterType: 'unified' },
verified: { role: '', search: '', filterType: 'unified' },
'signing-up': { role: '', search: '', filterType: 'unified' },
banned: { role: '', search: '', filterType: 'unified' }
};

// Bulk actions functions
function toggleSelectAll(status) {
const selectAllCheckbox = document.getElementById(`select-all-${status}`);
const tbodyId = status === 'admins' ? 'admins-tbody' : `${status}-users-tbody`;
const checkboxes = document.querySelectorAll(`#${tbodyId} .user-checkbox`);
checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
}

function bulkAction(status, action) {
const tbodyId = status === 'admins' ? 'admins-tbody' : `${status}-users-tbody`;
const checkboxes = document.querySelectorAll(`#${tbodyId} .user-checkbox:checked`);
if (checkboxes.length === 0) {
alert('No users selected.');
return;
}
const selectedUsers = Array.from(checkboxes).map(cb => {
const row = cb.closest('tr');
const tds = row.querySelectorAll('td');
const name = status === 'admins' ? tds[1].textContent : tds[3].textContent; // Admin: td1 name, Regular: td3 name
return {
id: cb.getAttribute('data-user-id'),
name: name
};
});
if (confirm(`Are you sure you want to ${action} ${checkboxes.length} user(s)?`)) {
selectedUsers.forEach(user => {
if (action === 'remove') {
removeUser(user.id, user.name);
} else {
updateUserStatus(user.id, action);
}
});
}
}

// Accept user function
async function acceptUser(userId) {
if (confirm('Are you sure you want to accept this user? This will generate login credentials for them.')) {
try {
// Get the user role from localStorage
const users = JSON.parse(localStorage.getItem('users')) || [];
const user = users.find(u => u.id === userId);
const role = user ? user.role : 'user';

const response = await fetch('/api/auth/accept-user', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ user_id: userId, role: role })
});

if (response.ok) {
const result = await response.json();
alert('User accepted successfully! Login credentials have been generated.');
// Refresh the users list
loadUsers();
loadAdmins();
} else {
alert('Failed to accept user. Please try again.');
}
} catch (error) {
console.error('Error accepting user:', error);
alert('Failed to accept user. Please check your connection.');
}
}
}




// Close RAF preview modal when clicking outside
window.addEventListener('click', function(e) {
const rafModal = document.getElementById('raf-preview-modal');
if (rafModal && e.target === rafModal) {
closeRafModal();
}
});
});


</script>
<!-- Retry build after rate limit failure -->
<script>
// === CAROUSEL MANAGEMENT FUNCTIONS ===

// Load carousel items from server
function loadCarouselItems() {
const container = document.getElementById('carousel-items-list');
container.innerHTML = '<div style="text-align: center; padding: 40px; width: 100%;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #0057b8;"></i><p>Loading carousel items...</p></div>';
fetch('/api/carousel')
.then(response => response.json())
.then(data => {
if (data.success) {
// Only render if carousel section is currently visible
const carouselSection = document.getElementById('carousel-section');
if (carouselSection && carouselSection.classList.contains('active')) {
renderCarouselItems(data.carousel || []);
}
} else {
console.error('Failed to load carousel items:', data.error);
const carouselItemsList = document.getElementById('carousel-items-list');
if (carouselItemsList) {
carouselItemsList.innerHTML = '<p class="empty-state">Failed to load carousel items</p>';
}
}
})
.catch(error => {
console.error('Error loading carousel items:', error);
const carouselItemsList = document.getElementById('carousel-items-list');
if (carouselItemsList) {
carouselItemsList.innerHTML = '<p class="empty-state">Error loading carousel items</p>';
}
});
}

// Render carousel items in the list
function renderCarouselItems(items) {
// Only render if carousel section is currently visible
const carouselSection = document.getElementById('carousel-section');
if (!carouselSection || !carouselSection.classList.contains('active')) {
return;
}

const container = document.getElementById('carousel-items-list');

if (!items || items.length === 0) {
container.innerHTML = '<p class="empty-state">No carousel items yet. Add one below.</p>';
return;
}

container.innerHTML = items.map(item => `
<div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); width: 350px; height: 400px; display: flex; flex-direction: column; align-items: stretch; flex-shrink: 0;">
<img src="${item.imageUrl}" alt="${item.title}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">
<div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
<div>
<h4 style="margin: 0 0 5px 0; color: #0057b8; font-size: 14px;">${item.title}</h4>
<p style="margin: 0; font-size: 12px; color: #666;">${item.author || 'No author'}</p>
${item.pdfId || item.pdfPath ? '<p style="margin: 5px 0 0 0; font-size: 11px; color: green;"><i class="fas fa-link"></i> PDF linked</p>' : ''}
</div>
<div style="display: flex; gap: 5px; margin-top: 10px;">
<button onclick="editCarouselItem('${item.id}')" class="btn btn-sm" style="background: #0057b8; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; flex: 1; font-size: 12px;">
<i class="fas fa-edit"></i> Edit
</button>
<button onclick="deleteCarouselItem('${item.id}')" class="btn btn-sm" style="background: #dc3545; color: white; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer; flex: 1; font-size: 12px;">
<i class="fas fa-trash"></i> Delete
</button>
</div>
</div>
</div>
`).join('');
}

// Load articles for PDF selection dropdown
function loadArticlesForCarouselSelect() {
// Only load if carousel section is currently visible
const carouselSection = document.getElementById('carousel-section');
if (!carouselSection || !carouselSection.classList.contains('active')) {
return;
}

fetch('/api/articles')
.then(response => response.json())
.then(data => {
if (data.status === 'success') {
const select = document.getElementById('carousel-pdf-select');
// Keep the first option
select.innerHTML = '<option value="">-- Select PDF from uploaded articles --</option>';

const articles = data.articles || [];
articles.forEach(article => {
const option = document.createElement('option');
option.value = JSON.stringify({ pdfId: article.pdfId || '', pdfPath: article.pdfPath || '' });
option.textContent = article.title || 'Untitled';
select.appendChild(option);
});
}
})
.catch(error => {
console.error('Error loading articles for carousel:', error);
});
}

// Handle carousel form submission
document.getElementById('carousel-form').addEventListener('submit', function(e) {
e.preventDefault();

const itemId = document.getElementById('carousel-item-id').value;
const imageUrl = document.getElementById('carousel-image-url').value;
const title = document.getElementById('carousel-title').value;
const author = document.getElementById('carousel-author').value;
const description = document.getElementById('carousel-description').value;

const pdfSelect = document.getElementById('carousel-pdf-select');
let pdfId = '';
let pdfPath = '';

if (pdfSelect.value) {
try {
const pdfData = JSON.parse(pdfSelect.value);
pdfId = pdfData.pdfId || '';
pdfPath = pdfData.pdfPath || '';
} catch (err) {
console.error('Error parsing PDF selection:', err);
}
}

const carouselData = {
imageUrl,
title,
author,
description,
pdfId,
pdfPath
};

if (itemId) {
// Update existing item
fetch(`/api/carousel/${itemId}`, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(carouselData)
})
.then(response => response.json())
.then(data => {
if (data.success) {
alert('Carousel item updated successfully!');
resetCarouselForm();
loadCarouselItems();
} else {
alert('Failed to update carousel item: ' + data.error);
}
})
.catch(error => {
console.error('Error updating carousel item:', error);
alert('Error updating carousel item');
});
} else {
// Add new item
fetch('/api/carousel', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(carouselData)
})
.then(response => response.json())
.then(data => {
if (data.success) {
alert('Carousel item added successfully!');
resetCarouselForm();
loadCarouselItems();
} else {
alert('Failed to add carousel item: ' + data.error);
}
})
.catch(error => {
console.error('Error adding carousel item:', error);
alert('Error adding carousel item');
});
}
});

// Edit carousel item - populate form with existing data
function editCarouselItem(id) {
fetch('/api/carousel')
.then(response => response.json())
.then(data => {
if (data.success) {
const item = data.carousel.find(i => i.id === id);
if (item) {
const idEl = document.getElementById('carousel-item-id');
if (idEl) idEl.value = item.id;
const urlEl = document.getElementById('carousel-image-url');
if (urlEl) urlEl.value = item.imageUrl || '';
const titleEl = document.getElementById('carousel-title');
if (titleEl) titleEl.value = item.title || '';
const authorEl = document.getElementById('carousel-author');
if (authorEl) authorEl.value = item.author || '';
const descEl = document.getElementById('carousel-description');
if (descEl) descEl.value = item.description || '';

// Set PDF selection if there's a linked PDF
const pdfSelect = document.getElementById('carousel-pdf-select');
if (item.pdfId || item.pdfPath) {
const pdfData = { pdfId: item.pdfId || '', pdfPath: item.pdfPath || '' };
pdfSelect.value = JSON.stringify(pdfData);
} else {
pdfSelect.value = '';
}

// Show cancel button and change title
document.getElementById('carousel-form-title').textContent = 'Edit Carousel Item';
document.getElementById('carousel-cancel-btn').style.display = 'inline-block';

// Show the form
document.getElementById('carousel-form-container').style.display = 'block';
document.getElementById('carousel-add-btn').style.display = 'none';

// Change submit button text
const submitBtn = document.querySelector('#carousel-form button[type="submit"]');
if (submitBtn) submitBtn.textContent = 'Update Item';

// Scroll to form
document.getElementById('carousel-form').scrollIntoView({ behavior: 'smooth' });
}
}
})
.catch(error => {
console.error('Error loading carousel item for edit:', error);
});
}

// Delete carousel item
function deleteCarouselItem(id) {
if (!confirm('Are you sure you want to delete this carousel item?')) {
return;
}

fetch(`/api/carousel/${id}`, {
method: 'DELETE'
})
.then(response => response.json())
.then(data => {
if (data.success) {
alert('Carousel item deleted successfully!');
loadCarouselItems();
} else {
alert('Failed to delete carousel item: ' + data.error);
}
})
.catch(error => {
console.error('Error deleting carousel item:', error);
alert('Error deleting carousel item');
});
}

// Reset carousel form
function resetCarouselForm() {
const carouselItemId = document.getElementById('carousel-item-id');
const carouselImageUrl = document.getElementById('carousel-image-url');
const carouselTitle = document.getElementById('carousel-title');
const carouselAuthor = document.getElementById('carousel-author');
const carouselDescription = document.getElementById('carousel-description');
const carouselPdfSelect = document.getElementById('carousel-pdf-select');
const carouselImagePreview = document.getElementById('carousel-image-preview');
const carouselFormTitle = document.getElementById('carousel-form-title');
const carouselFormContainer = document.getElementById('carousel-form-container');
const carouselItemsList = document.getElementById('carousel-items-list');
const carouselAddBtn = document.getElementById('carousel-add-btn');

if (carouselItemId) carouselItemId.value = '';
if (carouselImageUrl) carouselImageUrl.value = '';
if (carouselTitle) carouselTitle.value = '';
if (carouselAuthor) carouselAuthor.value = '';
if (carouselDescription) carouselDescription.value = '';
if (carouselPdfSelect) carouselPdfSelect.value = '';
if (carouselImagePreview) carouselImagePreview.innerHTML = '';

if (carouselFormTitle) carouselFormTitle.textContent = 'Add New Carousel Item';
const submitBtn = document.querySelector('#carousel-form button[type="submit"]');
if (submitBtn) submitBtn.textContent = 'Add Item';
// Hide form
if (carouselFormContainer) carouselFormContainer.style.display = 'none';
// Show the add button
if (carouselAddBtn) carouselAddBtn.style.display = 'inline-block';
}

// Show carousel form for adding new item
function showCarouselForm() {
resetCarouselForm();
document.getElementById('carousel-form-container').style.display = 'block';
document.getElementById('carousel-add-btn').style.display = 'none';
// Load articles for PDF selection
loadArticlesForCarouselSelect();
}

// Show carousel items list
function showCarouselItemsList() {
document.getElementById('carousel-form-container').style.display = 'none';
document.getElementById('carousel-items-list').style.display = 'block';
document.getElementById('carousel-add-btn').style.display = 'inline-block';
// Load carousel items
loadCarouselItems();
}

// Handle carousel image upload
function handleCarouselImageUpload(input) {
const file = input.files[0];
if (!file) return;

if (!file.type.startsWith('image/')) {
alert('Please select an image file');
return;
}

if (file.size > 5 * 1024 * 1024) {
alert('Image size must be less than 5MB');
return;
}

const reader = new FileReader();
reader.onload = function(e) {
const imageData = e.target.result;
const preview = document.getElementById('carousel-image-preview');
preview.innerHTML = '<p>Uploading image...</p>';

fetch('/api/carousel/upload-image', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ imageData, filename: file.name })
})
.then(response => {
if (DEBUG) console.log('Upload response status:', response.status);
return response.json();
})
.then(data => {
if (DEBUG) console.log('Upload response data:', data);
if (data.success) {
document.getElementById('carousel-image-url').value = data.imageUrl;
preview.innerHTML = '<img src="' + data.imageUrl + '" style="max-width: 200px; max-height: 150px; border-radius: 4px; border: 2px solid #0057b8;">';
} else {
preview.innerHTML = '<p style="color: red;">Upload failed: ' + (data.error || data.message || 'Unknown error - check console for details') + '</p>';
}
})
.catch(error => {
console.error('Error uploading image:', error);
preview.innerHTML = '<p style="color: red;">Error uploading image: ' + error.message + '</p>';
});
};
reader.readAsDataURL(file);
}

// === END CAROUSEL MANAGEMENT ===
</script>
<script>
// === REAL-TIME SYNCHRONIZATION ===
let ws = null;
let isRealTimeEnabled = false; // Disabled - WebSocket server not integrated with main server

// Initialize WebSocket client using native browser WebSocket API
function initWebSocketClient() {
if (!isRealTimeEnabled) {
if (DEBUG) console.log('âš ï¸ Real-time synchronization is disabled');
return;
}

try {
// Use native browser WebSocket API
const wsUrl = `ws://${window.location.hostname}:5500/ws`;
ws = new WebSocket(wsUrl);

ws.onopen = function() {
if (DEBUG) console.log('âœ… WebSocket connected');
handleWebSocketConnected();
};

ws.onclose = function() {
if (DEBUG) console.log('âš ï¸ WebSocket disconnected');
handleWebSocketDisconnected();
// Try to reconnect after 3 seconds
setTimeout(initWebSocketClient, 3000);
};

ws.onerror = function(error) {
if (DEBUG) console.log('âš ï¸ WebSocket error:', error);
};

ws.onmessage = function(event) {
try {
const data = JSON.parse(event.data);
switch(data.type) {
case 'user_state_update':
handleUserStateUpdate(data);
break;
case 'user_status_change':
handleUserStatusChange(data);
break;
case 'user_deleted':
handleUserDeleted(data);
break;
case 'user_added':
handleUserAdded(data);
break;
}
} catch(e) {
if (DEBUG) console.log('WebSocket message parse error:', e);
}
};
} catch (error) {
if (DEBUG) console.log('âš ï¸ Failed to initialize WebSocket:', error.message);
}
}

// WebSocket event handlers
function handleWebSocketConnected(data) {
if (DEBUG) console.log('âœ“ WebSocket connected:', data);
showConnectionStatus(true);
}

function handleWebSocketDisconnected(data) {
if (DEBUG) console.log('âœ— WebSocket disconnected:', data);
showConnectionStatus(false);
}

function handleUserStateUpdate(data) {
if (DEBUG) console.log('ðŸ“Š User state update received:', data);
// Reload users from localStorage
loadUsers();
// Update dashboard counts
updateDashboardCounts();
// Update charts
renderUserChart();
renderDashboardUploadsChart();
renderSigningUpChart('day', null);
}

function handleUserStatusChange(data) {
if (DEBUG) console.log('ðŸ”„ User status change received:', data);
const { userId, action, user } = data;

// Find and update the row in the current table
updateTableRow(userId, user, action);

// Reload users to ensure consistency
loadUsers();

// Update dashboard counts
updateDashboardCounts();

// Show notification
showRealTimeNotification(`User ${user.name} has been ${action}ed`);
}

function handleUserDeleted(data) {
if (DEBUG) console.log('ðŸ—‘ï¸ User deletion received:', data);
const { userId } = data;

// Remove the row from the current table
removeTableRow(userId);

// Reload users to ensure consistency
loadUsers();

// Update dashboard counts
updateDashboardCounts();

// Show notification
showRealTimeNotification('A user has been removed');
}

function handleUserAdded(data) {
if (DEBUG) console.log('âž• User addition received:', data);
const { user } = data;

// Reload users to ensure consistency
loadUsers();

// Update dashboard counts
updateDashboardCounts();

// Show notification
showRealTimeNotification(`New user ${user.name} has been added`);
}

function handleUserModified(data) {
if (DEBUG) console.log('âœï¸ User modification received:', data);
const { userId, updates } = data;

// Find and update the row in the current table
updateTableRow(userId, updates, 'modify');

// Reload users to ensure consistency
loadUsers();

// Show notification
showRealTimeNotification('User information has been updated');
}

function handleBulkAction(data) {
if (DEBUG) console.log('ðŸ“¦ Bulk action received:', data);
const { action, userIds } = data;

// Reload users to ensure consistency
loadUsers();

// Update dashboard counts
updateDashboardCounts();

// Show notification
showRealTimeNotification(`Bulk action ${action} performed on ${userIds.length} users`);
}

function handleNotification(data) {
if (DEBUG) console.log('ðŸ”” Notification received:', data);
const { notification } = data;

// Add to notifications list
addNotification(notification);

// Update notification badge
updateNotificationBadge();
}

function handleWebSocketError(error) {
console.error('âœ— WebSocket error:', error);
showConnectionStatus(false);
}

// UI update functions
function updateTableRow(userId, userData, action) {
// Find all rows with this user ID
const checkboxes = document.querySelectorAll(`.user-checkbox[data-user-id="${userId}"]`);

checkboxes.forEach(checkbox => {
const row = checkbox.closest('tr');
if (row) {
// Update status cell
const statusCell = row.cells[6]; // Status is at index 6
if (statusCell) {
if (action === 'accept') {
statusCell.textContent = 'Verified';
} else if (action === 'reject') {
statusCell.textContent = 'Rejected';
} else if (action === 'ban') {
statusCell.textContent = 'Banned';
}
}

// Update actions cell
const actionsCell = row.cells[row.cells.length - 1]; // Actions is last cell
if (actionsCell) {
let newActions = '';
if (action === 'accept') {
newActions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button>
<button class="btn btn-warning btn-sm" onclick="updateUserStatus('${userId}', 'reject')">Reject</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${userData.name}')">Remove</button>
</div>
`;
} else if (action === 'reject') {
newActions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button>
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>
<button class="btn btn-danger btn-sm" onclick="updateUserStatus('${userId}', 'ban')">Ban</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${userData.name}')">Remove</button>
</div>
`;
} else if (action === 'ban') {
newActions = `
<div style="display: flex; flex-direction: column; gap: 4px;">
<button class="btn btn-info btn-sm" onclick="openEditUserModal(this, '${userId}')">Edit</button>
<button class="btn btn-success btn-sm" onclick="updateUserStatus('${userId}', 'accept')">Accept</button>
<button class="btn btn-warning btn-sm" onclick="updateUserStatus('${userId}', 'reject')">Reject</button>
<button class="btn btn-danger btn-sm" onclick="removeUser('${userId}', '${userData.name}')">Remove</button>
</div>
`;
}
actionsCell.innerHTML = newActions;
}
}
});
}

function removeTableRow(userId) {
const checkboxes = document.querySelectorAll(`.user-checkbox[data-user-id="${userId}"]`);
checkboxes.forEach(checkbox => {
const row = checkbox.closest('tr');
if (row) {
row.remove();
}
});
}

function showConnectionStatus(connected) {
const statusIndicator = document.getElementById('connection-status');
if (!statusIndicator) {
// Create status indicator if it doesn't exist
const indicator = document.createElement('div');
indicator.id = 'connection-status';
indicator.style.cssText = `
position: fixed;
bottom: 20px;
right: 20px;
padding: 10px 15px;
border-radius: 5px;
font-size: 12px;
font-weight: bold;
z-index: 9999;
box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;
document.body.appendChild(indicator);
}

const indicator = document.getElementById('connection-status');
if (connected) {
indicator.style.backgroundColor = '#28a745';
indicator.style.color = 'white';
indicator.innerHTML = 'ðŸŸ¢ Real-time Sync Active';
} else {
indicator.style.backgroundColor = '#dc3545';
indicator.style.color = 'white';
indicator.innerHTML = 'ðŸ”´ Real-time Sync Disconnected';
}
}

function showRealTimeNotification(message) {
// Create toast notification
const toast = document.createElement('div');
toast.style.cssText = `
position: fixed;
top: 80px;
right: 20px;
background: #007bff;
color: white;
padding: 15px 20px;
border-radius: 5px;
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
z-index: 10000;
animation: slideIn 0.3s ease-out;
max-width: 300px;
`;
toast.textContent = message;
document.body.appendChild(toast);

// Remove after 3 seconds
setTimeout(() => {
toast.style.animation = 'slideOut 0.3s ease-out';
setTimeout(() => toast.remove(), 300);
}, 3000);
}

function showTemporaryMessage(message) {
// Create toast notification
const toast = document.createElement('div');
toast.style.cssText = `
position: fixed;
top: 80px;
right: 20px;
background: #ff4444;
color: white;
padding: 15px 20px;
border-radius: 5px;
box-shadow: 0 4px 12px rgba(0,0,0,0.15);
z-index: 10000;
animation: slideIn 0.3s ease-out;
max-width: 300px;
`;
toast.textContent = message;
document.body.appendChild(toast);

// Remove after 5 seconds
setTimeout(() => {
toast.style.animation = 'slideOut 0.3s ease-out';
setTimeout(() => toast.remove(), 300);
}, 5000);
}

function addNotification(notification) {
// Add to notification list (bell dropdown)
const notificationList = document.getElementById('notification-list');
if (notificationList) {
const notifDiv = document.createElement('div');
notifDiv.className = 'notification-item';
notifDiv.innerHTML = `
<div class="notification-details">
<div class="notification-type ${notification.type}">${notification.typeText || 'Update'}</div>
<div class="notification-content">${notification.content}</div>
<div class="notification-time">${formatNotificationDate(new Date().toISOString())}</div>
</div>
`;
notificationList.insertBefore(notifDiv, notificationList.firstChild);

// Remove items from bottom if exceeding max 10
const maxNotifications = 10;
const notificationItems = notificationList.querySelectorAll('.notification-item');
if (notificationItems.length > maxNotifications) {
// Remove the last item (oldest)
notificationItems[notificationItems.length - 1].remove();
}
}

// Add to all notifications list (modal) - prepend and update pagination
const allNotificationsContainer = document.getElementById('all-notifications-list');
if (allNotificationsContainer) {
// Add new notification to the beginning of the array
if (window.notificationPagination) {
window.notificationPagination.notifications.unshift(notification);
window.notificationPagination.totalPages = Math.ceil(window.notificationPagination.notifications.length / window.notificationPagination.itemsPerPage);
// Go to page 1 to show the new notification
goToPage(1);
} else {
// Fallback if pagination not initialized
const notifDiv = document.createElement('div');
notifDiv.className = 'notification-item';
notifDiv.setAttribute('data-id', notification.id || Date.now().toString());
notifDiv.innerHTML = `
<input type="checkbox" class="notification-checkbox">
<div class="notification-details">
<div class="notification-type ${notification.type}">${notification.typeText || 'Update'}</div>
<div class="notification-content">${notification.content}</div>
<div class="notification-time">${formatNotificationDate(new Date().toISOString())}</div>
</div>
<div class="notification-actions">
<i class="fas fa-times" title="Mark as Read" onclick="markNotificationRead(this)"></i>
</div>
`;
allNotificationsContainer.insertBefore(notifDiv, allNotificationsContainer.firstChild);
}
}
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
from { transform: translateX(100%); opacity: 0; }
to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
from { transform: translateX(0); opacity: 1; }
to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);

// Initialize WebSocket client on page load
document.addEventListener('DOMContentLoaded', function() {
// Initialize WebSocket after a short delay to ensure page is ready
setTimeout(initWebSocketClient, 1000);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
if (ws) {
ws.close();
}
});
</script>
<script src="/frontend/assets/js/pdf-viewer.js"></script>
<script>
// Handle PDF upload for article
function handleArticlePDFUpload(input, articleId) {
const file = input.files[0];
if (!file) return;

if (file.type !== 'application/pdf') {
alert('Please select a PDF file');
return;
}

const formData = new FormData();
formData.append('pdf', file);
formData.append('articleId', articleId);

// Get the auth token
const token = localStorage.getItem('sti_auth_token');

fetch('/api/upload-article-pdf', {
method: 'POST',
headers: {
'Authorization': 'Bearer ' + token
},
body: formData
})
.then(response => response.json())
.then(data => {
if (data.status === 'success') {
// Update the article in adminArticles
const adminArticles = getAdminArticles();
const articleIndex = adminArticles.findIndex(a => (a.id || a.title) === articleId);
if (articleIndex !== -1) {
adminArticles[articleIndex].pdfPath = data.pdfPath;
saveAdminArticles(adminArticles);
}

// Also update allArticles in localStorage
const allArticles = JSON.parse(localStorage.getItem('allArticles')) || [];
const allIndex = allArticles.findIndex(a => (a.id || a.title) === articleId);
if (allIndex !== -1) {
allArticles[allIndex].pdfPath = data.pdfPath;
localStorage.setItem('allArticles', JSON.stringify(allArticles));
}

// Also update in Couchbase/server
updateArticleInServer(articleId, { pdfPath: data.pdfPath });

alert('PDF uploaded successfully!');
renderAdminArticles(currentPage);
} else {
alert('Failed to upload PDF: ' + data.error);
}
})
.catch(error => {
console.error('Error uploading PDF:', error);
alert('Error uploading PDF');
});
}

// Handle PDF removal for article
function removeArticlePDF(button, articleId) {
if (!confirm('Are you sure you want to remove this PDF?')) return;

// Update the article in adminArticles
const adminArticles = getAdminArticles();
const articleIndex = adminArticles.findIndex(a => (a.id || a.title) === articleId);
if (articleIndex !== -1) {
adminArticles[articleIndex].pdfPath = null;
saveAdminArticles(adminArticles);

// Also update allArticles in localStorage
const allArticles = JSON.parse(localStorage.getItem('allArticles')) || [];
const allIndex = allArticles.findIndex(a => (a.id || a.title) === articleId);
if (allIndex !== -1) {
allArticles[allIndex].pdfPath = null;
localStorage.setItem('allArticles', JSON.stringify(allArticles));
}

// Also update in Couchbase/server
updateArticleInServer(articleId, { pdfPath: null });

alert('PDF removed successfully!');
renderAdminArticles(currentPage);
}
}

// Function to update article in server/Couchbase
function updateArticleInServer(articleId, updates) {
// Get the auth token
const token = localStorage.getItem('sti_auth_token');

fetch('/api/articles/' + articleId, {
method: 'PUT',
headers: { 
'Content-Type': 'application/json',
'Authorization': 'Bearer ' + token
},
body: JSON.stringify(updates)
})
.then(response => response.json())
.then(data => {
if (data.status === 'success') {
if (DEBUG) console.log('Article updated in server');
} else {
console.error('Failed to update article in server:', data.error);
}
})
.catch(error => {
console.error('Error updating article in server:', error);
});
}
</script>
<script>
// === GLOBAL FUNCTION BINDINGS ===
// Explicitly bind functions to window to make them globally accessible for onclick handlers
// This ensures functions work even when served through PHP
if (typeof showSection === 'function') window.showSection = showSection;
if (typeof showUserSection === 'function') window.showUserSection = showUserSection;
if (typeof handleSidebarClick === 'function') window.handleSidebarClick = handleSidebarClick;
if (typeof navigateToUsers === 'function') window.navigateToUsers = navigateToUsers;
if (typeof navigateToNotifications === 'function') window.navigateToNotifications = navigateToNotifications;
if (typeof scrollToUserSection === 'function') window.scrollToUserSection = scrollToUserSection;
if (typeof handleProfileClick === 'function') window.handleProfileClick = handleProfileClick;
if (typeof openProfileModal === 'function') window.openProfileModal = openProfileModal;
if (typeof navigateToUploads === 'function') window.navigateToUploads = navigateToUploads;
if (typeof acceptUser === 'function') window.acceptUser = acceptUser;
if (typeof removeUser === 'function') window.removeUser = removeUser;
if (typeof previewRaf === 'function') window.previewRaf = previewRaf;
if (typeof displayArticlePDF === 'function') window.displayArticlePDF = displayArticlePDF;
if (typeof closePdfModal === 'function') window.closePdfModal = closePdfModal;
if (typeof showGrade === 'function') window.showGrade = showGrade;
if (typeof showStrand === 'function') window.showStrand = showStrand;
if (typeof showDegree === 'function') window.showDegree = showDegree;
if (typeof showDepartment === 'function') window.showDepartment = showDepartment;
if (typeof loadStrandUsers === 'function') window.loadStrandUsers = loadStrandUsers;
if (typeof loadDegreeUsers === 'function') window.loadDegreeUsers = loadDegreeUsers;
if (typeof loadDepartmentUsers === 'function') window.loadDepartmentUsers = loadDepartmentUsers;
if (DEBUG) console.log('Global functions bound to window');

// Handle upload card click
var uploadCard = document.getElementById('upload-card');
if (uploadCard) {
uploadCard.addEventListener('click', function(e) {
e.preventDefault();
var dashboard = document.getElementById('dashboard');
var upload = document.getElementById('upload');
dashboard.classList.remove('active');
dashboard.style.display = 'none';
upload.classList.add('active');
upload.style.display = 'block';
document.getElementById('page-title').textContent = 'Upload';

// Update sidebar active state
document.querySelectorAll('.sidebar ul li').forEach(li => {
li.classList.remove('active');
});
var uploadLink = document.querySelector('.sidebar ul li a[data-section="upload"]');
if (uploadLink) {
uploadLink.closest('li').classList.add('active');
}
});
}

function updateFilters(section) {
const roleSelect = document.getElementById(`role-filter-${section}`);
const gradeSelect = document.getElementById(`grade-filter-${section}`);
const strandSelect = document.getElementById(`strand-filter-${section}`);
const degreeSelect = document.getElementById(`degree-filter-${section}`);
const deptSelect = document.getElementById(`dept-filter-${section}`);

const selectedRole = roleSelect.value;

// Hide all dynamic selects first
gradeSelect.style.display = 'none';
strandSelect.style.display = 'none';
degreeSelect.style.display = 'none';
deptSelect.style.display = 'none';

// Show relevant selects based on role
if (selectedRole === 'shs') {
gradeSelect.style.display = 'block';
strandSelect.style.display = 'block';
} else if (selectedRole === 'college') {
degreeSelect.style.display = 'block';
} else if (selectedRole === 'educator') {
deptSelect.style.display = 'block';
}

// Apply role filter
const searchInput = document.querySelector(`#${section}-section input[onkeyup*="filterTable"]`);
const filterType = document.getElementById(`search-filter-${section}`).value;
filterTable(searchInput ? searchInput.value : '', section, filterType);

// Store current filter state
currentFilters[section].role = selectedRole;
}

function filterTable(query, tableType, filterType = 'unified') {
const tableId = tableType === 'admins' ? 'admins-tbody' : `${tableType}-users-tbody`;
const tbody = document.getElementById(tableId);
if (!tbody) return;

// Store current filter state
currentFilters[tableType].search = query;
currentFilters[tableType].filterType = filterType;

const rows = tbody.getElementsByTagName('tr');
const filter = query.toLowerCase();
const roleFilter = document.getElementById(`role-filter-${tableType}`).value;

for (let i = 0; i < rows.length; i++) {
const cells = rows[i].getElementsByTagName('td');
let found = false;

// Check role filter first
if (roleFilter) {
const roleCell = cells[4]; // Role column for both admins and users
if (roleCell) {
const roleText = roleCell.textContent.trim();
if (tableType === 'admins') {
const expectedText = roleFilter === 'admin' ? 'Admin' : roleFilter === 'co-admin' ? 'Co-Admin' : roleFilter === 'sub-admin' ? 'Sub-Admin' : '';
if (expectedText && roleText !== expectedText) {
rows[i].style.display = 'none';
continue;
}
} else {
// For other tables, check if roleText includes the filter value
if (!roleText.toLowerCase().includes(roleFilter.toLowerCase())) {
rows[i].style.display = 'none';
continue;
}
}
}
}

if (filterType === 'unified') {
// Search in all relevant columns
for (let j = 0; j < cells.length; j++) {
if (cells[j].textContent.toLowerCase().includes(filter)) {
found = true;
break;
}
}
} else if (filterType === 'fullname' && cells.length > 2) {
// Full Name column (index 2)
if (cells[2].textContent.toLowerCase().includes(filter)) {
found = true;
}
} else if (filterType === 'userid' && cells.length > 1) {
// User ID column (index 1)
if (cells[1].textContent.toLowerCase().includes(filter)) {
found = true;
}
} else if (filterType === 'email' && cells.length > 3) {
// Email column (index 3)
if (cells[3].textContent.toLowerCase().includes(filter)) {
found = true;
}
}

rows[i].style.display = found ? '' : 'none';
}

// Reset pagination to page 1 and paginate
const paginationDiv = document.getElementById(`${tableType === 'admins' ? 'admins' : tableType}-pagination`);
if (paginationDiv) {
paginationDiv.dataset.currentPage = 1;
paginateTable(tableId, 10);
}
}

function paginateTable(tbodyId, rowsPerPage) {
const tbody = document.getElementById(tbodyId);
if (!tbody) return;

const rows = Array.from(tbody.querySelectorAll('tr'));
const totalPages = Math.ceil(rows.length / rowsPerPage);
const paginationDiv = document.getElementById(tbodyId.replace('-tbody', '-pagination'));
if (!paginationDiv) return;

let currentPage = parseInt(paginationDiv.dataset.currentPage) || 1;
if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
if (currentPage < 1) currentPage = 1;
paginationDiv.dataset.currentPage = currentPage;

// Show only current page rows
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

// Page number buttons (always show page 1 when there are records)
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

