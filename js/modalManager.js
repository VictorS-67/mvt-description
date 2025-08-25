/**
 * ModalManager - Centralized modal management system
 * Handles modal display, animations, stacking, accessibility, and events
 */
class ModalManager {
    constructor() {
        this.activeModals = new Map(); // Track active modals
        this.modalStack = []; // Handle modal stacking/layering
        this.settings = {
            animationDuration: 300,
            closeOnBackdrop: true,
            closeOnEscape: true,
            showBackdrop: true,
            backdropClass: 'modal-backdrop',
            contentClass: 'modal-content',
            overlayClass: 'modal-overlay'
        };
        
        this.setupGlobalEventListeners();
    }

    /**
     * Show a modal with optional configuration
     * @param {string} modalId - ID of the modal element
     * @param {Object} options - Modal configuration options
     * @returns {Promise} - Resolves when modal is fully shown
     */
    async showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with ID "${modalId}" not found`);
            return Promise.reject(new Error(`Modal ${modalId} not found`));
        }

        // Merge options with defaults
        const config = { ...this.settings, ...options };
        
        // Store modal configuration
        this.activeModals.set(modalId, {
            element: modal,
            config: config,
            onClose: options.onClose || null,
            onOpen: options.onOpen || null
        });

        // Add to modal stack
        this.modalStack.push(modalId);
        
        // Set up modal structure and accessibility
        this.setupModalAccessibility(modal, config);
        
        // Show modal with animation
        return this.animateModalIn(modal, config);
    }

    /**
     * Hide a modal with optional callback
     * @param {string} modalId - ID of the modal to hide
     * @param {*} result - Optional result to pass to callbacks
     * @returns {Promise} - Resolves when modal is fully hidden
     */
    async hideModal(modalId, result = null) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) {
            return Promise.resolve(); // Already hidden
        }

        const { element: modal, config, onClose } = modalData;
        
        // Animate modal out
        await this.animateModalOut(modal, config);
        
        // Clean up
        this.cleanupModal(modalId);
        
        // Call onClose callback if provided
        if (onClose && typeof onClose === 'function') {
            try {
                onClose(result);
            } catch (error) {
                console.error('Error in modal onClose callback:', error);
            }
        }
        
        return Promise.resolve(result);
    }

    /**
     * Hide the topmost modal in the stack
     */
    async hideTopModal(result = null) {
        if (this.modalStack.length === 0) return;
        
        const topModalId = this.modalStack[this.modalStack.length - 1];
        return this.hideModal(topModalId, result);
    }

    /**
     * Hide all active modals
     */
    async hideAllModals() {
        const hidePromises = [];
        for (const modalId of this.modalStack) {
            hidePromises.push(this.hideModal(modalId));
        }
        return Promise.all(hidePromises);
    }

    /**
     * Check if a specific modal is active
     * @param {string} modalId - ID of the modal to check
     * @returns {boolean}
     */
    isModalActive(modalId) {
        return this.activeModals.has(modalId);
    }

    /**
     * Check if any modal is active
     * @returns {boolean}
     */
    hasActiveModals() {
        return this.modalStack.length > 0;
    }

    /**
     * Get the currently active (topmost) modal ID
     * @returns {string|null}
     */
    getActiveModalId() {
        return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
    }

    /**
     * Create a modal programmatically
     * @param {Object} modalOptions - Modal content and configuration
     * @returns {string} - Generated modal ID
     */
    createModal({
        id = null,
        title = '',
        content = '',
        buttons = [],
        className = '',
        size = 'medium' // 'small', 'medium', 'large', 'fullscreen'
    }) {
        const modalId = id || `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create modal structure
        const modalHtml = `
            <div id="${modalId}" class="modal-overlay modal-${size} ${className}" style="display: none;">
                <div class="modal-content" role="dialog" aria-labelledby="${modalId}_title" aria-modal="true">
                    ${title ? `<h2 id="${modalId}_title" class="modal-title">${title}</h2>` : ''}
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${buttons.length > 0 ? this.createModalButtons(buttons, modalId) : ''}
                </div>
            </div>
        `;
        
