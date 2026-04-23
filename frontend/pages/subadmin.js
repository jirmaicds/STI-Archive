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