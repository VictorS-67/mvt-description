import { langManager } from './languageManager.js';
import { ConfigManager } from './utils.js';
import { VideoManager } from './videoManager.js';
import { uiManager } from './uiManager.js';
import { LoadingManager } from './loadingManager.js';

// Base Application Class
// Common functionality shared across all app classes

class BaseApp {
    constructor() {
        this.elements = {};
        this.config = null;
        this.participantInfo = null;
        this.videoManager = null; // Will be initialized by subclasses that need it
        
        // Initialize UI and Loading managers
        this.uiManager = uiManager; // Global instance
        this.loadingManager = new LoadingManager(this.uiManager);
        
        // Track loading states for this app instance
        this.activeLoadingStates = new Set();
        
        // Allow subclasses to initialize their specific elements first
        this.initializeElements();
        
        // Start the common initialization process
        this.initialize();
    }

    // Abstract method - must be implemented by subclasses
    initializeElements() {
        throw new Error("initializeElements() must be implemented by subclass");
    }

    async initialize() {
        try {
            // Show page loading during initialization
            this.startLoading('app-init', {
                type: 'page',
                message: 'Initializing application...'
            });
            
            // Initialize language manager and configuration in parallel
            const [_langInitialized, config] = await Promise.all([
                langManager.ensureInitialized(),
                ConfigManager.getSheetConfig()
            ]);
            
            this.config = config;
            console.log('Configuration loaded');

            // Call subclass-specific initialization
            await this.initializeSubclass();
            
            // Hide page loading
            this.stopLoading('app-init');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.stopLoading('app-init');
            this.handleInitializationError(error);
        }
    }

    // Abstract method - implemented by subclasses for their specific initialization
    async initializeSubclass() {
        // Default implementation - can be overridden
    }

    handleInitializationError(error) {
        if (this.elements.messageDisplay) {
            uiManager.showError(this.elements.messageDisplay, 'Failed to initialize application');
        }
    }

