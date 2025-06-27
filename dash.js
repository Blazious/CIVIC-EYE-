
// DOM Elements
const loginSection = document.getElementById('login-section');
const reportSection = document.getElementById('report-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const reportForm = document.getElementById('report-form');
const gpsStatus = document.getElementById('gps-status');
const latitudeValue = document.getElementById('latitude-value');
const longitudeValue = document.getElementById('longitude-value');
const imageUpload = document.getElementById('image-upload');
const imagePreview = document.getElementById('image-preview');
const loginResponse = document.getElementById('login-response');
const reportResponse = document.getElementById('report-response');

// Application state
let accessToken = null;
let refreshToken = null;
let currentLocation = null;

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('civiceye_access');
    if (storedToken) {
        accessToken = storedToken;
        refreshToken = localStorage.getItem('civiceye_refresh');
        showReportingInterface();
    }
});

// Handle login
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showMessage(loginResponse, 'Please enter both email and password', 'error');
        return;
    }
    
    try {
        // Show loading state
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;
        
        // Send login request to Django API
        const response = await fetch('http://127.0.0.1:8000/api/users/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Save tokens
            accessToken = data.access;
            refreshToken = data.refresh;
            
            // Store tokens in localStorage
            localStorage.setItem('civiceye_access', accessToken);
            localStorage.setItem('civiceye_refresh', refreshToken);
            
            // Show reporting interface
            showReportingInterface();
        } else {
            showMessage(loginResponse, data.detail || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        showMessage(loginResponse, 'Network error. Please try again.', 'error');
    } finally {
        // Reset login button
        loginBtn.innerHTML = 'Login';
        loginBtn.disabled = false;
    }
});

// Handle logout
logoutBtn.addEventListener('click', () => {
    // Clear tokens from localStorage
    localStorage.removeItem('civiceye_access');
    localStorage.removeItem('civiceye_refresh');
    
    // Reset application state
    accessToken = null;
    refreshToken = null;
    currentLocation = null;
    
    // Show login interface
    loginSection.classList.remove('hidden');
    reportSection.classList.add('hidden');
    
    // Clear form fields
    reportForm.reset();
    imagePreview.style.display = 'none';
    latitudeValue.textContent = 'Not available';
    longitudeValue.textContent = 'Not available';
    gpsStatus.innerHTML = `
        <i class="fas fa-satellite"></i>
        <div>
            <h3>Location Status</h3>
            <p>Waiting for GPS coordinates...</p>
        </div>
    `;
});

// Handle image preview
imageUpload.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        }
        
        reader.readAsDataURL(this.files[0]);
    }
});

// Handle report submission
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form values
    const issueType = document.getElementById('issue-type').value;
    const description = document.getElementById('description').value;
    const imageFile = imageUpload.files[0];
    
    // Validate form
    if (!issueType) {
        showMessage(reportResponse, 'Please select an issue type', 'error');
        return;
    }
    
    if (!description) {
        showMessage(reportResponse, 'Please add a description', 'error');
        return;
    }
    
    if (!imageFile) {
        showMessage(reportResponse, 'Please upload an image', 'error');
        return;
    }
    
    if (!currentLocation) {
        showMessage(reportResponse, 'Location not available. Please ensure location services are enabled.', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        
        // Create form data
        const formData = new FormData();
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('issue_type', issueType);
        formData.append('description', description);
        formData.append('image', imageFile);
        
        // Send report to Django API
        const response = await fetch('http://127.0.0.1:8000/api/reports/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(reportResponse, 'Report submitted successfully! Thank you for your contribution.', 'success');
            // Reset form but keep location
            reportForm.reset();
            imagePreview.style.display = 'none';
        } else {
            const errorMsg = data.detail || Object.values(data).join(' ') || 'Failed to submit report';
            showMessage(reportResponse, errorMsg, 'error');
        }
    } catch (error) {
        showMessage(reportResponse, 'Network error. Please try again.', 'error');
    } finally {
        // Reset submit button
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Submit Report';
        submitBtn.disabled = false;
    }
});

// Show reporting interface
function showReportingInterface() {
    loginSection.classList.add('hidden');
    reportSection.classList.remove('hidden');
    getLocation();
}

// Get user's current location
function getLocation() {
    if (!navigator.geolocation) {
        gpsStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <h3>Location Error</h3>
                <p>Geolocation is not supported by your browser</p>
            </div>
        `;
        gpsStatus.classList.add('gps-error');
        return;
    }
    
    gpsStatus.innerHTML = `
        <i class="fas fa-satellite fa-spin"></i>
        <div>
            <h3>Getting Location</h3>
            <p>Please allow location access...</p>
        </div>
    `;
    
    navigator.geolocation.getCurrentPosition(
        position => {
            // Successfully got location
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
            
            // Update UI
            latitudeValue.textContent = currentLocation.latitude.toFixed(6);
            longitudeValue.textContent = currentLocation.longitude.toFixed(6);
            
            gpsStatus.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div>
                    <h3>Location Acquired</h3>
                    <p>Ready to submit report</p>
                </div>
            `;
            gpsStatus.classList.add('gps-success');
        },
        error => {
            // Failed to get location
            let errorMessage = 'Unable to retrieve your location.';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Location request denied. Please enable location services.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMessage = "The request to get location timed out.";
                    break;
            }
            
            gpsStatus.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <div>
                    <h3>Location Error</h3>
                    <p>${errorMessage}</p>
                </div>
            `;
            gpsStatus.classList.add('gps-error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Helper function to show messages
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `response-message ${type}`;
    element.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}
