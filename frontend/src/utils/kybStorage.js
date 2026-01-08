/**
 * Shared storage for KYB applications between Marketplace and Admin Dashboard
 * Uses localStorage to simulate backend database for demo purposes
 */

const STORAGE_KEY = 'zerogate_kyb_applications';

/**
 * Get all KYB applications
 * @returns {Array} Array of KYB applications
 */
export function getKYBApplications() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        return [];
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        console.error('Error parsing KYB applications:', e);
        return [];
    }
}

/**
 * Submit a new KYB application
 * @param {Object} application - The KYB application data
 * @returns {Object} The created application with ID and timestamp
 */
export function submitKYBApplication(application) {
    const applications = getKYBApplications();

    const newApplication = {
        ...application,
        id: Date.now().toString(),
        status: 'Pending',
        submittedAt: new Date().toISOString()
    };

    applications.push(newApplication);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));

    // Dispatch event so admin dashboard can listen
    window.dispatchEvent(new CustomEvent('kybApplicationSubmitted', {
        detail: newApplication
    }));

    return newApplication;
}

/**
 * Update an application status
 * @param {string} id - Application ID
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata (e.g., credentialHash)
 * @returns {Object} Updated application
 */
export function updateKYBApplication(id, status, metadata = {}) {
    const applications = getKYBApplications();
    const index = applications.findIndex(app => app.id === id);

    if (index === -1) {
        throw new Error('Application not found');
    }

    applications[index] = {
        ...applications[index],
        status,
        ...metadata,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));

    // Dispatch event for listeners
    window.dispatchEvent(new CustomEvent('kybApplicationUpdated', {
        detail: applications[index]
    }));

    return applications[index];
}

/**
 * Get application by wallet address
 * @param {string} address - Wallet address
 * @returns {Object|null} Application or null
 */
export function getApplicationByAddress(address) {
    const applications = getKYBApplications();
    return applications.find(app =>
        app.directorWalletAddress === address
    ) || null;
}

/**
 * Clear all applications (for testing)
 */
export function clearAllApplications() {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('kybApplicationsCleared'));
}
