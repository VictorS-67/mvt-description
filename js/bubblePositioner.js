/**
 * Bubble Positioner - Utility for positioning tutorial bubbles relative to target elements
 * Extracted from tutorialApp.js for reusable positioning logic
 */
class BubblePositioner {
    /**
     * Position a bubble element near a target element with intelligent placement
     * @param {HTMLElement} bubble - The bubble element to position
     * @param {HTMLElement} target - The target element to position near
     * @param {Array} preferences - Preferred positioning order ['right', 'left', 'below', 'above']
     * @param {Object} options - Additional positioning options
     */
    static positionNear(bubble, target, preferences = ['right', 'left', 'below', 'above'], options = {}) {
        const defaultOptions = {
            offset: 20,           // Distance from target element
            viewportPadding: 20,  // Minimum distance from viewport edges
            scrollIntoView: true  // Whether to scroll target into view first
        };
        
        const config = { ...defaultOptions, ...options };

        // First scroll target into view if requested
        if (config.scrollIntoView) {
            return this.scrollElementIntoView(target).then(() => {
                return this.performPositioning(bubble, target, preferences, config);
            });
        } else {
            return Promise.resolve(this.performPositioning(bubble, target, preferences, config));
        }
    }

    /**
     * Perform the actual positioning logic
     */
    static performPositioning(bubble, target, preferences, config) {
        // Get target element position and dimensions
        const targetRect = target.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get bubble dimensions by temporarily making it visible
        const originalVisibility = bubble.style.visibility;
        const originalDisplay = bubble.style.display;
        
        bubble.style.visibility = 'hidden';
        bubble.style.display = 'block';
        const bubbleRect = bubble.getBoundingClientRect();
        bubble.style.visibility = originalVisibility;
        
        // If bubble wasn't originally displayed, restore original display
        if (originalDisplay !== 'block') {
            bubble.style.display = originalDisplay;
            bubble.style.display = 'block'; // But keep it visible for positioning
        }

        // Calculate target center for arrow direction calculation
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        // Generate position strategies based on preferences
        const positionStrategies = this.generatePositionStrategies(
            targetRect, 
            bubbleRect, 
            config.offset, 
            preferences
        );

        // Find the best position that fits in viewport
        const bestPosition = this.findBestPosition(
            positionStrategies, 
            bubbleRect, 
            viewportWidth, 
            viewportHeight, 
            config.viewportPadding
        );

        // Calculate final arrow direction
        const arrowDirection = this.calculateArrowDirection(
            bestPosition, 
            bubbleRect, 
            targetCenterX, 
            targetCenterY
        );

        // Apply the positioning
        this.applyPosition(bubble, bestPosition, arrowDirection);

        return {
            position: bestPosition,
            arrow: arrowDirection,
            targetRect,
            bubbleRect
        };
    }

