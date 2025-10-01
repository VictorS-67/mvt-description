import { langManager } from './languageManager.js';

// General utility functions and classes

// Utility function to get current timestamp in ISO format
function obtainDate() {
    return new Date().toISOString().split('.')[0] + 'Z';
}

// Configuration manager for common app settings (Singleton pattern)
class ConfigManager {
    static instance = null;
    static configCache = null;
    
    static async getSheetConfig() {
        if (this.configCache) {
            return this.configCache;
        }
        
        try {
            const response = await fetch('./sheet-info.json');
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.statusText}`);
            }
            this.configCache = await response.json();
            return this.configCache;
        } catch (error) {
            console.error('Error loading configuration:', error);
            throw error;
        }
    }
    
    // Clear cache if needed (for testing purposes)
    static clearCache() {
        this.configCache = null;
    }
}

// Validation utilities
class ValidationUtils {
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static isValidAge(age) {
        const numAge = parseInt(age);
        return !isNaN(numAge) && numAge > 0 && numAge < 150;
    }
    
    static isRequired(value) {
        return value && value.trim().length > 0;
    }
    
    static sanitizeInput(input) {
        return input ? input.trim() : '';
    }
    
    static validateOnomatopoeiaData(infoDict) {
        if (!infoDict.movement || infoDict.movement.trim() === "") {
            return {
                isValid: false,
                errorMessage: langManager.getText('survey.error_enter_onomatopoeia')
            };
        }
        
        if (infoDict.startTime === "-.--") {
            return {
                isValid: false,
                errorMessage: langManager.getText('survey.error_record_start')
            };
        }
        
        if (infoDict.endTime === "-.--") {
            return {
                isValid: false,
                errorMessage: langManager.getText('survey.error_record_end')
            };
        }
        
        if (!infoDict.participantId || !infoDict.video || !infoDict.answeredTimestamp) {
            return {
                isValid: false,
                errorMessage: langManager.getText('survey.error_saving_general')
            };
        }
        
        return { isValid: true };
    }
}

// DOM utilities for safe element access and interaction
class DOMUtils {
    /**
     * Safely click an element with null-checking
     * @param {HTMLElement} element - Element to click
     */
    static safeClick(element) {
        if (element && typeof element.click === 'function') {
            element.click();
        } else {
            console.warn('Cannot click element:', element);
        }
    }
    
    /**
     * Safely get a data attribute from an element
     * @param {HTMLElement} element - Element to get data from
     * @param {string} key - Data attribute key (without 'data-' prefix)
     * @returns {string|null} - Data attribute value or null
     */
    static safeGetDataset(element, key) {
        return element && element.dataset ? element.dataset[key] : null;
    }
}

export { obtainDate, ConfigManager, ValidationUtils, DOMUtils };
