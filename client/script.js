/**
 * SECURE AUTHENTICATION DEMO - STUDENT PROJECT
 * 
 * This JavaScript file handles:
 * 1. User registration with password hashing
 * 2. User authentication and login
 * 3. Password strength validation
 * 4. Rate limiting for security
 * 5. Local storage management
 * 
 * Educational Purpose: Demonstrates client-side security concepts
 * Note: In production, use server-side authentication with proper security measures
 */

// ==========================================
// UTILITY FUNCTIONS AND CONSTANTS
// ==========================================

// Quick DOM element selector (shorthand for document.getElementById)
const $ = (id) => document.getElementById(id);

// Constants for local storage and security
const STORAGE_KEY = 'secure_auth_demo_users';
const ATTEMPTS_KEY = 'login_attempts';
const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Convert ArrayBuffer to hexadecimal string
 * Used for displaying hash values in readable format
 */
function arrayBufferToHex(buffer) {
    const byteArray = new Uint8Array(buffer);
    const hexString = Array.from(byteArray, byte => 
        byte.toString(16).padStart(2, '0')
    ).join('');
    return hexString;
}

/**
 * Generate a random salt for password hashing
 * Salt prevents rainbow table attacks by making each hash unique
 */
function generateRandomSalt() {
    const saltArray = new Uint8Array(16); // 16 bytes = 128 bits
    crypto.getRandomValues(saltArray);
    return arrayBufferToHex(saltArray);
}

/**
 * Hash password with salt using Web Crypto API
 * Uses SHA-256 algorithm (for demo - production should use bcrypt/argon2)
 */
async function hashPasswordWithSalt(password, salt) {
    const encoder = new TextEncoder();
    const combinedData = password + salt;
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(combinedData));
    return arrayBufferToHex(hashBuffer);
}

// ==========================================
// LOCAL STORAGE MANAGEMENT
// ==========================================

/**
 * Read all users from localStorage
 * Returns empty object if no users exist or error occurs
 */
function getAllUsers() {
    try {
        const userData = localStorage.getItem(STORAGE_KEY);
        return userData ? JSON.parse(userData) : {};
    } catch (error) {
        console.error('Error reading user data:', error);
        return {};
    }
}

/**
 * Save users object to localStorage
 */
function saveAllUsers(usersObject) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(usersObject));
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

/**
 * Clear all user data and login attempts
 */
function clearAllData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ATTEMPTS_KEY);
    console.log('All user data cleared');
}

// ==========================================
// SECURITY: RATE LIMITING
// ==========================================

/**
 * Record a login attempt for rate limiting
 * Prevents brute force attacks by tracking failed attempts
 */
function recordLoginAttempt(username) {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
    const currentTime = Date.now();
    
    if (!attempts[username]) {
        attempts[username] = [];
    }
    
    attempts[username].push(currentTime);
    
    // Keep only recent attempts (last 10)
    attempts[username] = attempts[username].slice(-10);
    
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
}

/**
 * Check if user has exceeded login attempt limit
 * Returns true if too many recent attempts
 */
function hasExceededAttemptLimit(username) {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
    const userAttempts = attempts[username] || [];
    const currentTime = Date.now();
    
    // Count attempts within the time window
    const recentAttempts = userAttempts.filter(
        attemptTime => currentTime - attemptTime <= ATTEMPT_WINDOW
    );
    
    return recentAttempts.length >= MAX_LOGIN_ATTEMPTS;
}

// ==========================================
// PASSWORD STRENGTH VALIDATION
// ==========================================

/**
 * Calculate password strength score (0-100)
 * Checks various criteria for a strong password
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) return 0;
    
    // Length bonus
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    
    // Character variety bonuses
    if (/[A-Z]/.test(password)) score += 20; // Uppercase letters
    if (/[a-z]/.test(password)) score += 15; // Lowercase letters
    if (/[0-9]/.test(password)) score += 20; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 20; // Special characters
    
    return Math.min(100, score);
}

/**
 * Update password strength indicator in the UI
 */
function updatePasswordStrengthUI(password) {
    const score = calculatePasswordStrength(password);
    const strengthFill = $('strength-fill');
    const strengthText = $('strength-text');
    
    // Update progress bar
    strengthFill.style.width = score + '%';
    
    // Update color and text based on strength
    if (score < 40) {
        strengthFill.className = 'strength-fill weak';
        strengthText.textContent = 'Weak password';
        strengthText.style.color = '#ef4444';
    } else if (score < 70) {
        strengthFill.className = 'strength-fill medium';
        strengthText.textContent = 'Medium strength';
        strengthText.style.color = '#f59e0b';
    } else {
        strengthFill.className = 'strength-fill strong';
        strengthText.textContent = 'Strong password';
        strengthText.style.color = '#10b981';
    }
}

