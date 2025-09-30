import { BaseApp } from './baseApp.js';
import { DOMUtils, ValidationUtils } from './utils.js';
import { langManager } from './languageManager.js';
import { uiManager } from './uiManager.js';
import { googleSheetsService } from './googleSheetsService.js';

// Main application logic for index.html
class IndexApp extends BaseApp {
    constructor() {
        super();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            emailForm: DOMUtils.getElement("emailForm"),
            participantForm: DOMUtils.getElement("participantForm"),
            introSection: DOMUtils.getElement("introSection"),
            languageSelect: DOMUtils.getElement("languageSelect"),
            emailInput: DOMUtils.getElement("emailInput"),
            nameInput: DOMUtils.getElement("nameInput"),
            ageInput: DOMUtils.getElement("ageInput"),
            genderInput: DOMUtils.getElement("genderInput"),
            movementPracticeInput: DOMUtils.getElement("movementPracticeInput"),
            nativeLanguageInput: DOMUtils.getElement("nativeLanguageInput"),
            otherLanguageContainer: DOMUtils.getElement("otherLanguageContainer"),
            otherLanguageInput: DOMUtils.getElement("otherLanguageInput"),
            messageDisplay: DOMUtils.getElement("message")
        };
    }

    async initializeSubclass() {
        // IndexApp doesn't need additional async initialization beyond the base class
    }

    getParticipantDisplayKey() {
        return 'ui.participant_name';
    }

    setupEventListeners() {
        // Set up common event listeners from base class
        this.setupCommonEventListeners();

        // Email form submission
        if (this.elements.emailForm) {
            this.elements.emailForm.addEventListener("submit", this.handleEmailSubmit.bind(this));
        }

        // Participant form submission
        if (this.elements.participantForm) {
            this.elements.participantForm.addEventListener("submit", this.handleParticipantSubmit.bind(this));
        }

        // Native language dropdown change
        if (this.elements.nativeLanguageInput) {
            this.elements.nativeLanguageInput.addEventListener("change", this.handleLanguageChange.bind(this));
        }
    }

    async handleEmailSubmit(event) {
        event.preventDefault();
        
        const email = ValidationUtils.sanitizeInput(this.elements.emailInput.value);

        // Validate email
        if (!ValidationUtils.isValidEmail(email)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_invalid_email'));
            return;
        }

        try {
            // Show loading state on submit button
            const submitButton = event.target.querySelector('button[type="submit"]');
            
            await this.submitWithLoading(
                submitButton,
                async () => {
                    uiManager.clearMessage(this.elements.messageDisplay);

                    // Check if participant exists
                    const existingParticipantInfo = await googleSheetsService.findParticipantByEmail(
                        this.config.spreadsheetId, 
                        this.config.ParticipantSheet, 
                        email
                    );

                    if (existingParticipantInfo) {
                        // Returning participant - go directly to survey
                        localStorage.setItem("participantInfo", JSON.stringify(existingParticipantInfo));

                        // Get their existing data
                        const filteredData = await googleSheetsService.loadOnomatopoeiaData(
                            this.config.spreadsheetId, 
                            this.config.OnomatopoeiaSheet, 
                            existingParticipantInfo.participantId
                        );
                        localStorage.setItem("filteredData", JSON.stringify(filteredData));
                        
                        // Redirect to survey
                        window.location.href = "survey.html";
                    } else {
                        // New participant - show intro section and registration form
                        this.elements.introSection.style.display = "block";
                        this.elements.participantForm.style.display = "block";
                        uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('ui.welcome_message'));
                    }
                },
                langManager.getText('ui.checking_participant') || 'Checking participant...'
            );

        } catch (error) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_checking'));
            console.error("Error:", error);
        }
    }

    async handleParticipantSubmit(event) {
        event.preventDefault();
        
        const formData = this.validateAndCollectFormData();
        if (!formData) return;

        try {
            // Show loading state on submit button
            const submitButton = event.target.querySelector('button[type="submit"]');
            
            await this.submitWithLoading(
                submitButton,
                async () => {
                    // Save new participant
                    const participantInfo = await googleSheetsService.saveNewParticipant(
                        this.config.spreadsheetId, 
                        this.config.ParticipantSheet, 
                        formData
                    );

                    localStorage.setItem("participantInfo", JSON.stringify(participantInfo));
                    localStorage.setItem("filteredData", JSON.stringify([]));

                    // New participants should go to tutorial first
                    // window.location.href = "tutorial.html";
                    window.location.href = "survey.html";
                },
                langManager.getText('ui.creating_profile') || 'Creating profile...'
            );

        } catch (error) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_creating'));
            console.error("Error:", error);
        }
    }

    validateAndCollectFormData() {
        const email = ValidationUtils.sanitizeInput(this.elements.emailInput.value);
        const name = ValidationUtils.sanitizeInput(this.elements.nameInput.value);
        const age = ValidationUtils.sanitizeInput(this.elements.ageInput.value);
        const gender = this.elements.genderInput.value;
        const movementPractice = ValidationUtils.sanitizeInput(this.elements.movementPracticeInput.value);
        const nativeLanguage = this.elements.nativeLanguageInput.value;
        const otherLanguage = ValidationUtils.sanitizeInput(this.elements.otherLanguageInput.value);

        // Determine the final native language value
        const finalNativeLanguage = nativeLanguage === 'Other' ? otherLanguage : nativeLanguage;

        // Validate required fields
        if (!ValidationUtils.isValidEmail(email)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_invalid_email'));
            return null;
        }

        if (!ValidationUtils.isRequired(name)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_name_required'));
            return null;
        }

        if (!ValidationUtils.isValidAge(age)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_invalid_age'));
            return null;
        }

        if (!ValidationUtils.isRequired(gender)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_gender_required'));
            return null;
        }

        if (!ValidationUtils.isRequired(nativeLanguage)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_language_required'));
            return null;
        }

        // If "Other" is selected, validate the custom language input
        if (nativeLanguage === 'Other' && !ValidationUtils.isRequired(otherLanguage)) {
            uiManager.showError(this.elements.messageDisplay, langManager.getText('ui.error_other_language_required') || 'Please specify your native language.');
            return null;
        }

        return {
            email,
            name,
            age: parseInt(age),
            gender,
            movementPractice,
            nativeLanguage: finalNativeLanguage
        };
    }

    handleLanguageChange() {
        const selectedLanguage = this.elements.nativeLanguageInput.value;
        const otherContainer = this.elements.otherLanguageContainer;
        const otherInput = this.elements.otherLanguageInput;
        
        if (selectedLanguage === 'Other') {
            otherContainer.style.display = 'block';
            otherInput.required = true;
        } else {
            otherContainer.style.display = 'none';
            otherInput.required = false;
            otherInput.value = ''; // Clear the input when hidden
        }
    }
}

export { IndexApp };

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IndexApp();
});
