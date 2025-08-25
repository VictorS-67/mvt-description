// Main application logic for reasoning.html
class ReasoningApp extends BaseApp {
    constructor() {
        // Must call super() first before accessing 'this'
        super();

        // Initialize reasoning-specific properties after calling super()
        this.onomatopoeiaData = [];
        this.reasoningData = [];
        this.currentVideoName = null;
        this.currentOnomatopoeiaIndex = 0;
        this.carouselManager = new CarouselManager();
        
        // All onomatopoeia entries for the global carousel
        this.allOnomatopoeiaEntries = [];
        
        // Track if completion modal has been shown
        this.completionModalShown = false;
    }

    initializeElements() {
        this.elements = {
            nameDisplay: DOMUtils.getElement("nameDisplay"),
            buttonLogout: DOMUtils.getElement("buttonLogout"),
            videoTitle: DOMUtils.getElement("videoTitle"),
            videoPlayer: DOMUtils.getElement("myVideo"),
            messageDisplay: DOMUtils.getElement("message"),
            languageSelect: DOMUtils.getElement("languageSelect"),
            reasoningPageTitle: DOMUtils.getElement("reasoningPageTitle"),
            progressDisplay: DOMUtils.getElement("progressDisplay"),
            reasoningSectionTitle: DOMUtils.getElement("reasoningSectionTitle"),
            onomatopoeiaList: DOMUtils.getElement("onomatopoeiaList"),
            noOnomatopoeiaMessage: DOMUtils.getElement("noOnomatopoeiaMessage"),
            noOnomatopoeiaText: DOMUtils.getElement("noOnomatopoeiaText"),
            prevOnomatopoeia: DOMUtils.getElement("prevOnomatopoeia"),
            nextOnomatopoeia: DOMUtils.getElement("nextOnomatopoeia"),
            onomatopoeiaCounter: DOMUtils.getElement("onomatopoeiaCounter"),
            toggleIntroduction: DOMUtils.getElement("toggleIntroduction"),
            introductionText: DOMUtils.getElement("introductionText"),
            reasoningCompletionModal: DOMUtils.getElement("reasoningCompletionModal"),
            stayOnPageButton: DOMUtils.getElement("stayOnPageButton")
        };
    }

    async initializeSubclass() {
        try {
            // Check if survey was completed
            const surveyCompleted = localStorage.getItem("surveyCompleted");
            if (!surveyCompleted) {
                alert("Please complete the survey first.");
                window.location.href = "survey.html";
                return;
            }

            // Load and validate participant info using base class method
            if (!this.loadAndValidateParticipantInfo()) {
                return; // Base class handles the redirect
            }

            // Load onomatopoeia data from localStorage
            this.onomatopoeiaData = JSON.parse(localStorage.getItem("filteredData")) || [];

            // Filter out null onomatopoeia entries
            this.onomatopoeiaData = this.onomatopoeiaData.filter(item => item.movement !== "null");

            if (this.onomatopoeiaData.length === 0) {
                alert("No onomatopoeia data found. Please complete the survey first.");
                window.location.href = "survey.html";
                return;
            }

            // Load existing reasoning data if any
            this.reasoningData = JSON.parse(localStorage.getItem("reasoningData")) || [];

            // Load existing reasoning data from Google Sheets
            await this.loadExistingReasoningData();
            
            // Initialize the global onomatopoeia carousel
            this.initializeGlobalOnomatopoeiaCarousel();
            
            // Set up event listeners
            this.setupEventListeners();

            // Initialize translated elements
            this.initializeTranslatedElements();

            // Update participant name display
            this.updateParticipantDisplay();

            // Update progress display
            this.updateProgressDisplay();

        } catch (error) {
            console.error('Failed to initialize reasoning app:', error);
            this.showError('Failed to initialize reasoning page');
        }
    }

    getParticipantDisplayKey() {
        return 'reasoning.participant_name';
    }