// ==========================================
// UI MESSAGE FUNCTIONS
// ==========================================

/**
 * Display success message in specified container
 */
function showSuccessMessage(containerId, message) {
    const container = $(containerId);
    container.innerHTML = `<div class="message success">✅ ${message}</div>`;
}

/**
 * Display error message in specified container
 */
function showErrorMessage(containerId, message) {
    const container = $(containerId);
    container.innerHTML = `<div class="message error">❌ ${message}</div>`;
}

/**
 * Clear messages from specified container
 */
function clearMessages(containerId) {
    const container = $(containerId);
    container.innerHTML = '';
}

// ==========================================
// USER REGISTRATION FUNCTIONALITY
// ==========================================

/**
 * Handle user registration process
 */
async function handleUserRegistration(event) {
    event.preventDefault(); // Prevent form submission
    
    // Get form values
    const username = $('signup-username').value.trim();
    const password = $('signup-password').value;
    const confirmPassword = $('confirm-password').value;
    
    // Clear previous messages
    clearMessages('signup-message');
    
    // Validation checks
    if (!username || !password) {
        showErrorMessage('signup-message', 'Please fill in all fields');
        return;
    }
    
    if (username.length < 3) {
        showErrorMessage('signup-message', 'Username must be at least 3 characters long');
        return;
    }
    
    if (password !== confirmPassword) {
        showErrorMessage('signup-message', 'Passwords do not match');
        return;
    }
    
    if (calculatePasswordStrength(password) < 40) {
        showErrorMessage('signup-message', 'Password is too weak. Please choose a stronger password');
        return;
    }
    
    // Check if username already exists
    const existingUsers = getAllUsers();
    if (existingUsers[username]) {
        showErrorMessage('signup-message', 'Username already exists. Please choose a different one');
        return;
    }
    
    try {
        // Generate salt and hash password
        const salt = generateRandomSalt();
        const hashedPassword = await hashPasswordWithSalt(password, salt);
        
        // Create user object
        const newUser = {
            username: username,
            salt: salt,
            hashedPassword: hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        // Save user to storage
        existingUsers[username] = newUser;
        saveAllUsers(existingUsers);
        
        // Update UI
        showSuccessMessage('signup-message', 'Account created successfully! You can now log in');
        updateStorageDisplay();
        
        // Clear form
        $('signup-form').reset();
        updatePasswordStrengthUI('');
        
        console.log('New user registered:', username);
        
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage('signup-message', 'An error occurred during registration. Please try again');
    }
}

// ==========================================
// USER LOGIN FUNCTIONALITY
// ==========================================

/**
 * Handle user login process
 */
async function handleUserLogin(event) {
    event.preventDefault(); // Prevent form submission
    
    // Get form values
    const username = $('login-username').value.trim();
    const password = $('login-password').value;
    
    // Clear previous messages
    clearMessages('login-message');
    
    // Basic validation
    if (!username || !password) {
        showErrorMessage('login-message', 'Please enter both username and password');
        return;
    }
    
    // Check rate limiting
    if (hasExceededAttemptLimit(username)) {
        showErrorMessage('login-message', 'Too many login attempts. Please try again in 5 minutes');
        return;
    }
    
    try {
        // Get user data
        const users = getAllUsers();
        const user = users[username];
        
        // Check if user exists
        if (!user) {
            recordLoginAttempt(username);
            showErrorMessage('login-message', 'Invalid username or password');
            return;
        }
        
        // Hash the entered password with stored salt
        const hashedAttempt = await hashPasswordWithSalt(password, user.salt);
        
        // Compare hashes
        if (hashedAttempt === user.hashedPassword) {
            // Successful login
            user.lastLogin = new Date().toISOString();
            users[username] = user;
            saveAllUsers(users);
            
            showSuccessMessage('login-message', `Welcome back, ${username}! Login successful`);
            updateStorageDisplay();
            
            // Clear password field for security
            $('login-password').value = '';
            
            console.log('User logged in successfully:', username);
            
        } else {
            // Failed login
            recordLoginAttempt(username);
            showErrorMessage('login-message', 'Invalid username or password');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showErrorMessage('login-message', 'An error occurred during login. Please try again');
    }
}

// ==========================================
// DATA DISPLAY FUNCTIONS
// ==========================================

/**
 * Update the storage display to show current user data
 */
function updateStorageDisplay() {
    const users = getAllUsers();
    const storageDisplay = $('stored-data');
    
    if (Object.keys(users).length === 0) {
        storageDisplay.textContent = 'No users registered yet.';
        return;
    }
    
    // Format user data for display
    const userDataText = Object.entries(users).map(([username, userData]) => {
        return `👤 User: ${username}
🧂 Salt: ${userData.salt}
🔐 Hash: ${userData.hashedPassword}
📅 Created: ${new Date(userData.createdAt).toLocaleString()}
🕐 Last Login: ${userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'Never'}`;
    }).join('\n\n' + '─'.repeat(50) + '\n\n');
    
    storageDisplay.textContent = userDataText;
}

// ==========================================
// PASSWORD HASHING TOOL
// ==========================================

/**
 * Handle password hashing demonstration tool
 */
async function handlePasswordHashing() {
    const testPassword = $('test-password').value;
    const hashResult = $('hash-result');
    
    if (!testPassword) {
        hashResult.textContent = 'Please enter a password to hash.';
        return;
    }
    
    try {
        const salt = generateRandomSalt();
        const hash = await hashPasswordWithSalt(testPassword, salt);
        
        const resultText = `🔑 Original Password: ${testPassword}
🧂 Generated Salt: ${salt}
🔐 SHA-256 Hash: ${hash}
📏 Hash Length: ${hash.length} characters
⏰ Generated: ${new Date().toLocaleString()}

ℹ️  Note: Each time you hash the same password, you get a different result due to the random salt!`;
        
        hashResult.textContent = resultText;
        
    } catch (error) {
        console.error('Hashing error:', error);
        hashResult.textContent = 'Error occurred while hashing password.';
    }
}

/**
 * Handle clearing all user data
 */
function handleClearAllData() {
    const confirmClear = confirm(
        'Are you sure you want to clear all user accounts and data?\n\nThis action cannot be undone.'
    );
    
    if (confirmClear) {
        clearAllData();
        updateStorageDisplay();
        clearMessages('signup-message');
        clearMessages('login-message');
        $('hash-result').textContent = 'Enter a password and click "Generate Hash" to see the result.';
        
        showSuccessMessage('signup-message', 'All user data has been cleared');
        console.log('All user data cleared by user request');
    }
}

// ==========================================
// EVENT LISTENERS AND INITIALIZATION
// ==========================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Secure Authentication Demo Initialized');
    console.log('📚 Educational Demo - Client-side Authentication');
    
    // Initialize storage display
    updateStorageDisplay();
    
    // Form event listeners
    $('signup-form').addEventListener('submit', handleUserRegistration);
    $('login-form').addEventListener('submit', handleUserLogin);
    
    // Password strength monitoring
    $('signup-password').addEventListener('input', function(event) {
        updatePasswordStrengthUI(event.target.value);
    });
    
    // Tool event listeners
    $('hash-test-btn').addEventListener('click', handlePasswordHashing);
    $('clear-data-btn').addEventListener('click', handleClearAllData);
    
    // Allow Enter key to trigger hash generation
    $('test-password').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            handlePasswordHashing();
        }
    });
    
    // Console information for educational purposes
    console.log('%c🎓 Educational Information:', 'color: #4f46e5; font-weight: bold; font-size: 14px;');
    console.log('• This demo uses SHA-256 for hashing (educational purpose only)');
    console.log('• Production apps should use bcrypt, argon2, or scrypt');
    console.log('• Real authentication should happen server-side');
    console.log('• Rate limiting and other security measures are simplified');
    console.log('• Open browser DevTools to see detailed logs');
});

// ==========================================
// ADDITIONAL SECURITY DEMONSTRATIONS
// ==========================================

/**
 * Demonstrate timing attack prevention (educational)
 * In real applications, use constant-time comparison
 */
function constantTimeStringCompare(str1, str2) {
    if (str1.length !== str2.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < str1.length; i++) {
        result |= str1.charCodeAt(i) ^ str2.charCodeAt(i);
    }
    
    return result === 0;
}

/**
 * Export functions for testing (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePasswordStrength,
        generateRandomSalt,
        hashPasswordWithSalt,
        constantTimeStringCompare
    };
}