    /**
     * Generate position strategies based on preferences
     */
    static generatePositionStrategies(targetRect, bubbleRect, offset, preferences) {
        const strategies = {
            right: {
                left: targetRect.right + offset,
                top: targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2),
                arrow: 'arrow-left'
            },
            left: {
                left: targetRect.left - bubbleRect.width - offset,
                top: targetRect.top + (targetRect.height / 2) - (bubbleRect.height / 2),
                arrow: 'arrow-right'
            },
            below: {
                left: targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2),
                top: targetRect.bottom + offset,
                arrow: 'arrow-top'
            },
            above: {
                left: targetRect.left + (targetRect.width / 2) - (bubbleRect.width / 2),
                top: targetRect.top - bubbleRect.height - offset,
                arrow: 'arrow-bottom'
            }
        };

        // Return strategies in preferred order
        return preferences.map(pref => strategies[pref]).filter(Boolean);
    }

    /**
     * Find the best position that fits within viewport constraints
     */
    static findBestPosition(strategies, bubbleRect, viewportWidth, viewportHeight, padding) {
        // Try each strategy in order
        for (const strategy of strategies) {
            const fitsHorizontally = strategy.left >= padding && 
                                   strategy.left + bubbleRect.width <= viewportWidth - padding;
            const fitsVertically = strategy.top >= padding && 
                                 strategy.top + bubbleRect.height <= viewportHeight - padding;

            if (fitsHorizontally && fitsVertically) {
                return strategy;
            }
        }

        // If no strategy fits perfectly, adjust the first one to fit
        const fallbackStrategy = strategies[0] || strategies.right;
        return this.constrainToViewport(fallbackStrategy, bubbleRect, viewportWidth, viewportHeight, padding);
    }

    /**
     * Constrain position to viewport bounds
     */
    static constrainToViewport(position, bubbleRect, viewportWidth, viewportHeight, padding) {
        return {
            left: Math.max(padding, Math.min(position.left, viewportWidth - bubbleRect.width - padding)),
            top: Math.max(padding, Math.min(position.top, viewportHeight - bubbleRect.height - padding)),
            arrow: position.arrow
        };
    }

    /**
     * Calculate arrow direction based on final bubble position relative to target
     */
    static calculateArrowDirection(bubblePosition, bubbleRect, targetCenterX, targetCenterY) {
        const bubbleCenterX = bubblePosition.left + bubbleRect.width / 2;
        const bubbleCenterY = bubblePosition.top + bubbleRect.height / 2;

        // Calculate relative position
        const deltaX = bubbleCenterX - targetCenterX;
        const deltaY = bubbleCenterY - targetCenterY;

        // Determine primary direction (horizontal vs vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal positioning is dominant
            return deltaX > 0 ? 'arrow-left' : 'arrow-right';
        } else {
            // Vertical positioning is dominant  
            return deltaY > 0 ? 'arrow-top' : 'arrow-bottom';
        }
    }

    /**
     * Apply the calculated position and arrow to the bubble element
     */
    static applyPosition(bubble, position, arrowDirection) {
        // Set position
        bubble.style.position = 'fixed';
        bubble.style.left = `${position.left}px`;
        bubble.style.top = `${position.top}px`;

        // Update arrow direction by removing old arrow classes and adding new one
        bubble.className = bubble.className.replace(/arrow-\w+(-\w+)?/g, '');
        bubble.classList.add(arrowDirection);
    }

    /**
     * Scroll element into view with smooth animation
     */
    static scrollElementIntoView(element) {
        return new Promise((resolve) => {
            // Check if element is already fully visible
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            const isFullyVisible = rect.top >= 0 && 
                                  rect.left >= 0 && 
                                  rect.bottom <= viewportHeight && 
                                  rect.right <= viewportWidth;
            
            if (isFullyVisible) {
                resolve();
                return;
            }
            
            // Calculate scroll position to center element in viewport
            const elementCenter = rect.top + rect.height / 2;
            const viewportCenter = viewportHeight / 2;
            const scrollOffset = elementCenter - viewportCenter;
            
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            const targetScroll = Math.max(0, currentScroll + scrollOffset);
            
            // Perform smooth scroll
            this.smoothScrollTo(targetScroll, resolve);
        });
    }

    /**
     * Smooth scroll implementation
     */
    static smoothScrollTo(targetScroll, callback) {
        const startScroll = window.pageYOffset || document.documentElement.scrollTop;
        const distance = targetScroll - startScroll;
        const duration = 300; // ms
        const startTime = performance.now();

        const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out animation
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentScroll = startScroll + (distance * ease);
            
            window.scrollTo(0, currentScroll);

            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                // Wait a bit for layout to settle before resolving
                setTimeout(callback, 50);
            }
        };

        requestAnimationFrame(animateScroll);
    }

    /**
     * Get element mapping for tutorial steps
     * This provides a centralized way to map steps to their target elements
     */
    static getStepElementMapping(elements) {
        return {
            1: elements.languageSelect?.parentElement, // Language selector
            2: elements.videoPlayer, // Video player
            3: elements.videoPlayer, // Video timeline (same as player)
            4: elements.hasOnomatopoeiaButtonYes, // Yes button
            5: elements.onomatopoeiaInput, // Input field
            6: elements.getStart, // Start time button
            7: elements.getEnd, // End time button
            8: elements.audioRecord, // Audio record button
            9: elements.saveOnomatopoeiaButton, // Save button
            10: elements.videoButtons // Video buttons colors explanation
        };
    }

    /**
     * Position bubble for a specific tutorial step
     */
    static positionForStep(bubble, stepNumber, elements, preferences = undefined) {
        const elementMap = this.getStepElementMapping(elements);
        const targetElement = elementMap[stepNumber];
        
        if (!targetElement || !bubble) {
            console.warn(`Cannot position bubble for step ${stepNumber}: missing target element or bubble`);
            return Promise.resolve(null);
        }

        // Use step-specific preferences if not provided
        if (!preferences) {
            preferences = this.getStepPositioningPreferences(stepNumber);
        }

        return this.positionNear(bubble, targetElement, preferences);
    }

    /**
     * Get positioning preferences for specific tutorial steps
     */
    static getStepPositioningPreferences(stepNumber) {
        const stepPreferences = {
            1: ['below', 'right', 'left', 'above'], // Language selector - below preferred
            2: ['right', 'left', 'above', 'below'], // Video player - side preferred
            3: ['above', 'below', 'right', 'left'], // Video timeline
            4: ['right', 'left', 'below', 'above'], // Yes button - right preferred
            5: ['above', 'below', 'right', 'left'], // Input field - above preferred
            6: ['right', 'left', 'below', 'above'], // Start time button
            7: ['right', 'left', 'below', 'above'], // End time button
            8: ['above', 'right', 'left', 'below'], // Audio record button
            9: ['above', 'right', 'left', 'below'], // Save button - above preferred
            10: ['above', 'below', 'right', 'left'] // Video buttons colors explanation
        };

        return stepPreferences[stepNumber] || ['right', 'left', 'below', 'above'];
    }
}

export { BubblePositioner };