    onLanguageChange() {
        super.onLanguageChange(); // Call base class method
        this.updateProgressDisplay();
        
        // Update all translated elements
        this.initializeTranslatedElements();
        
        // Update introduction toggle button text based on current state
        if (this.elements.toggleIntroduction && this.elements.introductionText) {
            const isVisible = this.elements.introductionText.style.display !== 'none';
            this.elements.toggleIntroduction.textContent = isVisible 
                ? langManager.getText('reasoning.hide_introduction')
                : langManager.getText('reasoning.show_introduction');
        }
        
        // Update only the carousel content without reinitializing
        if (this.allOnomatopoeiaEntries.length > 0) {
            this.updateCarouselContent();
        }
    }

    initializeGlobalOnomatopoeiaCarousel() {
        // Store all onomatopoeia entries for the global carousel
        this.allOnomatopoeiaEntries = [...this.onomatopoeiaData];
        
        if (this.allOnomatopoeiaEntries.length === 0) {
            console.error('No onomatopoeia entries found');
            if (this.elements.noOnomatopoeiaMessage) {
                this.elements.noOnomatopoeiaMessage.style.display = 'block';
            }
            return;
        }

        // Set initial state
        this.currentOnomatopoeiaIndex = 0;
        
        // Update video for the first onomatopoeia entry
        this.updateVideoForCurrentOnomatopoeia();
        
        // Create and populate the carousel with all onomatopoeia entries
        this.displayAllOnomatopoeiaInCarousel();
    }

    updateVideoForCurrentOnomatopoeia() {
        if (this.currentOnomatopoeiaIndex >= 0 && this.currentOnomatopoeiaIndex < this.allOnomatopoeiaEntries.length) {
            const currentEntry = this.allOnomatopoeiaEntries[this.currentOnomatopoeiaIndex];
            
            // Update current video name
            this.currentVideoName = currentEntry.video;
            
            // Update video player
            if (this.elements.videoPlayer) {
                this.elements.videoPlayer.src = `videos/${this.currentVideoName}`;
                this.elements.videoPlayer.title = this.currentVideoName;
                this.elements.videoPlayer.load(); // Reload the video
            }
            
            // Clear any existing messages when changing videos
            if (this.elements.messageDisplay) {
                uiManager.clearMessage(this.elements.messageDisplay);
            }
            
        }
    }

