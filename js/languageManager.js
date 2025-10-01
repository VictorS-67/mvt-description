class LanguageManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.elements = {};
        this.isInitialized = false;
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

    async ensureInitialized(language = 'en') {
        if (!this.isInitialized) {
            await this.initialize(language);
        }
        return this.translations[this.currentLanguage];
    }

    updateUI() {
        const t = this.translations[this.currentLanguage];
        if (!t) return;

        // Update page title
        document.title = t.page?.title || document.title;

        // Automatically update all elements with data-lang attributes
        this.updateElementsWithDataLang();
    }

    /**
     * Modern approach: Automatically update all elements with data-lang attributes
     * This handles the majority of translations automatically
     */
    updateElementsWithDataLang() {
        // Handle lists with data-lang-list attribute
        const listElements = document.querySelectorAll('[data-lang-list]');
        listElements.forEach(element => {
            const listKey = element.getAttribute('data-lang-list');
            const translation = this.getText(listKey);

            if (Array.isArray(translation)) {
                element.innerHTML = '';
                const fragment = document.createDocumentFragment();
                translation.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.textContent = item;
                    fragment.appendChild(listItem);
                });
                element.appendChild(fragment);
            }
        });

        // Handle elements with data-lang attribute
        const elementsWithLang = document.querySelectorAll('[data-lang]');
        
        elementsWithLang.forEach(element => {
            const langKey = element.getAttribute('data-lang');
            const targetAttribute = element.getAttribute('data-lang-attr') || 'textContent';
            const translation = this.getText(langKey);
            
            if (translation && translation !== langKey) { // Only update if translation exists
                if (targetAttribute === 'textContent') {
                    element.textContent = translation;
                } else {
                    element.setAttribute(targetAttribute, translation);
                }
            }
        });
    }

    /**
     * Get translated text using dot notation (e.g., 'welcome.title')
     */
    getText(key) {
        if (!key || !this.translations[this.currentLanguage]) {
            return key;
        }
        
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return the key if translation not found
            }
        }
        
        return value || key;
    }

    async initialize(language = 'en') {
        try {
            this.currentLanguage = language;
            await this.loadLanguage(language);
            this.isInitialized = true;
            this.updateUI();
        } catch (error) {
            console.error('Failed to initialize language manager:', error);
            throw error;
        }
    }
}

const langManager = new LanguageManager();

export { LanguageManager, langManager };
