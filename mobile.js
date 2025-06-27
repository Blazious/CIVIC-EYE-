// === CONFIGURATION ===
const BASE_URL = 'https://7113-129-222-187-46.ngrok-free.app';




// === DOM Elements ===
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

// === Application State ===
let accessToken = null;
let refreshToken = null;
let currentLocation = null;

// === Load Tokens on Page Load ===
window.addEventListener('DOMContentLoaded', () => {
    const storedToken = localStorage.getItem('civiceye_access');
    if (storedToken) {
        accessToken = storedToken;
        refreshToken = localStorage.getItem('civiceye_refresh');
        showReportingInterface();
    }
});

// === Handle Login ===
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showMessage(loginResponse, 'Please enter both email and password', 'error');
        return;
    }

    try {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;

        const response = await fetch(`${BASE_URL}/api/users/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password: password })
        });

        const data = await response.json();

        if (response.ok) {
            accessToken = data.access;
            refreshToken = data.refresh;
            localStorage.setItem('civiceye_access', accessToken);
            localStorage.setItem('civiceye_refresh', refreshToken);
            showReportingInterface();
        } else {
            showMessage(loginResponse, data.detail || 'Login failed. Please check your credentials.', 'error');
        }
    } catch (error) {
        showMessage(loginResponse, 'Network error. Please try again.', 'error');
    } finally {
        loginBtn.innerHTML = 'Login';
        loginBtn.disabled = false;
    }
});

// === Handle Logout ===
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('civiceye_access');
    localStorage.removeItem('civiceye_refresh');
    accessToken = null;
    refreshToken = null;
    currentLocation = null;

    loginSection.classList.remove('hidden');
    reportSection.classList.add('hidden');
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

// === Image Preview on Upload ===
imageUpload.addEventListener('change', function () {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(this.files[0]);
    }
});

// === Report Submission ===
reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const issueType = document.getElementById('issue-type').value;
    const description = document.getElementById('description').value;
    const imageFile = imageUpload.files[0];

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
        showMessage(reportResponse, 'Location not available. Please enable GPS.', 'error');
        return;
    }

    try {
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        const formData = new FormData();
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('issue_type', issueType);
        formData.append('description', description);
        formData.append('image', imageFile);

        const response = await fetch(`${BASE_URL}/api/reports/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(reportResponse, 'Report submitted successfully!', 'success');
            reportForm.reset();
            imagePreview.style.display = 'none';
        } else {
            const errorMsg = data.detail || Object.values(data).join(' ') || 'Failed to submit report';
            showMessage(reportResponse, errorMsg, 'error');
        }
    } catch (error) {
        showMessage(reportResponse, 'Network error. Please try again.', 'error');
    } finally {
        const submitBtn = reportForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Submit Report';
        submitBtn.disabled = false;
    }
});

// === Show Reporting UI ===
function showReportingInterface() {
    loginSection.classList.add('hidden');
    reportSection.classList.remove('hidden');
    getLocation();
}

// === Geolocation ===
function getLocation() {
    if (!navigator.geolocation) {
        gpsStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <h3>Location Error</h3>
                <p>Geolocation not supported by your browser</p>
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
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

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
            let errorMessage = 'Unable to retrieve your location.';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location request denied.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location info unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out.';
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

// === Show Temporary Messages ===
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `response-message ${type}`;
    element.classList.remove('hidden');

    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}