    displayAllOnomatopoeiaInCarousel() {
        if (!this.elements.onomatopoeiaList) return;

        // Clear existing content
        this.elements.onomatopoeiaList.innerHTML = '';

        // Create slides for all onomatopoeia entries
        this.allOnomatopoeiaEntries.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            
            // Check if this entry has existing reasoning
            const existingReasoning = this.reasoningData.find(reasoning => 
                reasoning.participantId == this.participantInfo.participantId &&
                reasoning.video === item.video &&
                reasoning.movement === item.movement &&
                parseFloat(reasoning.startTime) === parseFloat(item.startTime) &&
                parseFloat(reasoning.endTime) === parseFloat(item.endTime)
            );
            
            // Add visual cue class if reasoning exists
            if (existingReasoning && existingReasoning.reasoning && existingReasoning.reasoning.trim() !== '') {
                slide.classList.add('has-reasoning');
            }
            
            slide.innerHTML = this.createReasoningEntryHTML(item, index);
            this.elements.onomatopoeiaList.appendChild(slide);
        });

        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            // Initialize the carousel
            this.initializeCarousel();
        });
        
        // Hide the no onomatopoeia message
        if (this.elements.noOnomatopoeiaMessage) {
            this.elements.noOnomatopoeiaMessage.style.display = 'none';
        }
    }

    performAdditionalLogoutCleanup() {
        localStorage.removeItem("reasoningData");
        localStorage.removeItem("surveyCompleted");
    }

    async loadExistingReasoningData() {
        try {
            // Use the service to load onomatopoeia data with reasoning
            const onomatopoeiaData = await googleSheetsService.loadOnomatopoeiaData(
                this.config.spreadsheetId, 
                this.config.OnomatopoeiaSheet, 
                this.participantInfo.participantId
            );
            
            // Extract reasoning data from onomatopoeia data
            const sheetReasoningData = onomatopoeiaData
                .filter(item => item.reasoning && item.reasoning.trim() !== '')
                .map(item => ({
                    participantId: item.participantId,
                    participantName: item.participantName,
                    video: item.video,
                    movement: item.movement,
                    startTime: parseFloat(item.startTime),
                    endTime: parseFloat(item.endTime),
                    answeredTimestamp: item.answeredTimestamp,
                    reasoning: item.reasoning
                }));

            // Merge with local data, prioritizing sheet data for conflicts
            const mergedData = [...sheetReasoningData];
            
            // Add any local reasoning data that's not in the sheet
            this.reasoningData.forEach(localEntry => {
                const existsInSheet = sheetReasoningData.some(sheetEntry => 
                    sheetEntry.participantId === localEntry.participantId &&
                    sheetEntry.video === localEntry.video &&
                    sheetEntry.movement === localEntry.movement &&
                    sheetEntry.startTime === localEntry.startTime &&
                    sheetEntry.endTime === localEntry.endTime
                );
                
                if (!existsInSheet) {
                    mergedData.push(localEntry);
                }
            });

            this.reasoningData = mergedData;
            
            // Update local storage with merged data
            localStorage.setItem("reasoningData", JSON.stringify(this.reasoningData));
            
            
        } catch (error) {
            console.error('Error loading existing reasoning data from Google Sheets:', error);
            console.warn('Continuing with local reasoning data only');
        }
    }

    setupEventListeners() {
        // Set up common event listeners from base class
        this.setupCommonEventListeners();

        // Introduction toggle
        if (this.elements.toggleIntroduction) {
            this.elements.toggleIntroduction.addEventListener('click', () => {
                this.toggleIntroduction();
            });
        }

        // Completion modal "Stay on Page" button
        if (this.elements.stayOnPageButton) {
            this.elements.stayOnPageButton.addEventListener('click', () => {
                this.hideCompletionModal();
            });
        }

        // Navigation is now handled entirely by CarouselManager
        // Removed duplicate event listeners for prevOnomatopoeia and nextOnomatopoeia

        // Keyboard navigation for carousel
        document.addEventListener('keydown', (event) => {
            if (this.allOnomatopoeiaEntries.length > 1) {
                if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    this.navigateOnomatopoeia(-1);
                } else if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    this.navigateOnomatopoeia(1);
                }
            }
        });
    }

    updateProgressDisplay() {
        const totalOnomatopoeia = this.onomatopoeiaData.length;
        const completedReasoning = this.reasoningData.length;
        
        if (this.elements.progressDisplay) {
            const progressText = langManager.getText('reasoning.progress')
                .replace('{completed}', completedReasoning)
                .replace('{total}', totalOnomatopoeia);
            this.elements.progressDisplay.textContent = progressText;
        }

        // Check if all reasoning is complete and show completion modal
        if (completedReasoning > 0 && completedReasoning === totalOnomatopoeia && !this.completionModalShown) {
            // Small delay to let the user see the progress update
            setTimeout(() => {
                this.showCompletionModal();
                this.completionModalShown = true;
            }, 1000);
        }
    }

    initializeCarousel() {
        const carousel = this.carouselManager.initialize(
            '.onomatopoeia-swiper',
            {
                // Custom configuration can be added here
                effect: 'slide',
                speed: 300,
            },
            (slideIndex) => {
                this.currentOnomatopoeiaIndex = slideIndex;
                // Update video when user swipes to different onomatopoeia
                this.updateVideoForCurrentOnomatopoeia();
            }
        );
        
        if (carousel) {
            // Set up event listeners for all slides after carousel is initialized
            requestAnimationFrame(() => {
                setTimeout(() => this.setupSlideEventListeners(), 50);
            });
        } else {
            console.error('Failed to initialize carousel');
        }
    }

    navigateOnomatopoeia(direction) {
        // Use CarouselManager navigation
        if (direction > 0) {
            this.carouselManager.slideNext();
        } else if (direction < 0) {
            this.carouselManager.slidePrev();
        }
    }

    playOnomatopoeiaSegment(startTime, endTime) {
        if (!this.elements.videoPlayer) return;

        // Set video to start time and play
        this.elements.videoPlayer.currentTime = startTime;
        this.elements.videoPlayer.play();

        // Set up event listener to pause at end time
        const checkTime = () => {
            if (this.elements.videoPlayer.currentTime >= endTime) {
                this.elements.videoPlayer.pause();
                this.elements.videoPlayer.removeEventListener('timeupdate', checkTime);
            }
        };

        this.elements.videoPlayer.addEventListener('timeupdate', checkTime);
    }

    async saveReasoning(onomatopoeiaItem, reasoningText, slideMessage = null, saveButton = null) {
        try {
            // Validate minimum character requirement
            if (reasoningText.length < 5) {
                if (slideMessage) {
                    this.showSlideMessage(slideMessage, langManager.getText('reasoning.error_min_characters'), 'error');
                } else {
                    uiManager.showError(this.elements.messageDisplay, langManager.getText('reasoning.error_min_characters'));
                }
                return;
            }

            // Temporarily disable save button to prevent double-clicking
            if (saveButton) {
                saveButton.disabled = true;
                const originalText = saveButton.textContent;
                saveButton.textContent = langManager.getText('reasoning.saving_button');
                
                // Re-enable after 2 seconds
                setTimeout(() => {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText;
                }, 2000);
            }

            const reasoningEntry = {
                participantId: this.participantInfo.participantId,
                participantName: this.participantInfo.name || this.participantInfo.email,
                video: onomatopoeiaItem.video,
                onomatopoeia: onomatopoeiaItem.onomatopoeia,
                startTime: onomatopoeiaItem.startTime,
                endTime: onomatopoeiaItem.endTime,
                reasoning: reasoningText,
                answeredTimestamp: obtainDate()
            };

            // Save to Google Sheets (add reasoning column to existing Onomatopoeia sheet)
            await this.saveReasoningToSheet(reasoningEntry);

            // Update local reasoning data
            const existingIndex = this.reasoningData.findIndex(item => 
                item.participantId == reasoningEntry.participantId &&
                item.video === reasoningEntry.video &&
                item.onomatopoeia === reasoningEntry.onomatopoeia &&
                parseFloat(item.startTime) === parseFloat(reasoningEntry.startTime) &&
                parseFloat(item.endTime) === parseFloat(reasoningEntry.endTime)
            );

            if (existingIndex >= 0) {
                this.reasoningData[existingIndex] = reasoningEntry;
            } else {
                this.reasoningData.push(reasoningEntry);
            }

            // Save to localStorage
            localStorage.setItem("reasoningData", JSON.stringify(this.reasoningData));

            // Update progress display
            this.updateProgressDisplay();

            // Show success message
            if (slideMessage) {
                this.showSlideMessage(slideMessage, langManager.getText('reasoning.success_saved'), 'success');
                // After success message disappears, show the saved reasoning
                setTimeout(() => {
                    this.showSavedReasoning(slideMessage, reasoningText);
                }, 3000);
                
                // Add visual cue to the current slide
                const currentSlide = slideMessage.closest('.swiper-slide');
                if (currentSlide) {
                    currentSlide.classList.add('has-reasoning');
                }
            } else {
                uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('reasoning.success_saved'));
            }

        } catch (error) {
            console.error('Error saving reasoning:', error);
            
            // Re-enable button on error
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = langManager.getText('reasoning.save_button');
            }
            
            if (slideMessage) {
                this.showSlideMessage(slideMessage, langManager.getText('reasoning.error_saving'), 'error');
            } else {
                uiManager.showError(this.elements.messageDisplay, langManager.getText('reasoning.error_saving'));
            }
        }
    }

    async saveReasoningToSheet(reasoningEntry) {
        try {
            // Use the GoogleSheetsService to update reasoning
            await googleSheetsService.updateReasoning(
                this.config.spreadsheetId,
                this.config.OnomatopoeiaSheet,
                reasoningEntry.participantId,
                reasoningEntry.video,
                reasoningEntry.movement,
                reasoningEntry.startTime,
                reasoningEntry.endTime,
                reasoningEntry.reasoning
            );
        } catch (error) {
            console.error('Error saving reasoning to sheet:', error);
            // Don't throw the error - allow local storage to work even if sheet update fails
            console.warn('Reasoning saved locally but not synced to Google Sheets');
        }
    }

    createReasoningEntryHTML(onomatopoeiaItem, index) {
        // Find existing reasoning for this onomatopoeia
        const existingReasoning = this.reasoningData.find(reasoning => 
            reasoning.participantId == this.participantInfo.participantId &&
            reasoning.video === onomatopoeiaItem.video &&
            reasoning.onomatopoeia === onomatopoeiaItem.onomatopoeia &&
            parseFloat(reasoning.startTime) === parseFloat(onomatopoeiaItem.startTime) &&
            parseFloat(reasoning.endTime) === parseFloat(onomatopoeiaItem.endTime)
        );

        const reasoningText = existingReasoning ? existingReasoning.reasoning : '';
        const charCount = reasoningText.length;
        
        // Prepare the saved reasoning message if it exists
        let savedReasoningMessage = '';
        if (reasoningText.trim() !== '') {
            const truncatedReasoning = reasoningText.length > 50 
                ? reasoningText.substring(0, 50) + '...'
                : reasoningText;
            savedReasoningMessage = langManager.getText('reasoning.saved_reasoning')
                .replace('{reasoning}', truncatedReasoning);
        }

        return `
            <div class="reasoning-entry">
                <div class="onomatopoeia-header">
                    <div class="onomatopoeia-info">
                        <span class="onomatopoeia-text">${langManager.getText('reasoning.onomatopoeia_for_video')
                            .replace('{video}', onomatopoeiaItem.video)
                            .replace('{onomatopoeia}', onomatopoeiaItem.movement)}</span>
                        <span class="time-range">${langManager.getText('reasoning.time_range')
                            .replace('{start}', onomatopoeiaItem.startTime)
                            .replace('{end}', onomatopoeiaItem.endTime)}</span>
                        ${onomatopoeiaItem.hasAudio === 1 ? '<span class="audio-icon">🎵</span>' : ''}
                    </div>
                    <button class="show-button" data-start="${onomatopoeiaItem.startTime}" data-end="${onomatopoeiaItem.endTime}">
                        ${langManager.getText('reasoning.show_button')}
                    </button>
                </div>
                <div class="reasoning-input-container">
                    <label class="reasoning-label">${langManager.getText('reasoning.reasoning_label')}</label>
                    <textarea 
                        class="reasoning-textarea" 
                        placeholder="${langManager.getText('reasoning.reasoning_placeholder')}"
                        data-video="${onomatopoeiaItem.video}"
                        data-onomatopoeia="${onomatopoeiaItem.movement}"
                        data-start="${onomatopoeiaItem.startTime}"
                        data-end="${onomatopoeiaItem.endTime}"
                    >${reasoningText}</textarea>
                    <div class="slide-message ${reasoningText.trim() !== '' ? 'saved-reasoning' : ''}" style="display: ${reasoningText.trim() !== '' ? 'block' : 'none'};">${savedReasoningMessage}</div>
                    <div class="reasoning-actions">
                        <button class="save-reasoning-button" data-index="${index}" ${charCount < 5 ? 'disabled' : ''}>
                            ${langManager.getText('reasoning.save_button')}
                        </button>
                        <div class="character-count">
                            <span class="char-count">${charCount}</span>/5 min
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupSlideEventListeners() {        
        // Set up event listeners for all slides in the carousel
        const slides = this.elements.onomatopoeiaList.querySelectorAll('.swiper-slide');
        
        slides.forEach((slide, slideIndex) => {
            const showButton = slide.querySelector('.show-button');
            const textarea = slide.querySelector('.reasoning-textarea');
            const saveButton = slide.querySelector('.save-reasoning-button');
            const charCountSpan = slide.querySelector('.char-count');
            
            if (showButton) {
                showButton.addEventListener('click', () => {
                    this.playOnomatopoeiaSegment(
                        parseFloat(showButton.dataset.start),
                        parseFloat(showButton.dataset.end)
                    );
                });
            }

            if (textarea && charCountSpan && saveButton) {
                textarea.addEventListener('input', () => {
                    charCountSpan.textContent = textarea.value.length;
                    // Enable/disable save button based on minimum character requirement
                    uiManager.updateButtonState(saveButton, textarea.value.trim().length >= 5);
                });

                saveButton.addEventListener('click', () => {
                    const onomatopoeiaItem = this.allOnomatopoeiaEntries[slideIndex];
                    if (onomatopoeiaItem) {
                        // Get the slide message element
                        const slideMessage = slide.querySelector('.slide-message');
                        this.saveReasoning(onomatopoeiaItem, textarea.value.trim(), slideMessage, saveButton);
                    } else {
                        console.error('No onomatopoeia item found for slide index', slideIndex);
                    }
                });
            }
        });
    }

    toggleIntroduction() {
        const isVisible = this.elements.introductionText.style.display !== 'none';
        
        if (isVisible) {
            this.elements.introductionText.style.display = 'none';
            this.elements.toggleIntroduction.textContent = langManager.getText('reasoning.show_introduction');
        } else {
            this.elements.introductionText.style.display = 'block';
            this.elements.toggleIntroduction.textContent = langManager.getText('reasoning.hide_introduction');
        }
    }

    showSlideMessage(messageElement, text, type = 'info') {
        if (!messageElement) return;
        
        messageElement.textContent = text;
        messageElement.className = `slide-message ${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }

    showSavedReasoning(messageElement, reasoningText) {
        if (!messageElement) return;
        
        const truncatedReasoning = reasoningText.length > 50 
            ? reasoningText.substring(0, 50) + '...'
            : reasoningText;
            
        const savedMessage = langManager.getText('reasoning.saved_reasoning')
            .replace('{reasoning}', truncatedReasoning);
        
        messageElement.textContent = savedMessage;
        messageElement.className = 'slide-message saved-reasoning';
        messageElement.style.display = 'block';
        // This message stays visible (no auto-hide)
    }

    showCompletionModal() {
        if (this.elements.reasoningCompletionModal) {
            this.elements.reasoningCompletionModal.style.display = 'flex';
        }
    }

    hideCompletionModal() {
        if (this.elements.reasoningCompletionModal) {
            this.elements.reasoningCompletionModal.style.display = 'none';
        }
    }

    updateCarouselContent() {
        if (!this.elements.onomatopoeiaList) return;

        // Store the current slide index to preserve user position
        const currentIndex = this.currentOnomatopoeiaIndex;

        // Clear existing content
        this.elements.onomatopoeiaList.innerHTML = '';

        // Create slides for all onomatopoeia entries with updated translations
        this.allOnomatopoeiaEntries.forEach((item, index) => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            
            // Check if this entry has existing reasoning
            const existingReasoning = this.reasoningData.find(reasoning => 
                reasoning.participantId == this.participantInfo.participantId &&
                reasoning.video === item.video &&
                reasoning.onomatopoeia === item.onomatopoeia &&
                parseFloat(reasoning.startTime) === parseFloat(item.startTime) &&
                parseFloat(reasoning.endTime) === parseFloat(item.endTime)
            );
            
            // Add visual cue class if reasoning exists
            if (existingReasoning && existingReasoning.reasoning && existingReasoning.reasoning.trim() !== '') {
                slide.classList.add('has-reasoning');
            }
            
            slide.innerHTML = this.createReasoningEntryHTML(item, index);
            this.elements.onomatopoeiaList.appendChild(slide);
        });

        // Update the carousel to refresh its content and restore position
        if (this.carouselManager && this.carouselManager.swiper) {
            this.carouselManager.swiper.update();
            // Restore the previous slide position
            this.carouselManager.swiper.slideTo(currentIndex, 0); // 0 for no animation
            // Re-setup event listeners for the updated slides
            this.setupSlideEventListeners();
        }
    }

    initializeTranslatedElements() {
        // Initialize all elements with data-lang attributes
        const elementsToTranslate = document.querySelectorAll('[data-lang]');
        elementsToTranslate.forEach(element => {
            const langKey = element.getAttribute('data-lang');
            if (langKey) {
                const translatedText = langManager.getText(langKey);
                element.textContent = translatedText;
            }
        });
    }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reasoningApp = new ReasoningApp();
});
