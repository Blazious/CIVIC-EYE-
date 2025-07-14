const BASE_URL = 'https://7113-129-222-187-46.ngrok-free.app';
const loginBtn = document.getElementById('login-btn');
const loginResponse = document.getElementById('login-response');
const passwordToggle = document.querySelector('.password-toggle');
const passwordInput = document.getElementById('password');
const btnText = document.querySelector('.btn-text');

// Password visibility toggle
passwordToggle.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    passwordToggle.innerHTML = isPassword 
    ? '<i class="fas fa-eye-slash"></i>' 
    : '<i class="fas fa-eye"></i>';
});

// Login functionality
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
    showMessage('Please enter both email and password', 'error');
    return;
    }

    try {
    // Show loading state
    loginBtn.innerHTML = '<i class="fas fa-spinner spinner"></i>';
    loginBtn.disabled = true;

    const response = await fetch(`${BASE_URL}/api/users/login/`, {
        method: 'POST',
        headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Bypass ngrok warning
        },
        body: JSON.stringify({ 
        email: username, 
        password: password 
        })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('civiceye_access', data.access);
        localStorage.setItem('civiceye_refresh', data.refresh);
        showMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => {
        window.location.href = 'user.html';
        }, 1500);
    } else {
        const errorMsg = data.detail || 
                        (data.email ? data.email[0] : '') || 
                        (data.password ? data.password[0] : '') || 
                        'Login failed. Please try again.';
        showMessage(errorMsg, 'error');
    }
    } catch (err) {
    showMessage('Network error. Please check your connection.', 'error');
    console.error('Login error:', err);
    } finally {
    // Reset button state
    loginBtn.innerHTML = '<span class="btn-text">Login</span>';
    loginBtn.disabled = false;
    }
});

function showMessage(msg, type) {
    loginResponse.textContent = msg;
    loginResponse.className = `response-message ${type}`;
    loginResponse.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
    loginResponse.classList.add('hidden');
    }, 5000);
}

// Handle Enter key submission
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
    loginBtn.click();
    }
});