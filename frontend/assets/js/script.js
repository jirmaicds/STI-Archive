// Script.js
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.getElementById('main-navbar');

    if (navbar) {
        const imageBackground = document.querySelector('.image-background');
        const contentWrapper = document.querySelector('.content-wrapper');

        function updateNavbar() {
            const scrollY = window.scrollY;
            const documentHeight = document.documentElement.scrollHeight;
            const viewportHeight = window.innerHeight;

            // Only shrink if there's enough content to scroll AND user has scrolled past threshold
            const hasScrollableContent = documentHeight > viewportHeight + 100; // 100px buffer

            if (hasScrollableContent && scrollY > 50) {
                navbar.classList.add('shrink');
                document.body.style.paddingTop = '50px'; // Compensate for fixed navbar
                if (imageBackground) {
                    imageBackground.style.paddingTop = '30px'; // Compensate for fixed navbar
                }
                // Library page compensation
                if (contentWrapper) {
                    contentWrapper.style.marginTop = '30px';
                }
            } else {
                navbar.classList.remove('shrink');
                document.body.style.paddingTop = '0';
                if (imageBackground) {
                    imageBackground.style.paddingTop = '0';
                }
                // Reset library page margin
                if (contentWrapper) {
                    contentWrapper.style.marginTop = '0';
                }
            }
        }

        // Update on scroll
        window.addEventListener('scroll', updateNavbar);

        // Also update on resize in case content becomes scrollable/unscrollable
        window.addEventListener('resize', updateNavbar);

        // Initial check
        updateNavbar();
    }

    // Sidebar logic
    const userIcon = document.getElementById('userIcon');
    const sidebar = document.getElementById('sidebar');
    if (userIcon && sidebar) {
        userIcon.onclick = () => {
            sidebar.classList.toggle('open');
        };
        // Optional: Close sidebar when clicking outside
        window.addEventListener('click', function(e) {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== userIcon) {
                sidebar.classList.remove('open');
            }
        });

  // Window load event listener for desktop screens
  window.addEventListener('load', function() {
      if (window.innerWidth > 1024) {
          const editor = document.querySelector('.editor');
          const fileViewer = document.querySelector('.file-viewer');
          if (editor && fileViewer) {
              editor.style.width = '50%';
              fileViewer.style.width = '50%';
          }
      }
  });

    // Upload Section ---------------------

    const modal = document.getElementById('uploadModal');
    const fileInput = document.getElementById('fileInput');
    const fileQueue = document.getElementById('fileQueue');
    const dropZone = document.getElementById('dropZone');
    const uploadControls = document.getElementById('uploadControls');
    const uploadBtn = document.getElementById('uploadBtn');
    const closeBtn = document.querySelector('.close-btn');
    const addFilesBtn = document.querySelector('#uploadControls button');
    const clearBtn = document.querySelector('.action-buttons button:first-child');
    const uploadBtnModal = document.querySelector('.action-buttons button:last-child');
    let files = [];

    if (modal && fileInput && fileQueue && dropZone && uploadControls && uploadBtn && closeBtn && addFilesBtn && clearBtn && uploadBtnModal) {

    function openModal() {
      modal.style.display = 'flex';
      resetModal();
    }

    function closeModal() {
      modal.style.display = 'none';
    }

    function resetModal() {
      files = [];
      renderQueue();
      dropZone.style.display = 'block';
      uploadControls.classList.add('hidden');
      fileInput.value = ''; // reset file input
    }

    function triggerFileInput() {
      fileInput.click();
    }

    uploadBtn.addEventListener('click', () => {
      window.location.href = 'pfp.html';
    });
    closeBtn.addEventListener('click', closeModal);
    dropZone.addEventListener('click', triggerFileInput);
    addFilesBtn.addEventListener('click', triggerFileInput);
    clearBtn.addEventListener('click', clearQueue);
    uploadBtnModal.addEventListener('click', uploadFiles);

    fileInput.addEventListener('change', () => {
      for (const file of fileInput.files) {
        files.push(file);
      }
      dropZone.style.display = 'none';
      uploadControls.classList.remove('hidden');
      renderQueue();
    });

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      for (const file of e.dataTransfer.files) {
        files.push(file);
      }
      dropZone.style.display = 'none';
      uploadControls.classList.remove('hidden');
      renderQueue();
    });

    // Close modal when clicking backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    function renderQueue() {
      fileQueue.innerHTML = '';
      files.forEach((file, index) => {
        const div = document.createElement('div');
        div.className = 'file-item';

        const name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = file.name;

        const size = document.createElement('span');
        size.className = 'file-size';
        size.textContent = formatSize(file.size);

        const remove = document.createElement('button');
        remove.className = 'remove-btn';
        remove.textContent = '🗑️';
        remove.onclick = () => {
          files.splice(index, 1);
          if (files.length === 0) {
            resetModal();
          } else {
            renderQueue();
          }
        };

        div.appendChild(name);
        div.appendChild(size);
        div.appendChild(remove);
        fileQueue.appendChild(div);
      });
    }

    function formatSize(bytes) {
      const kb = bytes / 1024;
      return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
    }

    function clearQueue() {
      resetModal();
    }

    function uploadFiles() {
      if (files.length === 0) {
        alert("No files to upload.");
        return;
      }

      const formData = new FormData();
      files.forEach((file, index) => {
        formData.append('file[]', file);
      });

      fetch('upload.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert('Upload successful: ' + data.message);
        } else {
          alert('Upload failed: ' + data.message);
        }
        closeModal();
      })
      .catch(error => {
        alert('Upload error: ' + error.message);
        closeModal();
      });
    }
    }

    

    // Scroll to Top Button
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 200) {
                scrollToTopBtn.classList.add('visible');
            } else {
                scrollToTopBtn.classList.remove('visible');
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Profile Cards Scroll Animation
    const aboutSection = document.querySelector('.about-section');
    const profileCards = document.querySelectorAll('.profile-card');

    if (aboutSection && profileCards.length > 0) {
        // Create Intersection Observer for scroll detection
        const observerOptions = {
            threshold: 0.3, // Trigger when 30% of the section is visible
            rootMargin: '0px 0px -50px 0px' // Trigger slightly before the section enters viewport
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Animate profile cards sequentially
                    animateProfileCards();
                    // Unobserve after animation to prevent re-triggering
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        observer.observe(aboutSection);

        function animateProfileCards() {
            profileCards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('animate');
                }, index * 200); // 200ms delay between each card
            });
        }

        // Reset animations when scrolling back to top
        let lastScrollY = window.scrollY;
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // If scrolling up significantly, reset animations
            if (currentScrollY < lastScrollY && currentScrollY < 100) {
                profileCards.forEach(card => {
                    card.classList.remove('animate');
                });
                // Re-observe the section for future animations
                observer.observe(aboutSection);
            }

            lastScrollY = currentScrollY;
        });

        // Add mobile optimization - reduce animation delay on smaller screens
        if (window.innerWidth <= 768) {
            function animateProfileCards() {
                profileCards.forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('animate');
                    }, index * 150); // Faster animation on mobile
                });
            }
        }
    }
    // Chart.js for Admin Dashboard
    const chartElement = document.getElementById('engagementChart');
    if (chartElement) {
        const ctx = chartElement.getContext('2d');
        const engagementChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Visits', 'File Uploads', 'Avg Duration (min)'],
        datasets: [
          {
            label: 'Senior High',
            data: [1200, 300, 5.2],
            backgroundColor: '#4C72B0'
          },
          {
            label: 'College',
            data: [1800, 500, 7.8],
            backgroundColor: '#55A868'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          },
          title: {
            display: true,
            text: 'Website Engagement Comparison',
            color: 'white',
            font: {
              size: 18
            }
          }
        },
        scales: {
          x: {
            ticks: { color: 'white' },
            grid: { color: '#3b4252' }
          },
          y: {
            ticks: { color: 'white' },
            grid: { color: '#3b4252' }
          }
        }
      }
    });
    }
 
