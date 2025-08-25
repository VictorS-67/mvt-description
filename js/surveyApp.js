// Main application logic for survey.html
class SurveyApp extends BaseApp {
    constructor() {
        // Must call super() first before accessing 'this'
        super();
        
        // Initialize survey-specific properties after calling super()
        this.filteredData = [];
        this.currentVideoName = null;
        this.introExpanded = false; // Track introduction toggle state
        this.completionModalShown = false; // Prevent completion modal from showing multiple times per session
        
        // Initialize audio recording service
        this.initializeAudioService();
    }

    initializeElements() {
        this.elements = {
            nameDisplay: DOMUtils.getElement("nameDisplay"),
            buttonVisibility: DOMUtils.getElement("buttonVisibility"),
            inputVisibility: DOMUtils.getElement("inputVisibility"),
            hasOnomatopoeiaButtonYes: DOMUtils.getElement("hasOnomatopoeiaButtonYes"),
            hasOnomatopoeiaButtonNo: DOMUtils.getElement("hasOnomatopoeiaButtonNo"),
            buttonLogout: DOMUtils.getElement("buttonLogout"),
            videoTitle: DOMUtils.getElement("videoTitle"),
            videoPlayer: DOMUtils.getElement("myVideo"),
            videoButtons: DOMUtils.getElement('videoButtons'),
            getStart: DOMUtils.getElement("getStart"),
            startDisplay: DOMUtils.getElement("startDisplay"),
            getEnd: DOMUtils.getElement("getEnd"),
            endDisplay: DOMUtils.getElement("endDisplay"),
            onomatopoeiaInput: DOMUtils.getElement("onomatopoeiaInput"),
            saveOnomatopoeiaButton: DOMUtils.getElement("saveOnomatopoeia"),
            messageDisplay: DOMUtils.getElement("message"),
            recordOnomatopoeia: DOMUtils.getElement("recordOnomatopoeia"),
            questionText: DOMUtils.getElement("questionText"),
            languageSelect: DOMUtils.getElement("languageSelect"),
            // Introduction toggle elements
            introToggleButton: DOMUtils.getElement("introToggleButton"),
            collapsibleIntro: DOMUtils.getElement("collapsibleIntro"),
            // Introduction content elements (for language updates)
            welcomeTitle: DOMUtils.getElement("welcomeTitle"),
            welcomeIntro: DOMUtils.getElement("welcomeIntro"),
            welcomeDescription: DOMUtils.getElement("welcomeDescription"),
            instructionsTitle: DOMUtils.getElement("instructionsTitle"),
            instructionsList: DOMUtils.getElement("instructionsList"),
            noOnomatopoeia: DOMUtils.getElement("noOnomatopoeia"),
            aboutOnomatopoeia: DOMUtils.getElement("aboutOnomatopoeia"),
            intuitionEmphasis: DOMUtils.getElement("intuitionEmphasis"),
            // Audio elements
            audioRecord: DOMUtils.getElement("audioRecord"),
            audioStop: DOMUtils.getElement("audioStop"),
            audioPlay: DOMUtils.getElement("audioPlay"),
            audioDelete: DOMUtils.getElement("audioDelete"),
            audioStatus: DOMUtils.getElement("audioStatus"),
            audioWaveform: DOMUtils.getElement("audioWaveform"),
            // Reasoning access button
            continueToReasoningButton: DOMUtils.getElement("continueToReasoningButton")
        };
    }

    async initializeSubclass() {
        try {
            // Load and validate participant info using base class method
            if (!this.loadAndValidateParticipantInfo()) {
                return; // Base class handles the redirect
            }
            
            // Load filtered data from localStorage
            this.filteredData = JSON.parse(localStorage.getItem("filteredData")) || [];
            
            // Show video skeleton while loading
            const videoContainer = this.elements.videoPlayer?.parentElement;
            const videoSkeletonId = this.showSkeleton(videoContainer, 'video-player');
            
            // Initialize video manager with callbacks
            this.initializeVideoManager(
                this.onVideoChange.bind(this), // Called when video changes
                this.onVideoLoad.bind(this)    // Called when videos are loaded
            );
            
            // Load videos using video manager with loading state
            await this.withLoading('video-loading', async () => {
                await this.videoManager.loadVideos(this.config);
            }, {
                type: 'skeleton',
                container: this.elements.videoButtons,
                skeletonType: 'video-list'
            });
            
            // Hide video skeleton
            this.hideSkeleton(videoSkeletonId);
            
            // Set up event listeners
            this.setupEventListeners();

            // Update participant name display
            this.updateParticipantDisplay();

            // Initialize introduction content
            this.updateIntroductionContent();

        } catch (error) {
            console.error('Failed to initialize survey app:', error);
            this.showError('Failed to initialize survey');
        }
    }

