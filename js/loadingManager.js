/**
 * LoadingManager - Advanced loading state management
 * Handles complex skeleton screens, coordinated loading states, and loading orchestration
 */
class LoadingManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.activeSkeletons = new Map(); // Track active skeleton screens
        this.loadingStates = new Map(); // Track loading state per component
    }

    /**
     * Skeleton Screen Templates
     */

    /**
     * Create video list skeleton
     * @param {HTMLElement} container - Container to populate with skeleton
     * @param {number} itemCount - Number of skeleton items to show
     */
    showVideoListSkeleton(container, itemCount = 6) {
        if (!container) return;

        const skeletonId = 'video-list-skeleton';
        this.clearSkeleton(container, skeletonId);

        const skeletonContainer = document.createElement('div');
        skeletonContainer.dataset.skeletonId = skeletonId;
        skeletonContainer.className = 'skeleton-container';

        for (let i = 0; i < itemCount; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-list-item';

            // Video thumbnail skeleton
            const thumbnail = document.createElement('div');
            thumbnail.className = 'skeleton skeleton-rounded';
            thumbnail.style.width = '80px';
            thumbnail.style.height = '60px';

            // Content skeleton
            const content = document.createElement('div');
            content.className = 'skeleton-content';

            const title = document.createElement('div');
            title.className = 'skeleton skeleton-text';
            title.style.width = '70%';

            const subtitle = document.createElement('div');
            subtitle.className = 'skeleton skeleton-text-sm';
            subtitle.style.width = '50%';
            subtitle.style.marginTop = '0.5rem';

            content.appendChild(title);
            content.appendChild(subtitle);

            item.appendChild(thumbnail);
            item.appendChild(content);
            skeletonContainer.appendChild(item);
        }

        container.appendChild(skeletonContainer);
        this.activeSkeletons.set(container, skeletonId);

        return skeletonContainer;
    }

    /**
     * Create form skeleton
     * @param {HTMLElement} container - Container to populate with skeleton
     * @param {Object} config - Form skeleton configuration
     */
    showFormSkeleton(container, config = {}) {
        if (!container) return;

        const {
            fields = 3,
            hasTitle = true,
            hasButton = true,
            hasTextarea = false
        } = config;

        const skeletonId = 'form-skeleton';
        this.clearSkeleton(container, skeletonId);

        const skeletonContainer = document.createElement('div');
        skeletonContainer.dataset.skeletonId = skeletonId;
        skeletonContainer.className = 'skeleton-container';

        // Title skeleton
        if (hasTitle) {
            const title = document.createElement('div');
            title.className = 'skeleton skeleton-title';
            skeletonContainer.appendChild(title);
        }

        // Field skeletons
        for (let i = 0; i < fields; i++) {
            const fieldGroup = document.createElement('div');
            fieldGroup.style.marginBottom = '1rem';

            // Label skeleton
            const label = document.createElement('div');
            label.className = 'skeleton skeleton-text-sm';
            label.style.width = '30%';
            label.style.marginBottom = '0.5rem';

            // Input skeleton
            const input = document.createElement('div');
            input.className = 'skeleton';
            input.style.height = hasTextarea && i === fields - 1 ? '80px' : '2.5rem';
            input.style.width = '100%';

            fieldGroup.appendChild(label);
            fieldGroup.appendChild(input);
            skeletonContainer.appendChild(fieldGroup);
        }

        // Button skeleton
        if (hasButton) {
            const button = document.createElement('div');
            button.className = 'skeleton skeleton-button';
            button.style.marginTop = '1rem';
            skeletonContainer.appendChild(button);
        }

        container.appendChild(skeletonContainer);
        this.activeSkeletons.set(container, skeletonId);

        return skeletonContainer;
    }

    /**
     * Create video player skeleton
     * @param {HTMLElement} container - Container to populate with skeleton
     */
    showVideoPlayerSkeleton(container) {
        if (!container) return;

        const skeletonId = 'video-player-skeleton';
        this.clearSkeleton(container, skeletonId);

        const skeletonContainer = document.createElement('div');
        skeletonContainer.dataset.skeletonId = skeletonId;
        skeletonContainer.className = 'skeleton-container';

        // Video skeleton
        const video = document.createElement('div');
        video.className = 'skeleton-video';
        skeletonContainer.appendChild(video);

        // Controls skeleton
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.justifyContent = 'space-between';
        controls.style.alignItems = 'center';
        controls.style.marginTop = '1rem';
        controls.style.padding = '0.5rem';

        const playButton = document.createElement('div');
        playButton.className = 'skeleton skeleton-circle';
        playButton.style.width = '40px';
        playButton.style.height = '40px';

        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'skeleton skeleton-text-sm';
        timeDisplay.style.width = '60px';

        const volumeControl = document.createElement('div');
        volumeControl.className = 'skeleton skeleton-text-sm';
        volumeControl.style.width = '80px';

        controls.appendChild(playButton);
        controls.appendChild(timeDisplay);
        controls.appendChild(volumeControl);
        skeletonContainer.appendChild(controls);

        container.appendChild(skeletonContainer);
        this.activeSkeletons.set(container, skeletonId);

        return skeletonContainer;
    }

    /**
     * Create survey response skeleton
     * @param {HTMLElement} container - Container to populate with skeleton
     */
    showSurveyResponseSkeleton(container) {
        if (!container) return;

        const skeletonId = 'survey-response-skeleton';
        this.clearSkeleton(container, skeletonId);

        const skeletonContainer = document.createElement('div');
        skeletonContainer.dataset.skeletonId = skeletonId;
        skeletonContainer.className = 'skeleton-container';

        // Response cards
        for (let i = 0; i < 3; i++) {
            const card = document.createElement('div');
            card.className = 'skeleton-card';

            const header = document.createElement('div');
            header.className = 'skeleton skeleton-text';
            header.style.width = '40%';
            header.style.marginBottom = '1rem';

            const content1 = document.createElement('div');
            content1.className = 'skeleton skeleton-paragraph';

            const content2 = document.createElement('div');
            content2.className = 'skeleton skeleton-paragraph';

            const content3 = document.createElement('div');
            content3.className = 'skeleton skeleton-paragraph';
            content3.style.width = '60%';

            card.appendChild(header);
            card.appendChild(content1);
            card.appendChild(content2);
            card.appendChild(content3);
            skeletonContainer.appendChild(card);
        }

        container.appendChild(skeletonContainer);
        this.activeSkeletons.set(container, skeletonId);

        return skeletonContainer;
    }

    /**
     * Clear specific skeleton
     * @param {HTMLElement} container - Container with skeleton
     * @param {string} skeletonId - Skeleton ID to clear
     */
    clearSkeleton(container, skeletonId) {
        if (!container) return;

        const existingSkeleton = container.querySelector(`[data-skeleton-id="${skeletonId}"]`);
        if (existingSkeleton) {
            existingSkeleton.remove();
            this.activeSkeletons.delete(container);
        }
    }

    /**
     * Clear all skeletons in container
     * @param {HTMLElement} container - Container to clear
     */
    clearAllSkeletons(container) {
        if (!container) return;

        const skeletons = container.querySelectorAll('[data-skeleton-id]');
        skeletons.forEach(skeleton => skeleton.remove());
        this.activeSkeletons.delete(container);
    }

    /**
     * Coordinated Loading States
     */

    /**
     * Start loading state for a component
     * @param {string} componentId - Component identifier
     * @param {Object} config - Loading configuration
     */
    startLoading(componentId, config = {}) {
        const {
            type = 'overlay', // overlay, skeleton, button
            container = null,
            button = null,
            message = 'Loading...',
            skeletonType = 'form'
        } = config;

        // Track loading state
        this.loadingStates.set(componentId, {
            type,
            container,
            button,
            startTime: Date.now()
        });

        // Apply loading state based on type
        switch (type) {
            case 'overlay':
                if (container) {
                    this.uiManager.showOverlay(container, message);
                }
                break;

            case 'skeleton':
                if (container) {
                    switch (skeletonType) {
                        case 'video-list':
                            this.showVideoListSkeleton(container);
                            break;
                        case 'video-player':
                            this.showVideoPlayerSkeleton(container);
                            break;
                        case 'survey':
                            this.showSurveyResponseSkeleton(container);
                            break;
                        default:
                            this.showFormSkeleton(container);
                    }
                }
                break;

            case 'button':
                if (button) {
                    this.uiManager.setButtonLoading(button, message);
                }
                break;

            case 'page':
                this.uiManager.showPageOverlay(message);
                break;
        }
    }

    /**
     * Stop loading state for a component
     * @param {string} componentId - Component identifier
     * @param {Function} callback - Optional callback when loading stops
     */
    stopLoading(componentId, callback = null) {
        const loadingState = this.loadingStates.get(componentId);
        if (!loadingState) return;

        const { type, container, button } = loadingState;

        // Remove loading state based on type
        switch (type) {
            case 'overlay':
                if (container) {
                    this.uiManager.hideOverlay(container);
                }
                break;

            case 'skeleton':
                if (container) {
                    this.clearAllSkeletons(container);
                }
                break;

            case 'button':
                if (button) {
                    this.uiManager.clearButtonLoading(button);
                }
                break;

            case 'page':
                this.uiManager.hidePageOverlay();
                break;
        }

        // Clean up tracking
        this.loadingStates.delete(componentId);

        // Execute callback after animation
        if (callback) {
            setTimeout(callback, 200);
        }
    }

    /**
     * Check if component is loading
     * @param {string} componentId - Component identifier
     * @returns {boolean} - Whether component is loading
     */
    isLoading(componentId) {
        return this.loadingStates.has(componentId);
    }

    /**
     * Get loading duration for component
     * @param {string} componentId - Component identifier
     * @returns {number} - Loading duration in milliseconds
     */
    getLoadingDuration(componentId) {
        const loadingState = this.loadingStates.get(componentId);
        if (!loadingState) return 0;

        return Date.now() - loadingState.startTime;
    }

    /**
     * Stop all loading states
     */
    stopAllLoading() {
        const componentIds = Array.from(this.loadingStates.keys());
        componentIds.forEach(id => this.stopLoading(id));
    }

    /**
     * Utility Methods
     */

    /**
     * Create custom skeleton element
     * @param {Object} config - Skeleton configuration
     * @returns {HTMLElement} - Skeleton element
     */
    createCustomSkeleton(config = {}) {
        const {
            width = '100%',
            height = '1rem',
            className = '',
            rounded = false
        } = config;

        const skeleton = document.createElement('div');
        skeleton.className = `skeleton ${className} ${rounded ? 'skeleton-rounded' : ''}`;
        skeleton.style.width = width;
        skeleton.style.height = height;

        return skeleton;
    }

    /**
     * Animate content replacement with fade
     * @param {HTMLElement} container - Container element
     * @param {HTMLElement} newContent - New content to show
     * @param {Function} callback - Optional callback when complete
     */
    replaceContentWithFade(container, newContent, callback = null) {
        if (!container || !newContent) return;

        // First fade out existing content
        this.uiManager.fadeElement(container, false, () => {
            // Replace content
            container.innerHTML = '';
            container.appendChild(newContent);

            // Fade in new content
            this.uiManager.fadeElement(container, true, callback);
        });
    }

    /**
     * Clean up all loading states and animations
     */
    cleanup() {
        this.stopAllLoading();
        this.activeSkeletons.clear();
        this.loadingStates.clear();
    }
}

export { LoadingManager };