// Admin login validation and authentication for auth-container2
document.addEventListener('DOMContentLoaded', function () {
    // Password show/hide for admin form (fix: use data-target attribute)
    document.querySelectorAll('.auth-container2 .toggle-password').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            const icon = btn.querySelector('i');
            if (targetInput) {
                if (targetInput.type === "password") {
                    targetInput.type = "text";
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    targetInput.type = "password";
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });

    // Email and password validation
    const adminEmailInput = document.getElementById('admin-login-email');
    const adminEmailError = document.getElementById('admin-login-email-error');
    const adminPasswordInput = document.getElementById('admin-login-password');
    const adminPasswordError = document.getElementById('admin-login-password-error');
    const adminLoginForm = document.getElementById('adminloginForm');
    const adminLoginMessage = document.getElementById('admin-login-message');

    function validateAdminEmail() {
        const email = adminEmailInput.value.trim();
        const emailRegex = /^[A-Za-z0-9._%+-]+@sti\.archives\.clmb$/;
        if (!email) {
            adminEmailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Only emails from @calamba.sti.edu.ph are accepted.';
            adminEmailError.style.display = 'block';
            adminEmailInput.classList.add('input-error');
            return false;
        } else if (!emailRegex.test(email)) {
            adminEmailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Only emails from @calamba.sti.edu.ph are accepted.';
            adminEmailError.style.display = 'block';
            adminEmailInput.classList.add('input-error');
            return false;
        } else {
            adminEmailError.style.display = 'none';
            adminEmailInput.classList.remove('input-error');
            return true;
        }
    }

    adminEmailInput.addEventListener('input', () => {
        if (adminEmailError.style.display === 'block') {
            const email = adminEmailInput.value.trim();
            const emailRegex = /^[A-Za-z0-9._%+-]+@calamba\.sti\.edu\.ph$/;
            if (email && emailRegex.test(email)) {
                adminEmailError.style.display = 'none';
                adminEmailInput.classList.remove('input-error');
            }
        }
    });

    function validateAdminPassword() {
        const password = adminPasswordInput.value;
        if (!password) {
            adminPasswordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Password is required';
            adminPasswordError.style.display = 'block';
            adminPasswordInput.classList.add('input-error');
            return false;
        } else if (password.length < 8) {
            adminPasswordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Password must be at least 8 characters long.';
            adminPasswordError.style.display = 'block';
            adminPasswordInput.classList.add('input-error');
            return false;
        } else {
            adminPasswordError.style.display = 'none';
            adminPasswordInput.classList.remove('input-error');
            return true;
        }
    }

    adminPasswordInput.addEventListener('input', () => {
        if (adminPasswordError.style.display === 'block') {
            const password = adminPasswordInput.value;
            if (password.length >= 8) {
                adminPasswordError.style.display = 'none';
                adminPasswordInput.classList.remove('input-error');
            }
        }
    });

    // Hardcoded admin credentials (for demo)
    const adminCredentials = [
        { email: 'admin@sti.archives.clmb', password: 'admintesting', name: 'Admin', role: 'admin', id: 'admin1' }
    ];

    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = adminEmailInput.value.trim().toLowerCase();
        const password = adminPasswordInput.value;
        const rememberMe = document.getElementById('admin-rememberMe').checked;

        // Clear previous errors
        adminEmailError.style.display = 'none';
        adminPasswordError.style.display = 'none';
        adminEmailInput.classList.remove('input-error');
        adminPasswordInput.classList.remove('input-error');
        adminLoginMessage.style.display = 'none';

        let hasErrors = false;

        // Validate email
        const emailRegex = /^[A-Za-z0-9._%+-]+@calamba\.sti\.edu\.ph$/;
        if (!email) {
            adminEmailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Only emails from @calamba.sti.edu.ph are accepted.';
            adminEmailError.style.display = 'block';
            adminEmailInput.classList.add('input-error');
            hasErrors = true;
        } else if (!emailRegex.test(email)) {
            adminEmailError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Only emails from @calamba.sti.edu.ph are accepted.';
            adminEmailError.style.display = 'block';
            adminEmailInput.classList.add('input-error');
            hasErrors = true;
        }

        // Validate password
        if (!password) {
            adminPasswordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Password is required';
            adminPasswordError.style.display = 'block';
            adminPasswordInput.classList.add('input-error');
            hasErrors = true;
        } else if (password.length < 8) {
            adminPasswordError.innerHTML = '<i class="fas fa-exclamation-circle"></i> Password must be at least 8 characters long.';
            adminPasswordError.style.display = 'block';
            adminPasswordInput.classList.add('input-error');
            hasErrors = true;
        }

        if (hasErrors) {
            adminLoginMessage.style.display = 'none';
            return;
        }

        // Check credentials
        const admin = adminCredentials.find(u => u.email === email);
        if (admin && admin.password === password) {
            localStorage.setItem('currentUser', JSON.stringify(admin));
            if (rememberMe) {
                localStorage.setItem('adminRememberMe', email);
            } else {
                localStorage.removeItem('adminRememberMe');
            }
            adminLoginMessage.textContent = 'Successfully logged in as admin!';
            adminLoginMessage.style.color = 'green';
            adminLoginMessage.style.display = 'block';
            setTimeout(() => {
                window.location.href = "Homepage.html";
            }, 2000);
        } else {
            adminLoginMessage.textContent = 'Invalid admin credentials. Please try again.';
            adminLoginMessage.style.color = 'red';
            adminLoginMessage.style.display = 'block';
        }
    });

    // Remember Me for admin
    const rememberedAdminEmail = localStorage.getItem('adminRememberMe');
    if (rememberedAdminEmail) {
        adminEmailInput.value = rememberedAdminEmail;
        document.getElementById('admin-rememberMe').checked = true;
    }

    // Forgot Password for admin
    const adminForgotPasswordLink = document.getElementById('admin-forgotPassword');
    if (adminForgotPasswordLink) {
        adminForgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            // You can reuse the same modal or create a separate one for admin
            document.getElementById('forgotPasswordModal').classList.add('show');
            document.body.style.overflow = 'hidden';
        });
    }
})
}})