    setupCommonEventListeners() {
        // Language switching - common across all apps
        if (this.elements.languageSelect) {
            this.elements.languageSelect.addEventListener("change", async (event) => {
                const selectedLanguage = event.target.value;
                await langManager.switchLanguage(selectedLanguage);
                this.onLanguageChange();
            });
        }

        // Logout button - common across most apps
        if (this.elements.buttonLogout) {
            this.elements.buttonLogout.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    // Method called when language changes - can be overridden by subclasses
    onLanguageChange() {
        this.updateParticipantDisplay();
    }

    updateParticipantDisplay() {
        if (this.elements.nameDisplay && this.participantInfo) {
            const participantName = this.participantInfo.name || this.participantInfo.email;
            // Get the appropriate translation key based on the app type
            const textKey = this.getParticipantDisplayKey();
            this.elements.nameDisplay.textContent = langManager.getText(textKey) + participantName;
        }
    }

    // Abstract method - each app can specify its own translation key
    getParticipantDisplayKey() {
        return 'ui.participant_name'; // Default fallback
    }

    handleLogout() {
        localStorage.removeItem("participantInfo");
        localStorage.removeItem("filteredData");
        
        // Allow subclasses to add additional cleanup
        this.performAdditionalLogoutCleanup();
        
        window.location.href = "index.html";
    }

    // Hook for subclasses to add additional logout cleanup
    performAdditionalLogoutCleanup() {
        // Default implementation - can be overridden
    }

    // Video Manager initialization helper
    initializeVideoManager(onVideoChangeCallback = null, onVideoLoadCallback = null) {
        if (this.elements.videoPlayer && this.elements.videoButtons) {
            this.videoManager = new VideoManager(
                this.elements.videoPlayer,
                this.elements.videoButtons,
                this.elements.videoTitle
            );
            
            // Set up callbacks if provided
            if (onVideoChangeCallback) {
                this.videoManager.onVideoChange = onVideoChangeCallback;
            }
            if (onVideoLoadCallback) {
                this.videoManager.onVideoLoad = onVideoLoadCallback;
            }
            
            return this.videoManager;
        } else {
            console.warn('VideoManager requires videoPlayer and videoButtons elements');
            return null;
        }
    }

    // Common participant info validation and loading
    loadAndValidateParticipantInfo() {
        this.participantInfo = JSON.parse(localStorage.getItem("participantInfo"));
        
        if (!this.participantInfo) {
            alert("Warning, no participant information found");
            window.location.href = "index.html";
            return false;
        }
        
        return true;
    }

    // Common message clearing utility
    clearMessage() {
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }
    }

    // Common success message display
    showSuccess(message) {
        if (this.elements.messageDisplay) {
            uiManager.showSuccess(this.elements.messageDisplay, message);
        }
    }

    // Common error message display
    showError(message) {
        if (this.elements.messageDisplay) {
            uiManager.showError(this.elements.messageDisplay, message);
        }
    }
    
    /**
     * Loading State Management Hooks
     */
    
    /**
     * Start loading state for a component
     * @param {string} componentId - Unique identifier for loading state
     * @param {Object} config - Loading configuration
     */
    startLoading(componentId, config = {}) {
        this.loadingManager.startLoading(componentId, config);
        this.activeLoadingStates.add(componentId);
    }
    
    /**
     * Stop loading state for a component
     * @param {string} componentId - Component identifier
     * @param {Function} callback - Optional callback when loading stops
     */
    stopLoading(componentId, callback = null) {
        this.loadingManager.stopLoading(componentId, callback);
        this.activeLoadingStates.delete(componentId);
    }
    
    /**
     * Check if component is loading
     * @param {string} componentId - Component identifier
     * @returns {boolean} - Whether component is loading
     */
    isLoading(componentId) {
        return this.loadingManager.isLoading(componentId);
    }
    
    /**
     * Start button loading state
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Optional loading text
     */
    startButtonLoading(button, loadingText = null) {
        this.uiManager.setButtonLoading(button, loadingText);
    }
    
    /**
     * Stop button loading state
     * @param {HTMLElement} button - Button element
     */
    stopButtonLoading(button) {
        this.uiManager.clearButtonLoading(button);
    }
    
    /**
     * Show overlay on container
     * @param {HTMLElement} container - Container element
     * @param {string} message - Loading message
     * @param {boolean} isDark - Use dark theme
     */
    showOverlay(container, message = 'Loading...', isDark = false) {
        return this.uiManager.showOverlay(container, message, isDark);
    }
    
    /**
     * Hide overlay from container
     * @param {HTMLElement} container - Container element
     */
    hideOverlay(container) {
        this.uiManager.hideOverlay(container);
    }
    
    /**
     * Show skeleton screen
     * @param {HTMLElement} container - Container element
     * @param {string} skeletonType - Type of skeleton (form, video-list, video-player, survey)
     */
    showSkeleton(container, skeletonType = 'form') {
        const componentId = `skeleton-${Date.now()}`;
        this.startLoading(componentId, {
            type: 'skeleton',
            container,
            skeletonType
        });
        return componentId;
    }
    
    /**
     * Hide skeleton screen
     * @param {string} componentId - Component ID returned from showSkeleton
     */
    hideSkeleton(componentId) {
        this.stopLoading(componentId);
    }
    
    /**
     * Execute async operation with loading state
     * @param {string} componentId - Component identifier
     * @param {Function} operation - Async operation to execute
     * @param {Object} loadingConfig - Loading configuration
     * @returns {Promise} - Operation result
     */
    async withLoading(componentId, operation, loadingConfig = {}) {
        try {
            this.startLoading(componentId, loadingConfig);
            const result = await operation();
            this.stopLoading(componentId);
            return result;
        } catch (error) {
            this.stopLoading(componentId);
            throw error;
        }
    }
    
    /**
     * Execute form submission with loading state
     * @param {HTMLElement} button - Submit button
     * @param {Function} submitOperation - Async submit operation
     * @param {string} loadingText - Loading button text
     * @returns {Promise} - Submit result
     */
    async submitWithLoading(button, submitOperation, loadingText = 'Submitting...') {
        try {
            this.startButtonLoading(button, loadingText);
            const result = await submitOperation();
            this.stopButtonLoading(button);
            return result;
        } catch (error) {
            this.stopButtonLoading(button);
            throw error;
        }
    }
    
    /**
     * Cleanup method - stop all loading states
     */
    cleanup() {
        // Stop all active loading states
        this.activeLoadingStates.forEach(componentId => {
            this.stopLoading(componentId);
        });
        
        // Clean up loading manager
        this.loadingManager.cleanup();
        
        // Call subclass cleanup if it exists
        if (typeof this.performAdditionalCleanup === 'function') {
            this.performAdditionalCleanup();
        }
    }
    
    /**
     * Abstract method for subclass-specific cleanup
     */
    performAdditionalCleanup() {
        // Default implementation - can be overridden
    }
}

export { BaseApp };