    getParticipantDisplayKey() {
        return 'survey.participant_name';
    }

    onLanguageChange() {
        super.onLanguageChange(); // Call base class method
        this.updateAudioStatusText();
        this.updateIntroductionContent();
    }

    // Callback for when video changes (called by VideoManager)
    onVideoChange(videoName, videoSrc) {
        // Show loading overlay on video container during video change
        const videoContainer = this.elements.videoPlayer?.parentElement;
        if (videoContainer) {
            this.showOverlay(videoContainer, langManager.getText('survey.loading_video') || 'Loading video...');
        }
        
        this.currentVideoName = videoName;
        
        // Clear any existing messages when changing videos
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }
        
        // Reset audio recording state when changing videos
        audioRecordingService.deleteRecording();
        
        // Reset display for the new video
        this.resetDisplayForCurrentVideo();
        
        // Hide loading overlay after a short delay to allow video to start loading
        setTimeout(() => {
            if (videoContainer) {
                this.hideOverlay(videoContainer);
            }
        }, 500);
    }
    
    // Callback for when videos are loaded (called by VideoManager)
    onVideoLoad() {
        // Set current video name from first video
        if (this.videoManager) {
            const currentVideo = this.videoManager.getCurrentVideo();
            this.currentVideoName = currentVideo.name;
        }
        
        // Reset display for initial video
        this.resetDisplayForCurrentVideo();
    }

    performAdditionalLogoutCleanup() {
        // No additional cleanup needed for survey app
    }

    setupEventListeners() {
        // Set up common event listeners from base class
        this.setupCommonEventListeners();

        // Onomatopoeia flow buttons
        if (this.elements.hasOnomatopoeiaButtonYes) {
            this.elements.hasOnomatopoeiaButtonYes.addEventListener('click', this.showOnomatopoeiaInput.bind(this));
        }

        if (this.elements.hasOnomatopoeiaButtonNo) {
            this.elements.hasOnomatopoeiaButtonNo.addEventListener('click', this.handleNoOnomatopoeia.bind(this));
        }

        // Introduction toggle button
        if (this.elements.introToggleButton) {
            this.elements.introToggleButton.addEventListener('click', this.toggleIntroduction.bind(this));
        }

        // Time capture buttons
        if (this.elements.getStart) {
            this.elements.getStart.addEventListener('click', this.captureStartTime.bind(this));
        }

        if (this.elements.getEnd) {
            this.elements.getEnd.addEventListener('click', this.captureEndTime.bind(this));
        }

        // Save button
        if (this.elements.saveOnomatopoeiaButton) {
            this.elements.saveOnomatopoeiaButton.addEventListener('click', this.handleSaveOnomatopoeia.bind(this));
        }

        // Continue to reasoning button
        if (this.elements.continueToReasoningButton) {
            this.elements.continueToReasoningButton.addEventListener('click', this.goToReasoningPage.bind(this));
        }

        // Audio recording buttons
        this.setupAudioEventListeners();
    }

    // Initialize audio recording service with callbacks
    initializeAudioService() {
        // Set up callbacks for audio state changes
        audioRecordingService.onStateChange = (state, audioState) => {
            this.handleAudioStateChange(state, audioState);
        };
        
        audioRecordingService.onError = (type, message) => {
            this.handleAudioError(type, message);
        };
    }

    setupAudioEventListeners() {
        if (this.elements.audioRecord) {
            this.elements.audioRecord.addEventListener('click', async () => {
                try {
                    this.startButtonLoading(this.elements.audioRecord);
                    await audioRecordingService.startRecording();
                } catch (error) {
                    this.stopButtonLoading(this.elements.audioRecord);
                    this.showError(langManager.getText('survey.audio_start_error') || 'Failed to start recording');
                }
            });
        }
        if (this.elements.audioStop) {
            this.elements.audioStop.addEventListener('click', async () => {
                try {
                    this.startButtonLoading(this.elements.audioStop);
                    await audioRecordingService.stopRecording();
                    this.stopButtonLoading(this.elements.audioStop);
                } catch (error) {
                    this.stopButtonLoading(this.elements.audioStop);
                    this.showError(langManager.getText('survey.audio_stop_error') || 'Failed to stop recording');
                }
            });
        }
        if (this.elements.audioPlay) {
            this.elements.audioPlay.addEventListener('click', () => audioRecordingService.playRecording());
        }
        if (this.elements.audioDelete) {
            this.elements.audioDelete.addEventListener('click', () => audioRecordingService.deleteRecording());
        }
    }

    updateParticipantDisplay() {
        // Call base class method to handle the common display logic
        super.updateParticipantDisplay();

        // Check if all videos are completed and show/hide reasoning button
        this.updateReasoningButtonVisibility();
    }

    updateReasoningButtonVisibility() {
        if (!this.elements.continueToReasoningButton) return;

        const allCompleted = this.checkAllVideosCompleted();
        if (allCompleted) {
            this.elements.continueToReasoningButton.style.display = 'inline-block';
            this.elements.continueToReasoningButton.textContent = langManager.getText('survey.continue_to_reasoning');
        } else {
            this.elements.continueToReasoningButton.style.display = 'none';
        }
    }

    goToReasoningPage() {
        // Store completion state
        localStorage.setItem("surveyCompleted", "true");
        
        // Redirect to reasoning page
        window.location.href = "reasoning.html";
    }

    updateAudioStatusText() {
        const audioState = audioRecordingService.getState();
        if (this.elements.audioStatus && !audioState.hasRecording) {
            this.elements.audioStatus.textContent = langManager.getText('survey.audio_status_ready');
        }
    }

    // Handle audio service state changes
    handleAudioStateChange(state, audioState) {
        switch (state) {
            case 'READY':
                this.updateAudioUIInitial();
                break;
            case 'RECORDING':
                this.updateAudioUIDuringRecording();
                break;
            case 'RECORDED':
                this.updateAudioUIAfterRecording();
                break;
            case 'PLAYING':
                this.updateAudioUIWhilePlaying();
                break;
        }
    }

    // Handle audio service errors
    handleAudioError(type, message) {
        if (!this.elements.audioStatus) return;
        
        switch (type) {
            case 'NOT_SUPPORTED':
                this.elements.audioStatus.textContent = langManager.getText('survey.audio_not_supported');
                break;
            case 'PERMISSION_DENIED':
                this.elements.audioStatus.textContent = langManager.getText('survey.audio_permission_denied');
                break;
            case 'FILE_TOO_LARGE':
                uiManager.showError(this.elements.messageDisplay, langManager.getText('survey.audio_too_large'));
                break;
            case 'GENERIC_ERROR':
            case 'PLAYBACK_ERROR':
            default:
                this.elements.audioStatus.textContent = langManager.getText('survey.audio_recording_error');
                break;
        }
    }

    toggleIntroduction() {
        this.introExpanded = !this.introExpanded;
        
        if (this.introExpanded) {
            // Show introduction
            if (this.elements.collapsibleIntro) {
                this.elements.collapsibleIntro.style.display = 'block';
                // Force reflow for animation
                this.elements.collapsibleIntro.offsetHeight;
                this.elements.collapsibleIntro.classList.add('expanded');
            }
            if (this.elements.introToggleButton) {
                this.elements.introToggleButton.textContent = langManager.getText('survey.hide_introduction');
            }
        } else {
            // Hide introduction
            if (this.elements.collapsibleIntro) {
                this.elements.collapsibleIntro.classList.remove('expanded');
                // Wait for animation to complete before hiding
                setTimeout(() => {
                    if (!this.introExpanded && this.elements.collapsibleIntro) {
                        this.elements.collapsibleIntro.style.display = 'none';
                    }
                }, 200);
            }
            if (this.elements.introToggleButton) {
                this.elements.introToggleButton.textContent = langManager.getText('survey.show_introduction');
            }
        }
        
        // Update introduction content with current language
        this.updateIntroductionContent();
    }

    updateIntroductionContent() {
        // Update all introduction text elements with current language
        if (this.elements.welcomeTitle) {
            this.elements.welcomeTitle.textContent = langManager.getText('welcome.title');
        }
        if (this.elements.welcomeIntro) {
            this.elements.welcomeIntro.textContent = langManager.getText('welcome.introduction');
        }
        if (this.elements.welcomeDescription) {
            this.elements.welcomeDescription.textContent = langManager.getText('welcome.description');
        }
        if (this.elements.instructionsTitle) {
            this.elements.instructionsTitle.textContent = langManager.getText('instructions.title');
        }
        if (this.elements.instructionsList) {
            const instructions = langManager.getText('instructions.steps');
            if (Array.isArray(instructions)) {
                this.elements.instructionsList.innerHTML = instructions.map(item => `<li>${item}</li>`).join('');
            } else {
                // Fallback if instructions is not an array
                this.elements.instructionsList.innerHTML = '<li>Loading instructions...</li>';
            }
        }
        if (this.elements.noOnomatopoeia) {
            this.elements.noOnomatopoeia.textContent = langManager.getText('additional_info.no_onomatopoeia');
        }
        if (this.elements.aboutOnomatopoeia) {
            this.elements.aboutOnomatopoeia.textContent = langManager.getText('additional_info.about_onomatopoeia');
        }
        if (this.elements.intuitionEmphasis) {
            this.elements.intuitionEmphasis.textContent = langManager.getText('additional_info.intuition_emphasis');
        }
        
        // Update button text based on current state
        if (this.elements.introToggleButton) {
            this.elements.introToggleButton.textContent = this.introExpanded ? 
                langManager.getText('survey.hide_introduction') : 
                langManager.getText('survey.show_introduction');
        }
    }

    resetDisplayForCurrentVideo() {
        const docElts = {
            onomatopoeiaInput: this.elements.onomatopoeiaInput,
            startDisplay: this.elements.startDisplay,
            endDisplay: this.elements.endDisplay,
            recordOnomatopoeia: this.elements.recordOnomatopoeia,
            buttonVisibility: this.elements.buttonVisibility,
            inputVisibility: this.elements.inputVisibility,
            questionText: this.elements.questionText
        };
        
        this.resetDisplay(this.currentVideoName, this.filteredData, docElts);
        // Note: audio recording is now reset in onVideoChange to avoid stale state issues
    }

    showOnomatopoeiaInput() {
        // Clear any existing messages when starting to input onomatopoeia
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }
        
        if (this.elements.buttonVisibility) {
            this.elements.buttonVisibility.style.display = "none";
        }
        if (this.elements.inputVisibility) {
            this.elements.inputVisibility.style.display = "block";
        }
        
        // Ensure audio UI is properly reset when showing input
        audioRecordingService.deleteRecording();
    }

    async handleNoOnomatopoeia() {
        // Clear any existing messages when clicking "No"
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }
        
        const currentButton = this.videoManager?.getCurrentActiveButton();
        if (currentButton) {
            try {
                // Check if onomatopoeia has already been saved for this video
                const currentVideoData = this.filteredData.filter(item => item["video"] === this.currentVideoName);
                if (!currentVideoData.length) {
                    const infoDict = {
                        participantId: this.participantInfo.participantId,
                        participantName: this.participantInfo.name || this.participantInfo.email,
                        video: this.currentVideoName,
                        movement: "null",
                        startTime: "null",
                        endTime: "null",
                        answeredTimestamp: obtainDate(),
                        hasAudio: 0
                    };

                    await this.saveOnomatopoeia(
                        this.filteredData, 
                        infoDict, 
                        this.config.spreadsheetId, 
                        this.config.OnomatopoeiaSheet, 
                        this.elements.messageDisplay, 
                        false
                    );
                }

                this.resetDisplayForCurrentVideo();
                this.goToNextVideo(currentButton);
            } catch (error) {
                console.error('Error saving "no" response:', error);
            }
        }
    }

    captureStartTime() {
        if (this.elements.videoPlayer && this.elements.startDisplay) {
            this.elements.startDisplay.textContent = this.elements.videoPlayer.currentTime.toFixed(2);
        }
    }

    captureEndTime() {
        if (this.elements.videoPlayer && this.elements.endDisplay) {
            this.elements.endDisplay.textContent = this.elements.videoPlayer.currentTime.toFixed(2);
        }
    }

    async handleSaveOnomatopoeia() {
        try {
            const audioState = audioRecordingService.getState();
            const infoDict = {
                participantId: this.participantInfo.participantId,
                participantName: this.participantInfo.name || this.participantInfo.email,
                video: this.currentVideoName,
                movement: this.elements.onomatopoeiaInput?.value?.trim() || "",
                startTime: this.elements.startDisplay?.textContent || "-.--",
                endTime: this.elements.endDisplay?.textContent || "-.--",
                answeredTimestamp: obtainDate(),
                hasAudio: audioState.hasRecording ? 1 : 0,
                audioBlob: audioRecordingService.getRecordingBlob()
            };

            // Use submitWithLoading for form submission with loading state
            await this.submitWithLoading(
                this.elements.saveOnomatopoeiaButton,
                async () => {
                    await this.saveOnomatopoeia(
                        this.filteredData,
                        infoDict,
                        this.config.spreadsheetId,
                        this.config.OnomatopoeiaSheet,
                        this.elements.messageDisplay
                    );
                },
                langManager.getText('survey.saving') || 'Saving...'
            );

            this.resetDisplayForCurrentVideo();
            
        } catch (error) {
            console.error('Error saving onomatopoeia:', error);
            this.showError(langManager.getText('survey.save_error') || 'Failed to save response');
        }
    }

    // Audio UI update methods
    updateAudioUIDuringRecording() {
        uiManager.updateVisibility(this.elements, {
            audioRecord: false,
            audioStop: true,
            audioPlay: false,
            audioDelete: false
        });
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = langManager.getText('survey.audio_status_recording');
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'flex';
            this.elements.audioWaveform.classList.add('audio-recording');
        }
    }

    updateAudioUIAfterRecording() {
        // Clear loading states for buttons that will become visible
        if (this.elements.audioPlay) {
            this.stopButtonLoading(this.elements.audioPlay);
        }
        if (this.elements.audioDelete) {
            this.stopButtonLoading(this.elements.audioDelete);
        }
        
        uiManager.updateVisibility(this.elements, {
            audioRecord: false,
            audioStop: false,
            audioPlay: true,
            audioDelete: true
        });
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = langManager.getText('survey.audio_status_recorded');
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'none';
            this.elements.audioWaveform.classList.remove('audio-recording');
        }
    }

    updateAudioUIWhilePlaying() {
        if (this.elements.audioStatus) {
            this.elements.audioStatus.textContent = langManager.getText('survey.audio_status_playing');
        }
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'flex';
            this.elements.audioWaveform.classList.add('audio-playing');
        }
    }

    updateAudioUIInitial() {
        // Clear any loading states on all audio buttons first
        if (this.elements.audioRecord) {
            this.stopButtonLoading(this.elements.audioRecord);
            this.elements.audioRecord.style.setProperty('display', 'block', 'important');
            this.elements.audioRecord.style.setProperty('visibility', 'visible', 'important');
            this.elements.audioRecord.style.setProperty('opacity', '1', 'important');
        }
        if (this.elements.audioStop) {
            this.stopButtonLoading(this.elements.audioStop);
            this.elements.audioStop.style.setProperty('display', 'none', 'important');
        }
        if (this.elements.audioPlay) {
            this.stopButtonLoading(this.elements.audioPlay);
            this.elements.audioPlay.style.setProperty('display', 'none', 'important');
        }
        if (this.elements.audioDelete) {
            this.stopButtonLoading(this.elements.audioDelete);
            this.elements.audioDelete.style.setProperty('display', 'none', 'important');
        }
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = langManager.getText('survey.audio_status_ready');
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'none';
            this.elements.audioWaveform.classList.remove('audio-recording', 'audio-playing');
        }
    }


    // Survey-specific helper methods
    resetDisplay(currentVideoName, filteredData, docElts) {
        // Reset form inputs using uiManager
        uiManager.resetForm(docElts, ['onomatopoeiaInput', 'startDisplay', 'endDisplay']);

        // Reset visibility using uiManager
        uiManager.updateVisibility(docElts, {
            buttonVisibility: true,
            inputVisibility: false
        });

        // Clear messages
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }

        // Note: Audio recording reset is now handled in onVideoChange to prevent timing issues

        let recordMessage = "";

        // Update video button completion states using VideoManager
        if (this.videoManager) {
            this.videoManager.updateButtonCompletionStates(filteredData, {
                determineState: (videoName, data) => {
                    const videoData = data.filter(item => item["video"] === videoName);
                    if (videoData.length > 0) {
                        // Check if there are any actual onomatopoeia (not "null")
                        const hasActualOnomatopoeia = videoData.some(item => item["onomatopoeia"] !== "null");
                        
                        if (hasActualOnomatopoeia) {
                            return 'completed'; // User has saved at least one onomatopoeia - green
                        } else {
                            return 'no-onomatopoeia'; // User said no onomatopoeia in this video - yellow
                        }
                    }
                    return null;
                }
            });
        }

        // Display existing movement data for current video
        const relevantData = filteredData.filter(item => 
            item["video"] === currentVideoName && item["movement"] !== "null"
        );

        if (!relevantData.length) {
            recordMessage = langManager.getText('survey.no_saved_onomatopoeia');
        } else {
            relevantData.forEach(item => {
                const audioIcon = item["hasAudio"] === 1 ? " 🎵" : "";
                recordMessage += `-"${item["movement"]}"${audioIcon} from ${item["startTime"]} to ${item["endTime"]};<br>`;
            });
        }

        if (docElts.recordOnomatopoeia) {
            docElts.recordOnomatopoeia.innerHTML = recordMessage;
        }

        if (docElts.questionText) {
            // Use different text based on whether user has already provided onomatopoeia for this video
            const hasExistingOnomatopoeia = relevantData.length > 0;
            const questionKey = hasExistingOnomatopoeia ? 'survey.question_text_more' : 'survey.question_text';
            docElts.questionText.textContent = langManager.getText(questionKey);
        }

        // Update reasoning button visibility
        this.updateReasoningButtonVisibility();
        
        // Check if all videos are completed after updating button states
        this.checkAndShowCompletionModal();
    }

    async saveOnomatopoeia(filteredData, infoDict, spreadsheetId, OnomatopoeiaSheet, messageDisplay, verbose = true) {
        // Validate input data
        const validation = ValidationUtils.validateOnomatopoeiaData(infoDict);
        if (!validation.isValid) {
            if (verbose) {
                uiManager.showError(messageDisplay, validation.errorMessage);
            }
            throw new Error(validation.errorMessage);
        }

        // Handle audio upload if present
        let audioFileName = null;
        if (infoDict.audioBlob && infoDict.hasAudio === 1) {
            try {
                audioFileName = await uploadAudioFile(
                    infoDict.audioBlob, 
                    infoDict.participantId, 
                    infoDict.participantName,
                    infoDict.video, 
                    infoDict.movement, 
                    infoDict.answeredTimestamp
                );
            } catch (audioError) {
                console.error("Audio upload failed:", audioError);
                if (verbose) {
                    uiManager.showError(messageDisplay, langManager.getText('survey.audio_upload_error'));
                }
            }
        }

        // Prepare onomatopoeia data using the service
        const onomatopoeiaData = {
            participantId: parseInt(infoDict.participantId),
            participantName: infoDict.participantName,
            video: infoDict.video,
            movement: infoDict.movement,
            startTime: parseFloat(infoDict.startTime),
            endTime: parseFloat(infoDict.endTime),
            answeredTimestamp: infoDict.answeredTimestamp,
            hasAudio: infoDict.hasAudio || 0,
            audioFileName: audioFileName || ""
        };

        const appendResult = await googleSheetsService.saveOnomatopoeia(spreadsheetId, OnomatopoeiaSheet, onomatopoeiaData);

        if (!appendResult) {
            if (verbose) {
                uiManager.showError(messageDisplay, langManager.getText('survey.error_saving_sheet'));
            }
            throw new Error("Failed to save to sheet");
        }

        // Update local data
        const updatedInfoDict = {
            ...infoDict,
            hasAudio: infoDict.hasAudio || 0,
            audioFileName: audioFileName
        };
        delete updatedInfoDict.audioBlob;
        filteredData.push(updatedInfoDict);
        
        // Save updated data to localStorage
        localStorage.setItem("filteredData", JSON.stringify(filteredData));

        // Show success message
        if (verbose) {
            const successMessage = (infoDict.hasAudio === 1 && audioFileName) ? 
                langManager.getText('survey.success_saved_with_audio') :
                langManager.getText('survey.success_saved');
            uiManager.showSuccess(messageDisplay, successMessage);
        }
    }

    // Check if all videos are completed and show completion modal if needed
    checkAndShowCompletionModal() {
        if (this.checkAllVideosCompleted()) {
            // Small delay to ensure UI updates are complete
            setTimeout(() => {
                this.showCompletionModal();
            }, 100);
        }
    }

    checkAllVideosCompleted() {
        if (!this.elements.videoButtons) return false;
        
        const allButtons = this.elements.videoButtons.querySelectorAll('.video-button');
        
        // Check if all videos have been addressed (either have onomatopoeia or marked as no-onomatopoeia)
        let allAddressed = true;
        allButtons.forEach(button => {
            const buttonVideo = DOMUtils.safeGetDataset(button, 'video')?.split("/").pop();
            if (buttonVideo) {
                // Check if this video has any data (onomatopoeia or "no" response)
                const hasData = this.filteredData.some(item => item.video === buttonVideo);
                if (!hasData) {
                    allAddressed = false;
                }
            }
        });
        
        return allAddressed && allButtons.length > 0;
    }

    showCompletionModal() {
        // Prevent showing the modal multiple times per session
        if (this.completionModalShown) {
            return;
        }
        
        // Mark modal as shown
        this.completionModalShown = true;
        
        // Use the new modal manager for consistent behavior and animations
        modalManager.showModal('surveyCompletion', {
            onOpen: () => {
                // Set up event listeners when modal opens (text is handled by data-lang attributes)
                const continueButton = document.getElementById('startReasoningButton');
                const stayButton = document.getElementById('stayOnPageButton');
                
                if (continueButton && !continueButton.dataset.listenerAttached) {
                    continueButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.startReasoningPhase();
                    });
                    continueButton.dataset.listenerAttached = 'true';
                }
                
                if (stayButton && !stayButton.dataset.listenerAttached) {
                    stayButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.stayOnSurveyPage();
                    });
                    stayButton.dataset.listenerAttached = 'true';
                }
            }
        });
    }

    startReasoningPhase() {
        // Hide the completion modal first
        modalManager.hideModal('surveyCompletion');
        
        // Store current completion state
        localStorage.setItem("surveyCompleted", "true");
        
        // Redirect to reasoning page
        window.location.href = "reasoning.html";
    }

    stayOnSurveyPage() {
        // Simply hide the completion modal and let user continue on survey page
        modalManager.hideModal('surveyCompletion');
        
        // Store completion state but don't redirect
        localStorage.setItem("surveyCompleted", "true");
    }

    goToNextVideo(currentButton) {
        if (!this.elements.videoButtons) return;
        
        const allButtons = Array.from(this.elements.videoButtons.querySelectorAll('.video-button'));
        const currentIndex = allButtons.indexOf(currentButton);
        
        if (currentIndex < allButtons.length - 1) {
            const nextButton = allButtons[currentIndex + 1];
            DOMUtils.safeClick(nextButton);
        } else {
            // Reached the end - check if all videos are completed
            if (this.checkAllVideosCompleted()) {
                // All videos completed - show completion modal
                this.showCompletionModal();
            } else {
                // Not all videos completed yet - show regular message
                if (this.elements.messageDisplay) {
                    uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('survey.all_videos_complete'));
                }
            }
        }
   }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.surveyApp = new SurveyApp();
});
