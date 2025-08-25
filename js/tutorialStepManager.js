/**
 * Tutorial Step Manager - Simplifies step progression and validation
 * Extracted from tutorialApp.js to provide cleaner step management
 */
class TutorialStepManager {
    constructor(totalSteps = 10) {
        this.totalSteps = totalSteps;
        this.currentStep = 1;
        this.stepValidation = {};
        
        // Define step configurations with validation rules and behavior
        this.stepConfigs = {
            1: { type: 'intro', required: false, autoAdvance: false },
            2: { type: 'action', required: true, autoAdvance: true, validation: 'video_played' },
            3: { type: 'info', required: false, autoAdvance: false },
            4: { type: 'action', required: true, autoAdvance: true, validation: 'clicked_yes' },
            5: { type: 'input', required: true, autoAdvance: false, validation: 'entered_text' },
            6: { type: 'action', required: true, autoAdvance: true, validation: 'clicked_start_time' },
            7: { type: 'action', required: true, autoAdvance: true, validation: 'clicked_end_time' },
            8: { type: 'info', required: false, autoAdvance: false },
            9: { type: 'action', required: true, autoAdvance: true, validation: 'clicked_save' },
            10: { type: 'completion', required: false, autoAdvance: false }
        };

        // Define required action messages for user feedback
        this.requiredActionMessages = {
            2: "Please play the video to continue.",
            4: "Please click the 'Yes' button to continue.",
            5: "Please enter some text in the onomatopoeia field to continue.",
            6: "Please click the 'Get Start Time' button to continue.",
            7: "Please click the 'Get End Time' button to continue.",
            9: "Please click the 'Save Onomatopoeia' button to continue.",
            12: "Please click the 'No' button to continue."
        };

        // Initialize validation tracking
        this.resetValidation();
    }

    /**
     * Reset validation tracking for all steps
     */
    resetValidation() {
        this.stepValidation = {
            video_played: false,
            clicked_yes: false,
            entered_text: false,
            clicked_start_time: false,
            clicked_end_time: false,
            clicked_save: false
        };
    }

    /**
     * Get current step number
     */
    getCurrentStep() {
        return this.currentStep;
    }

    /**
     * Get total number of steps
     */
    getTotalSteps() {
        return this.totalSteps;
    }

    /**
     * Get configuration for a specific step
     */
    getStepConfig(stepNumber = this.currentStep) {
        return this.stepConfigs[stepNumber] || {};
    }

    /**
     * Check if current step can advance
     */
    canAdvance() {
        const config = this.getStepConfig();
        
        if (!config.required) {
            return true;
        }

        if (config.validation && this.stepValidation.hasOwnProperty(config.validation)) {
            return this.stepValidation[config.validation];
        }

        return true;
    }

    /**
     * Get required action message for current step
     */
    getRequiredActionMessage() {
        return this.requiredActionMessages[this.currentStep] || null;
    }

    /**
     * Advance to next step if possible
     * @param {Function} onAdvance - Callback when step advances
     * @param {Function} onRequiredAction - Callback when action is required
     */
    advance(onAdvance = null, onRequiredAction = null) {
        if (!this.canAdvance()) {
            const message = this.getRequiredActionMessage();
            if (onRequiredAction && message) {
                onRequiredAction(message);
            }
            return false;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            
            // Reset validation flags that are step-specific
            this.resetStepSpecificValidation();
            
            if (onAdvance) {
                onAdvance(this.currentStep);
            }
            
            return true;
        }

        return false;
    }

    /**
     * Go to previous step
     * @param {Function} onGoBack - Callback when going back
     */
    goBack(onGoBack = null) {
        if (this.currentStep > 1) {
            this.currentStep--;
            
            // Reset validation flags that are step-specific
            this.resetStepSpecificValidation();
            
            if (onGoBack) {
                onGoBack(this.currentStep);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Reset validation flags that shouldn't persist across steps
     */
    resetStepSpecificValidation() {
        // Keep persistent validations (like video_played, entered_text, etc.)
        // Reset only temporary/interaction validations if needed
        // For now, we keep all validations as they represent user progress
    }

    /**
     * Mark a validation action as completed
     * @param {string} action - The action that was completed
     * @param {Function} onValidationChange - Callback when validation changes
     * @param {Function} onAutoAdvance - Callback for auto-advance steps
     */
    markActionCompleted(action, onValidationChange = null, onAutoAdvance = null) {
        if (this.stepValidation.hasOwnProperty(action)) {
            this.stepValidation[action] = true;
            
            if (onValidationChange) {
                onValidationChange(action, true);
            }

            // Check for auto-advance
            const config = this.getStepConfig();
            if (config.autoAdvance && config.validation === action) {
                if (onAutoAdvance) {
                    onAutoAdvance(this.currentStep, action);
                }
            }
        }
    }

    /**
     * Check if a specific action is completed
     */
    isActionCompleted(action) {
        return this.stepValidation[action] || false;
    }

    /**
     * Get progress percentage
     */
    getProgressPercentage() {
        return (this.currentStep / this.totalSteps) * 100;
    }

    /**
     * Check if tutorial is complete
     */
    isComplete() {
        return this.currentStep >= this.totalSteps;
    }

    /**
     * Go to specific step (for testing or special cases)
     * @param {number} stepNumber - Step to go to
     * @param {Function} onStepChange - Callback when step changes
     */
    goToStep(stepNumber, onStepChange = null) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.currentStep = stepNumber;
            
            if (onStepChange) {
                onStepChange(this.currentStep);
            }
            
            return true;
        }
        
        return false;
    }

    /**
     * Get validation status summary
     */
    getValidationStatus() {
        const status = {};
        Object.keys(this.stepValidation).forEach(key => {
            status[key] = this.stepValidation[key];
        });
        return status;
    }

    /**
     * Export current state for persistence
     */
    exportState() {
        return {
            currentStep: this.currentStep,
            stepValidation: { ...this.stepValidation },
            totalSteps: this.totalSteps
        };
    }

    /**
     * Import state from persistence
     */
    importState(state) {
        if (state.currentStep) {
            this.currentStep = Math.max(1, Math.min(state.currentStep, this.totalSteps));
        }
        
        if (state.stepValidation) {
            Object.keys(this.stepValidation).forEach(key => {
                if (state.stepValidation.hasOwnProperty(key)) {
                    this.stepValidation[key] = state.stepValidation[key];
                }
            });
        }
        
        if (state.totalSteps) {
            this.totalSteps = state.totalSteps;
        }
    }
}
