// SHADOW-SARA Web Interface JavaScript (main.js - v3.1 2025)

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    initializeUI();
    
    // Add animation classes to cards
    animateCards();
    
    // Setup notification system
    setupNotifications();
    
    // Initialize tooltips and other Bootstrap components
    initializeBootstrap();
    
    // Setup form AJAX and validation
    setupForms();
    
    // Setup file upload progress
    setupFileUploadProgress();
    
    // Setup status polling if on status page
    if (window.location.pathname.startsWith('/status/')) {
        const urlParams = new URLSearchParams(window.location.search);
        const taskId = window.location.pathname.split('/')[2];
        const type = urlParams.get('type') || 'unknown';
        pollStatus(taskId, type);
    }
});

// Initialize UI Components
function initializeUI() {
    // Add fade-in animation to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in-up');
    }
    
    // Add glow effect to primary buttons
    const primaryButtons = document.querySelectorAll('.btn-primary, .btn-danger, .btn-warning, .btn-info, .btn-success');
    primaryButtons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.classList.add('glow');
        });
        
        btn.addEventListener('mouseleave', function() {
            this.classList.remove('glow');
        });
    });
    
    // Enhanced form validation
    setupFormValidation();
}

// Animate Cards on Page Load
function animateCards() {
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-in-up');
        }, index * 100);
    });
}

// Setup Bootstrap Components
function initializeBootstrap() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
}

// Enhanced Form Validation
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateInput(this);
            });
            
            input.addEventListener('input', function() {
                clearValidationError(this);
            });
        });
    });
}

// Validate Individual Input
function validateInput(input) {
    const value = input.value.trim();
    const type = input.type;
    let isValid = true;
    let errorMessage = '';
    
    // Check if required field is empty
    if (input.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'This field is required';
    }
    
    // Specific validations based on input type
    switch (type) {
        case 'email':
            if (value && !isValidEmail(value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            }
            break;
            
        case 'number':
            const min = parseInt(input.min);
            const max = parseInt(input.max);
            const numValue = parseInt(value);
            
            if (value && (isNaN(numValue) || (min && numValue < min) || (max && numValue > max))) {
                isValid = false;
                errorMessage = `Please enter a number between ${min || 1} and ${max || 65535}`;
            }
            break;
            
        case 'text':
            // Check for specific input names
            if (input.name === 'host' && value) {
                if (!isValidIP(value) && !isValidHostname(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid IP address or hostname';
                }
            }
            if (input.name === 'keys' && value.length < 4) {
                isValid = false;
                errorMessage = 'Passphrase must be at least 4 characters';
            }
            break;
    }
    
    // Apply validation styling
    if (isValid) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        removeErrorMessage(input);
    } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
        showErrorMessage(input, errorMessage);
    }
    
    return isValid;
}

// Clear Validation Error
function clearValidationError(input) {
    input.classList.remove('is-invalid', 'is-valid');
    removeErrorMessage(input);
}

// Show Error Message
function showErrorMessage(input, message) {
    removeErrorMessage(input);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    
    input.parentNode.appendChild(errorDiv);
}

// Remove Error Message
function removeErrorMessage(input) {
    const existingError = input.parentNode.querySelector('.invalid-feedback');
    if (existingError) {
        existingError.remove();
    }
}

// Validation Helper Functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

function isValidHostname(hostname) {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(hostname);
}

// Setup Forms with AJAX (fixed: structured responses)
function setupForms() {
    const buildForms = document.querySelectorAll('form[id$="Form"]');
    
    buildForms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formId = form.id;
            const buildBtn = form.querySelector('#buildBtn');
            const progressSection = form.parentNode.querySelector('#progressSection');
            const resultSection = form.parentNode.querySelector('#resultSection');
            const progressBar = form.parentNode.querySelector('#progressBar');
            const progressText = form.parentNode.querySelector('#progressText');
            
            // Disable form and show progress
            buildBtn.disabled = true;
            buildBtn.innerHTML = '<i class="bi bi-gear-fill"></i> Building...';
            if (progressSection) progressSection.style.display = 'block';
            if (resultSection) resultSection.style.display = 'none';
            if (progressText) progressText.textContent = 'Initializing...';
            if (progressBar) progressBar.style.width = '0%';
            
            try {
                // Handle file upload if present
                let iconPath = 'data/tmp/icon.png';
                const iconFileInput = form.querySelector('input[name="icon"]');
                if (iconFileInput && iconFileInput.files[0]) {
                    if (progressText) progressText.textContent = 'Uploading icon...';
                    if (progressBar) progressBar.style.width = '20%';
                    
                    const uploadFormData = new FormData();
                    uploadFormData.append('icon', iconFileInput.files[0]);
                    
                    const uploadResponse = await fetch('/upload_icon', {
                        method: 'POST',
                        body: uploadFormData
                    });
                    
                    if (uploadResponse.ok) {
                        const uploadResult = await uploadResponse.json();
                        if (uploadResult.success) {
                            iconPath = uploadResult.path;
                        } else {
                            throw new Error(uploadResult.error || 'Upload failed');
                        }
                    }
                }
                
                // Collect form data
                const formData = new FormData(form);
                const jsonData = Object.fromEntries(formData.entries());
                jsonData.icon = iconPath;
                jsonData.obfuscate = form.querySelector('input[name="obfuscate"]') ? form.querySelector('input[name="obfuscate"]').checked : false;
                
                // Build endpoint based on form ID
                let endpoint = '';
                switch (formId) {
                    case 'trojanForm': endpoint = '/build_trojan'; break;
                    case 'fileLockerForm': endpoint = '/build_file_locker'; break;
                    case 'screenLockerForm': endpoint = '/build_screen_locker'; break;
                    default: throw new Error('Unknown form');
                }
                
                if (progressText) progressText.textContent = 'Starting build process...';
                if (progressBar) progressBar.style.width = '30%';
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(jsonData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success && result.task_id) {
                    if (progressText) progressText.textContent = 'Build started. Monitoring progress...';
                    if (progressBar) progressBar.style.width = '50%';
                    
                    // Redirect to status page
                    window.location.href = `/status/${result.task_id}?type=${formId.replace('Form', '').toLowerCase()}`;
                } else {
                    throw new Error(result.error || result.message || 'Build failed');
                }
                
            } catch (error) {
                console.error(`${formId} error:`, error);  // Debug log
                if (progressBar) progressBar.style.width = '0%';
                if (resultSection) resultSection.style.display = 'block';
                const resultCard = form.parentNode.querySelector('#resultCard');
                if (resultCard) resultCard.className = 'card bg-danger';
                const resultText = form.parentNode.querySelector('#resultText');
                if (resultText) resultText.textContent = error.message || 'An unexpected error occurred';
                const downloadSection = form.parentNode.querySelector('#downloadSection');
                if (downloadSection) downloadSection.style.display = 'none';
            } finally {
                // Re-enable form
                buildBtn.disabled = false;
                const originalHtml = buildBtn.dataset.originalHtml || buildBtn.innerHTML;
                buildBtn.innerHTML = originalHtml;
            }
        });
    });
}

