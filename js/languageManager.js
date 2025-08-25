class LanguageManager {
    static instance = null;
    
    constructor() {
        if (LanguageManager.instance) {
            return LanguageManager.instance;
        }
        
        this.currentLanguage = 'en';
        this.translations = {};
        this.elements = {};
        this.isInitialized = false;
        
        LanguageManager.instance = this;
    }
    
    static getInstance() {
        if (!LanguageManager.instance) {
            LanguageManager.instance = new LanguageManager();
        }
        return LanguageManager.instance;
    }

    async loadLanguage(language) {
        try {
            const response = await fetch(`./lang/${language}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load language file: ${language}.json`);
            }
            this.translations[language] = await response.json();
            return this.translations[language];
        } catch (error) {
            console.error('Error loading language:', error);
            // Fallback to English if language file fails to load
            if (language !== 'en') {
                return await this.loadLanguage('en');
            }
            throw error;
        }
    }

    async switchLanguage(language) {
        this.currentLanguage = language;
        
        // Load language if not already loaded
        if (!this.translations[language]) {
            await this.loadLanguage(language);
        }

        this.updateUI();
    }

    updateUI() {
        const t = this.translations[this.currentLanguage];
        if (!t) return;

        // Update page title
        document.title = t.page.title;

        // Update welcome section
        this.updateElement('welcomeTitle', t.welcome.title);
        this.updateElement('welcomeIntro', t.welcome.introduction);
        this.updateElement('welcomeDescription', t.welcome.description);

        // Update instructions
        this.updateElement('instructionsTitle', t.instructions.title);
        this.updateInstructionsList(t.instructions.steps);

        // Update additional info
        this.updateElement('noOnomatopoeia', t.additional_info.no_onomatopoeia);
        this.updateElement('aboutOnomatopoeia', t.additional_info.about_onomatopoeia);
        this.updateElement('intuitionEmphasis', t.additional_info.intuition_emphasis);

        // Update form elements
        this.updateElement('profileTitle', t.form.profile_title);
        this.updateElement('nameLabel', t.form.name_label);
        this.updateElement('nameInput', t.form.name_placeholder, 'placeholder');
        this.updateElement('ageLabel', t.form.age_label);
        this.updateElement('ageInput', t.form.age_placeholder, 'placeholder');
        this.updateElement('genderLabel', t.form.gender_label);
        this.updateElement('movementPracticeLabel', t.form.movement_practice_label);
        this.updateElement('movementPracticeInput', t.form.movement_practice_placeholder, 'placeholder');
        this.updateElement('nativeLanguageLabel', t.form.native_language_label);
        this.updateElement('submitButton', t.form.submit_button);

        // Update select options
        this.updateSelectOptions('genderInput', t.form.gender_options);
        this.updateSelectOptions('nativeLanguageInput', t.form.native_language_options);

        // Update UI elements
        this.updateElement('emailLabel', t.ui.email_label);
        this.updateElement('emailInput', t.ui.email_placeholder, 'placeholder');
        this.updateElement('nextButton', t.ui.next_button);

        // Update survey elements (if they exist on the page)
        if (t.survey) {
            this.updateElement('buttonLogout', t.survey.logout_button);
            this.updateElement('videoTitle', t.survey.video_title);
            this.updateElement('selectVideoTitle', t.survey.select_video_title);
            this.updateElement('savedOnomatopoeiaTitle', t.survey.saved_onomatopoeia_title);
            this.updateElement('recordOnomatopoeia', t.survey.no_saved_onomatopoeia);
            this.updateElement('questionText', t.survey.question_text);
            this.updateElement('hasOnomatopoeiaButtonYes', t.survey.yes_button);
            this.updateElement('hasOnomatopoeiaButtonNo', t.survey.no_button);
            this.updateElement('step1Text', t.survey.step1_text);
            this.updateElement('onomatopoeiaLabel', t.survey.onomatopoeia_label);
            this.updateElement('onomatopoeiaInput', t.survey.onomatopoeia_placeholder, 'placeholder');
            this.updateElement('step2Text', t.survey.step2_text);
            this.updateElement('getStart', t.survey.get_start_button);
            this.updateElement('startTimeLabel', t.survey.start_time_label);
            this.updateElement('step3Text', t.survey.step3_text);
            this.updateElement('getEnd', t.survey.get_end_button);
            this.updateElement('endTimeLabel', t.survey.end_time_label);
            this.updateElement('saveOnomatopoeia', t.survey.save_button);
            
            // Update audio elements
            this.updateElement('audioSectionTitle', t.survey.audio_section_title);
            this.updateElement('audioRecord', t.survey.audio_record_button);
            this.updateElement('audioStop', t.survey.audio_stop_button);
            this.updateElement('audioPlay', t.survey.audio_play_button);
            this.updateElement('audioDelete', t.survey.audio_delete_button);
            this.updateElement('audioStatus', t.survey.audio_status_ready);
            
            // Update completion modal elements (if they exist)
            this.updateElement('surveyCompletionTitle', t.survey.completion_title);
            this.updateElement('surveyCompletionText', t.survey.completion_text);
            this.updateElement('startReasoningButton', t.survey.continue_to_reasoning);
            
            // Update page title for survey page
            if (document.querySelector('#myVideo')) {
                document.title = t.survey.page_title;
            }
        }

        // Update reasoning page elements (if they exist)
        if (t.reasoning) {
            this.updateElement('reasoningPageTitle', t.reasoning.page_title);
            this.updateElement('reasoningSectionTitle', t.reasoning.section_title);
            this.updateElement('noOnomatopoeiaText', t.reasoning.no_onomatopoeia);
            
            // Update page title for reasoning page
            if (document.querySelector('#onomatopoeiaList')) {
                document.title = t.reasoning.page_title;
            }
        }
    }

    updateElement(id, text, attribute = 'textContent') {
        const element = document.getElementById(id);
        if (element && text !== undefined && text !== null) {
            if (attribute === 'textContent') {
                element.textContent = text;
            } else {
                element.setAttribute(attribute, text);
            }
        }
    }

    updateInstructionsList(steps) {
        const listElement = document.getElementById('instructionsList');
        if (listElement && steps) {
            listElement.innerHTML = '';
            steps.forEach(step => {
                const li = document.createElement('li');
                li.textContent = step;
                listElement.appendChild(li);
            });
        }
    }

    updateSelectOptions(selectId, options) {
        const selectElement = document.getElementById(selectId);
        if (selectElement && options) {
            // Clear existing options
            selectElement.innerHTML = '';
            
            // Add placeholder option
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = options.placeholder;
            selectElement.appendChild(placeholderOption);
            
            // Add other options based on the select type
            if (selectId === 'genderInput') {
                this.addOption(selectElement, 'Female', options.female);
                this.addOption(selectElement, 'Male', options.male);
                this.addOption(selectElement, 'Other', options.other);
                this.addOption(selectElement, 'Prefer not to say', options.prefer_not_to_say);
            } else if (selectId === 'nativeLanguageInput') {
                this.addOption(selectElement, 'Japanese', options.japanese);
                this.addOption(selectElement, 'English', options.english);
                this.addOption(selectElement, 'Other', options.other);
            }
        }
    }

    addOption(selectElement, value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        selectElement.appendChild(option);
    }

    getText(path) {
        const t = this.translations[this.currentLanguage];
        // Check if translations exist before attempting property access
        if (!t) {
            console.warn(`Translations not loaded for language: ${this.currentLanguage}`);
            return path; // Return the path as fallback
        }
        return this.getNestedProperty(t, path) || path;
    }   


    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    async initialize() {
        if (this.isInitialized) {
            return; // Already initialized
        }
        
        // Load only default language initially
        await this.loadLanguage('en');
        this.updateUI();
        this.isInitialized = true;
    }

    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.isInitialized;
    }
}

// Create global language manager instance using singleton
const langManager = LanguageManager.getInstance();
