/**
 * UI Manager - Consolidates common UI state management and interaction patterns
 * Used across all apps for consistent form handling, message display, and progress tracking
 */
class UIManager {
    constructor() {
        this.messageTimers = new Map(); // Track active message timers
        this.animationFrames = new Map(); // Track active animations
    }

    /**
     * Standard form reset functionality
     * @param {Object} elements - DOM elements object
     * @param {Array} fieldsToReset - Array of field names to reset
     */
    resetForm(elements, fieldsToReset = []) {
        const defaultFields = [
            'onomatopoeiaInput',
            'startDisplay', 
            'endDisplay',
            'messageDisplay'
        ];
        
        const fields = fieldsToReset.length > 0 ? fieldsToReset : defaultFields;
        
        fields.forEach(fieldName => {
            const element = elements[fieldName];
            if (!element) return;
            
            switch (element.tagName.toLowerCase()) {
                case 'input':
                case 'textarea':
                    element.value = '';
                    break;
                case 'div':
                case 'span':
                case 'p':
                    if (fieldName.includes('Display')) {
                        element.textContent = fieldName.includes('start') || fieldName.includes('end') ? '-.--' : '';
                    } else {
                        element.textContent = '';
                    }
                    break;
            }
            
            // Reset validation states
            element.classList.remove('error', 'success', 'warning');
        });
    }

    /**
     * Standard visibility toggle functionality
     * @param {Object} elements - DOM elements object
     * @param {Object} visibilityStates - Object mapping element names to visibility states
     */
    updateVisibility(elements, visibilityStates) {
        Object.entries(visibilityStates).forEach(([elementName, isVisible]) => {
            const element = elements[elementName];
            if (element) {
                element.style.display = isVisible ? 'block' : 'none';
            }
        });
    }

    /**
     * Display success message with auto-clear functionality
     * @param {HTMLElement} messageElement - Element to display message in
     * @param {string} message - Message text
     * @param {number} duration - Auto-clear duration in ms (default: 3000)
     */
    showSuccess(messageElement, message, duration = 3000) {
        this.showMessage(messageElement, message, 'success', duration);
    }

    /**
     * Display error message with auto-clear functionality
     * @param {HTMLElement} messageElement - Element to display message in
     * @param {string} message - Message text
     * @param {number} duration - Auto-clear duration in ms (default: 5000)
     */
    showError(messageElement, message, duration = 5000) {
        this.showMessage(messageElement, message, 'error', duration);
    }

    /**
     * Display warning message with auto-clear functionality
     * @param {HTMLElement} messageElement - Element to display message in
     * @param {string} message - Message text
     * @param {number} duration - Auto-clear duration in ms (default: 4000)
     */
    showWarning(messageElement, message, duration = 4000) {
        this.showMessage(messageElement, message, 'warning', duration);
    }

    /**
     * Generic message display with styling and auto-clear
     * @param {HTMLElement} messageElement - Element to display message in
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, warning)
     * @param {number} duration - Auto-clear duration in ms
     */
    showMessage(messageElement, message, type = 'info', duration = 3000) {
        if (!messageElement) return;

        // Clear any existing timer for this element
        this.clearMessageTimer(messageElement);

        // Set message content and styling
        messageElement.textContent = message;
        messageElement.className = `message ${type}`;
        messageElement.style.display = 'block';

        // Set auto-clear timer if duration > 0
        if (duration > 0) {
            const timer = setTimeout(() => {
                this.clearMessage(messageElement);
            }, duration);
            
            this.messageTimers.set(messageElement, timer);
        }
    }

    /**
     * Clear message display
     * @param {HTMLElement} messageElement - Element to clear
     */
    clearMessage(messageElement) {
        if (!messageElement) return;

        messageElement.textContent = '';
        messageElement.className = 'message';
        messageElement.style.display = 'none';
        
        this.clearMessageTimer(messageElement);
    }

    /**
     * Clear message timer for specific element
     * @param {HTMLElement} messageElement - Element to clear timer for
     */
    clearMessageTimer(messageElement) {
        if (this.messageTimers.has(messageElement)) {
            clearTimeout(this.messageTimers.get(messageElement));
            this.messageTimers.delete(messageElement);
        }
    }