// Status Polling Function (fixed: structured data handling)
function pollStatus(taskId, type) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/status/${taskId}`);
            const data = await response.json();
            
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            if (progressBar && data.progress !== undefined) {
                progressBar.style.width = data.progress + '%';
                progressBar.textContent = data.progress + '%';
            }
            
            if (progressText) {
                progressText.textContent = data.message || data.status || 'Building...';
            }
            
            if (data.status === 'success' || data.status === 'error') {
                clearInterval(interval);
                if (data.status === 'success' && data.file) {
                    // Show download
                    const downloadSection = document.getElementById('downloadSection');
                    if (downloadSection) downloadSection.style.display = 'block';
                    const downloadLink = document.getElementById('downloadLink');
                    if (downloadLink) downloadLink.href = `/download/${data.file}`;
                }
                showNotification(data.message || (data.status === 'success' ? 'Build complete!' : 'Build failed'), data.status === 'success' ? 'success' : 'danger');
            }
        } catch (error) {
            console.error('Polling error:', error);
            clearInterval(interval);
            showNotification(error.message || 'Connection error. Please refresh.', 'danger');
        }
    }, 2000);  // كل 2 ثواني
}

// Notification System
function setupNotifications() {
    // Create notification container if not exists
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.className = 'position-fixed top-0 end-0 p-3';
        notificationContainer.style.zIndex = '1050';
        document.body.appendChild(notificationContainer);
    }
}

// Show Notification
function showNotification(message, type = 'info', duration = 5000) {
    const notificationContainer = document.getElementById('notificationContainer');
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    notificationContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
    
    setTimeout(() => {
        if (bsToast._element) {
            bsToast.hide();
        }
    }, duration);
}

// File Upload Progress
function setupFileUploadProgress() {
    const fileInputs = document.querySelectorAll('input[type="file"]');
    
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                const maxSize = 10 * 1024 * 1024; // 10MB
                
                if (file.size > maxSize) {
                    showNotification('File size exceeds 10MB limit', 'danger');
                    this.value = '';
                    return;
                }
                
                // Show file info
                const fileName = file.name;
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                showNotification(`Selected: ${fileName} (${fileSize} MB)`, 'success', 3000);
            }
        });
    });
}

// Copy to Clipboard Function
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Copied to clipboard!', 'success', 2000);
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// Fallback Copy Function
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Copied to clipboard!', 'success', 2000);
    } catch (err) {
        showNotification('Failed to copy to clipboard', 'danger', 3000);
    }
    
    textArea.remove();
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to submit forms
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeForm = document.activeElement.closest('form');
        if (activeForm) {
            const submitButton = activeForm.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                submitButton.click();
            }
        }
    }
    
    // Escape to close modals/alerts
    if (e.key === 'Escape') {
        const alerts = document.querySelectorAll('.alert.show');
        alerts.forEach(alert => {
            const closeButton = alert.querySelector('.btn-close');
            if (closeButton) {
                closeButton.click();
            }
        });
    }
});

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add CSS animations
const animationCSS = `
    @keyframes fade-in-up {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fade-in-up {
        animation: fade-in-up 0.6s ease-out;
    }
    
    .glow {
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
        transition: box-shadow 0.3s ease;
    }
    
    .is-invalid {
        border-color: #dc3545 !important;
        box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
    }
    
    .is-valid {
        border-color: #198754 !important;
        box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25) !important;
    }
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = animationCSS;
document.head.appendChild(style);

// Global error handler (fixed: structured error)
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    showNotification(e.error.message || 'An unexpected error occurred. Please refresh the page.', 'danger', 10000);
});

// Utility Functions
const Utils = {
    // Format file size
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    // Format time duration
    formatDuration: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    },
    
    // Debounce function
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Export utils to global scope
window.SaraUtils = Utils;