        // Add to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        return modalId;
    }

    /**
     * Create confirmation modal
     * @param {Object} options - Confirmation modal options
     * @returns {Promise} - Resolves with true/false based on user choice
     */
    showConfirmation({
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        confirmClass = 'button-primary',
        cancelClass = 'button-secondary'
    }) {
        return new Promise((resolve) => {
            const modalId = this.createModal({
                title: title,
                content: `<p>${message}</p>`,
                buttons: [
                    {
                        text: cancelText,
                        class: cancelClass,
                        action: () => resolve(false)
                    },
                    {
                        text: confirmText,
                        class: confirmClass,
                        action: () => resolve(true)
                    }
                ]
            });
            
            this.showModal(modalId, {
                onClose: () => resolve(false)
            });
        });
    }

    /**
     * Create alert modal
     * @param {Object} options - Alert modal options
     * @returns {Promise} - Resolves when modal is closed
     */
    showAlert({
        title = 'Alert',
        message = '',
        buttonText = 'OK',
        buttonClass = 'button-primary'
    }) {
        return new Promise((resolve) => {
            const modalId = this.createModal({
                title: title,
                content: `<p>${message}</p>`,
                buttons: [
                    {
                        text: buttonText,
                        class: buttonClass,
                        action: () => resolve()
                    }
                ]
            });
            
            this.showModal(modalId, {
                onClose: () => resolve()
            });
        });
    }

    /**
     * Private Methods
     */

    setupModalAccessibility(modal, config) {
        // Set ARIA attributes
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.setAttribute('tabindex', '-1');
        }
        
        // Set z-index based on stack position
        const zIndex = 1000 + this.modalStack.length * 10;
        modal.style.zIndex = zIndex;
    }

    async animateModalIn(modal, config) {
        return new Promise((resolve) => {
            // Set initial state
            modal.style.display = 'flex';
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.7)';
            
            // Force reflow
            modal.offsetHeight;
            
            // Add transition class
            modal.classList.add('modal-animating');
            
            // Animate in
            requestAnimationFrame(() => {
                modal.style.transition = `opacity ${config.animationDuration}ms ease, transform ${config.animationDuration}ms ease`;
                modal.style.opacity = '1';
                modal.style.transform = 'scale(1)';
                
                setTimeout(() => {
                    modal.classList.remove('modal-animating');
                    modal.style.transition = '';
                    
                    // Focus the modal content for accessibility
                    const modalContent = modal.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.focus();
                    }
                    
                    // Call onOpen callback if provided
                    const modalData = this.activeModals.get(modal.id);
                    if (modalData && modalData.onOpen && typeof modalData.onOpen === 'function') {
                        try {
                            modalData.onOpen();
                        } catch (error) {
                            console.error('Error in modal onOpen callback:', error);
                        }
                    }
                    
                    resolve();
                }, config.animationDuration);
            });
        });
    }

    async animateModalOut(modal, config) {
        return new Promise((resolve) => {
            modal.classList.add('modal-animating');
            modal.style.transition = `opacity ${config.animationDuration}ms ease, transform ${config.animationDuration}ms ease`;
            modal.style.opacity = '0';
            modal.style.transform = 'scale(0.7)';
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('modal-animating');
                modal.style.transition = '';
                modal.style.transform = '';
                resolve();
            }, config.animationDuration);
        });
    }

    cleanupModal(modalId) {
        // Remove from active modals
        this.activeModals.delete(modalId);
        
        // Remove from stack
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }
        
        // If this was a programmatically created modal, remove from DOM
        const modal = document.getElementById(modalId);
        if (modal && modal.dataset.programmatic === 'true') {
            modal.remove();
        }
    }

    createModalButtons(buttons, modalId) {
        const buttonsHtml = buttons.map(button => {
            const buttonId = `${modalId}_${button.text.toLowerCase().replace(/\s+/g, '_')}`;
            return `
                <button 
                    id="${buttonId}" 
                    class="button ${button.class || 'button-primary'}"
                    data-modal-action="${button.text}"
                >
                    ${button.text}
                </button>
            `;
        }).join(' ');
        
        return `<div class="modal-buttons">${buttonsHtml}</div>`;
    }

    setupGlobalEventListeners() {
        // Handle backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                const modalId = e.target.id;
                const modalData = this.activeModals.get(modalId);
                
                if (modalData && modalData.config.closeOnBackdrop) {
                    this.hideModal(modalId);
                }
            }
        });

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalStack.length > 0) {
                const topModalId = this.modalStack[this.modalStack.length - 1];
                const modalData = this.activeModals.get(topModalId);
                
                if (modalData && modalData.config.closeOnEscape) {
                    this.hideModal(topModalId);
                }
            }
        });

        // Handle modal button clicks
        document.addEventListener('click', (e) => {
            if (e.target.hasAttribute('data-modal-action')) {
                const modalOverlay = e.target.closest('.modal-overlay');
                if (modalOverlay) {
                    const modalId = modalOverlay.id;
                    this.hideModal(modalId, e.target.dataset.modalAction);
                }
            }
        });
    }
}

// Create global modal manager instance
const modalManager = new ModalManager();

// Make it available globally
window.modalManager = modalManager;