    /**
     * Update button state (enabled/disabled) with visual feedback
     * @param {HTMLElement} button - Button element
     * @param {boolean} enabled - Whether button should be enabled
     * @param {string} disabledText - Optional text to show when disabled
     */
    updateButtonState(button, enabled, disabledText = null) {
        if (!button) return;

        button.disabled = !enabled;
        
        if (enabled) {
            button.classList.remove('disabled');
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
            }
        } else {
            button.classList.add('disabled');
            if (disabledText) {
                if (!button.dataset.originalText) {
                    button.dataset.originalText = button.textContent;
                }
                button.textContent = disabledText;
            }
        }
    }

    /**
     * Update progress bar display
     * @param {HTMLElement} progressElement - Progress bar element
     * @param {number} current - Current step/value
     * @param {number} total - Total steps/maximum value
     * @param {boolean} animated - Whether to animate the change
     */
    updateProgress(progressElement, current, total, animated = true) {
        if (!progressElement || total <= 0) return;

        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        
        if (animated) {
            this.animateProgressBar(progressElement, percentage);
        } else {
            progressElement.style.width = `${percentage}%`;
        }

        // Update aria attributes for accessibility
        progressElement.setAttribute('aria-valuenow', current);
        progressElement.setAttribute('aria-valuemax', total);
        progressElement.setAttribute('aria-valuetext', `${current} of ${total}`);
    }

    /**
     * Animate progress bar change
     * @param {HTMLElement} progressElement - Progress bar element
     * @param {number} targetPercentage - Target percentage
     */
    animateProgressBar(progressElement, targetPercentage) {
        // Cancel any existing animation
        if (this.animationFrames.has(progressElement)) {
            cancelAnimationFrame(this.animationFrames.get(progressElement));
        }

        const currentWidth = parseFloat(progressElement.style.width) || 0;
        const difference = targetPercentage - currentWidth;
        const duration = 300; // ms
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentPercentage = currentWidth + (difference * easeOut);
            
            progressElement.style.width = `${currentPercentage}%`;

            if (progress < 1) {
                const frameId = requestAnimationFrame(animate);
                this.animationFrames.set(progressElement, frameId);
            } else {
                this.animationFrames.delete(progressElement);
            }
        };

        const frameId = requestAnimationFrame(animate);
        this.animationFrames.set(progressElement, frameId);
    }

    /**
     * Standard input validation with visual feedback
     * @param {HTMLElement} input - Input element to validate
     * @param {Function} validator - Validation function returning {valid: boolean, message: string}
     * @param {HTMLElement} messageElement - Optional element to show validation message
     */
    validateInput(input, validator, messageElement = null) {
        if (!input || !validator) return false;

        const result = validator(input.value);
        
        // Update input styling
        input.classList.remove('error', 'success');
        input.classList.add(result.valid ? 'success' : 'error');

        // Show validation message if provided
        if (messageElement && result.message) {
            if (result.valid) {
                this.showSuccess(messageElement, result.message, 2000);
            } else {
                this.showError(messageElement, result.message, 4000);
            }
        }

        return result.valid;
    }

    /**
     * Batch validate multiple inputs
     * @param {Array} validations - Array of {input, validator, messageElement} objects
     * @returns {boolean} - True if all validations pass
     */
    validateInputs(validations) {
        let allValid = true;
        
        validations.forEach(({input, validator, messageElement}) => {
            const isValid = this.validateInput(input, validator, messageElement);
            if (!isValid) allValid = false;
        });

        return allValid;
    }

    /**
     * Show loading state for an element
     * @param {HTMLElement} element - Element to show loading state for
     * @param {string} loadingText - Optional loading text
     */
    showLoading(element, loadingText = 'Loading...') {
        if (!element) return;

        element.classList.add('loading');
        element.disabled = true;
        
        if (!element.dataset.originalText) {
            element.dataset.originalText = element.textContent;
        }
        element.textContent = loadingText;
    }

    /**
     * Hide loading state for an element
     * @param {HTMLElement} element - Element to hide loading state for
     */
    hideLoading(element) {
        if (!element) return;

        element.classList.remove('loading');
        element.disabled = false;
        
        if (element.dataset.originalText) {
            element.textContent = element.dataset.originalText;
            delete element.dataset.originalText;
        }
    }

    /**
     * Button Loading States
     */
    
    /**
     * Set button to loading state
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Optional loading text
     */
    setButtonLoading(button, loadingText = null) {
        if (!button) return;
        
        // Store original state
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
            button.dataset.originalDisabled = button.disabled;
        }
        
        // Apply loading state
        button.classList.add('btn-loading');
        button.disabled = true;
        
        if (loadingText) {
            button.textContent = loadingText;
        }
    }
    
    /**
     * Remove button loading state
     * @param {HTMLElement} button - Button element
     */
    clearButtonLoading(button) {
        if (!button) return;
        
        button.classList.remove('btn-loading');
        
        // Restore original state
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            button.disabled = button.dataset.originalDisabled === 'true';
            
            // Clean up stored data
            delete button.dataset.originalText;
            delete button.dataset.originalDisabled;
        }
    }
    
    /**
     * Loading Overlays
     */
    
    /**
     * Show loading overlay on an element
     * @param {HTMLElement} container - Container element
     * @param {string} message - Loading message
     * @param {boolean} isDark - Use dark overlay theme
     * @returns {HTMLElement} - Created overlay element
     */
    showOverlay(container, message = 'Loading...', isDark = false) {
        if (!container) return null;
        
        // Remove existing overlay
        this.hideOverlay(container);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = `loading-overlay ${isDark ? 'loading-overlay-dark' : ''}`;
        overlay.dataset.uiManagerOverlay = 'true';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'loading-overlay-content';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const text = document.createElement('div');
        text.className = 'loading-overlay-text';
        text.textContent = message;
        
        content.appendChild(spinner);
        content.appendChild(text);
        overlay.appendChild(content);
        
        // Position container relatively if needed
        const containerStyle = getComputedStyle(container);
        if (containerStyle.position === 'static') {
            container.style.position = 'relative';
            overlay.dataset.positionAdded = 'true';
        }
        
        container.appendChild(overlay);
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
        
        return overlay;
    }
    
    /**
     * Hide loading overlay
     * @param {HTMLElement} container - Container element
     */
    hideOverlay(container) {
        if (!container) return;
        
        const overlay = container.querySelector('[data-ui-manager-overlay="true"]');
        if (!overlay) return;
        
        overlay.classList.remove('active');
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
                
                // Reset position if we added it
                if (overlay.dataset.positionAdded) {
                    container.style.position = '';
                }
            }
        }, 200); // Match CSS transition duration
    }
    
    /**
     * Show page-level loading overlay
     * @param {string} message - Loading message
     */
    showPageOverlay(message = 'Loading...') {
        this.hidePageOverlay(); // Remove existing
        
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay page-loading-overlay';
        overlay.id = 'page-loading-overlay';
        
        const content = document.createElement('div');
        content.className = 'loading-overlay-content';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner-lg';
        
        const text = document.createElement('div');
        text.className = 'loading-overlay-text';
        text.textContent = message;
        
        content.appendChild(spinner);
        content.appendChild(text);
        overlay.appendChild(content);
        
        document.body.appendChild(overlay);
        
        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
        
        return overlay;
    }
    
    /**
     * Hide page-level loading overlay
     */
    hidePageOverlay() {
        const overlay = document.getElementById('page-loading-overlay');
        if (!overlay) return;
        
        overlay.classList.remove('active');
        
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 200);
    }
    
    /**
     * Progress Indicators
     */
    
    /**
     * Set progress bar value
     * @param {HTMLElement} progressBar - Progress bar element
     * @param {number} percentage - Progress percentage (0-100)
     */
    setProgress(progressBar, percentage) {
        if (!progressBar) return;
        
        const fill = progressBar.querySelector('.progress-bar-fill');
        if (fill) {
            fill.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }
    
    /**
     * Create progress bar element
     * @param {boolean} indeterminate - Whether progress is indeterminate
     * @returns {HTMLElement} - Progress bar element
     */
    createProgressBar(indeterminate = false) {
        const progressBar = document.createElement('div');
        progressBar.className = `progress-bar ${indeterminate ? 'progress-bar-indeterminate' : ''}`;
        
        const fill = document.createElement('div');
        fill.className = 'progress-bar-fill';
        progressBar.appendChild(fill);
        
        return progressBar;
    }
    
    /**
     * Element State Management
     */
    
    /**
     * Set element to skeleton loading state
     * @param {HTMLElement} element - Element to convert to skeleton
     * @param {string} skeletonType - Type of skeleton (text, button, card, etc.)
     */
    setElementSkeleton(element, skeletonType = 'text') {
        if (!element) return;
        
        // Store original state
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
            element.dataset.originalClass = element.className;
        }
        
        // Apply skeleton
        element.className = `${element.dataset.originalClass} skeleton skeleton-${skeletonType}`;
        element.innerHTML = '';
    }
    
    /**
     * Remove skeleton loading state
     * @param {HTMLElement} element - Element to restore
     */
    clearElementSkeleton(element) {
        if (!element) return;
        
        // Restore original state
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            element.className = element.dataset.originalClass;
            
            // Clean up stored data
            delete element.dataset.originalContent;
            delete element.dataset.originalClass;
        }
    }
    
    /**
     * Show/hide elements with fade transition
     * @param {HTMLElement} element - Element to animate
     * @param {boolean} show - Whether to show or hide
     * @param {Function} callback - Optional callback when animation completes
     */
    fadeElement(element, show, callback = null) {
        if (!element) return;
        
        const animationId = `fade-${Date.now()}`;
        
        // Cancel existing animation
        if (this.animationFrames.has(element)) {
            cancelAnimationFrame(this.animationFrames.get(element));
        }
        
        if (show) {
            element.classList.remove('hidden');
            element.classList.add('fade-enter');
            
            const frame = requestAnimationFrame(() => {
                element.classList.remove('fade-enter');
                element.classList.add('fade-enter-active');
                
                setTimeout(() => {
                    element.classList.remove('fade-enter-active');
                    this.animationFrames.delete(element);
                    if (callback) callback();
                }, 200);
            });
            
            this.animationFrames.set(element, frame);
        } else {
            element.classList.add('fade-exit');
            
            const frame = requestAnimationFrame(() => {
                element.classList.remove('fade-exit');
                element.classList.add('fade-exit-active');
                
                setTimeout(() => {
                    element.classList.remove('fade-exit-active');
                    element.classList.add('hidden');
                    this.animationFrames.delete(element);
                    if (callback) callback();
                }, 200);
            });
            
            this.animationFrames.set(element, frame);
        }
    }
    
    /**
     * Utility Methods for Loading States
     */
    
    /**
     * Create spinner element
     * @param {string} size - Spinner size (sm, md, lg, xl)
     * @returns {HTMLElement} - Spinner element
     */
    createSpinner(size = 'md') {
        const spinner = document.createElement('div');
        spinner.className = size === 'md' ? 'spinner' : `spinner spinner-${size}`;
        return spinner;
    }
    
    /**
     * Add loading dots animation to text
     * @param {HTMLElement} element - Text element
     */
    addLoadingDots(element) {
        if (element) {
            element.classList.add('loading-dots');
        }
    }
    
    /**
     * Remove loading dots animation
     * @param {HTMLElement} element - Text element
     */
    removeLoadingDots(element) {
        if (element) {
            element.classList.remove('loading-dots');
        }
    }

    /**
     * Clean up all timers and animations (call on app destruction)
     */
    cleanup() {
        // Clear all message timers
        this.messageTimers.forEach(timer => clearTimeout(timer));
        this.messageTimers.clear();

        // Cancel all animation frames
        this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
        this.animationFrames.clear();
    }
}

// Create singleton instance for global use
const uiManager = new UIManager();
