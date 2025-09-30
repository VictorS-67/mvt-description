import { BaseApp } from './baseApp.js';
import { DOMUtils } from './utils.js';
import { langManager } from './languageManager.js';
import { uiManager } from './uiManager.js';
import { modalManager } from './modalManager.js';
import { audioRecordingService } from './audioRecordingService.js';
import { BubblePositioner } from './bubblePositioner.js';
import { TutorialStepManager } from './tutorialStepManager.js';

// Tutorial application logic
class TutorialApp extends BaseApp {
    constructor() {
        // Must call super() first before accessing 'this'
        super();
        
        // Initialize tutorial-specific properties after calling super()
        this.tutorialData = []; // Local storage for tutorial data
        this.lastVideoPlayTime = 0;
        this.scrollTimeout = null; // For debouncing scroll-triggered repositioning
        
        // Initialize tutorial step manager
        this.stepManager = new TutorialStepManager(10);
    }

    initializeElements() {
        this.elements = {
            // Main UI elements
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
            
            // Audio elements
            audioRecord: DOMUtils.getElement("audioRecord"),
            audioStop: DOMUtils.getElement("audioStop"),
            audioPlay: DOMUtils.getElement("audioPlay"),
            audioDelete: DOMUtils.getElement("audioDelete"),
            audioStatus: DOMUtils.getElement("audioStatus"),
            audioWaveform: DOMUtils.getElement("audioWaveform"),
            
            // Tutorial elements
            tutorialOverlay: DOMUtils.getElement("tutorialOverlay"),
            tutorialBubble: DOMUtils.getElement("tutorialBubble"),
            bubbleTitle: DOMUtils.getElement("bubbleTitle"),
            bubbleText: DOMUtils.getElement("bubbleText"),
            bubbleInstruction: DOMUtils.getElement("bubbleInstruction"),
            bubbleNext: DOMUtils.getElement("bubbleNext"),
            bubblePrevious: DOMUtils.getElement("bubblePrevious"),
            progressFill: DOMUtils.getElement("progressFill"),
            currentStep: DOMUtils.getElement("currentStep"),
            totalSteps: DOMUtils.getElement("totalSteps"),
            
            // Tutorial welcome
            tutorialWelcome: DOMUtils.getElement("tutorialWelcome"),
            startTutorialButton: DOMUtils.getElement("startTutorialButton"),
            
            // Tutorial completion
            tutorialCompletion: DOMUtils.getElement("tutorialCompletion"),
            startSurveyButton: DOMUtils.getElement("startSurveyButton")
        };
    }

    async initializeSubclass() {
        try {
            // Load and validate participant info using base class method
            if (!this.loadAndValidateParticipantInfo()) {
                return; // Base class handles the redirect
            }
            
            // Initialize video manager for tutorial videos
            this.initializeVideoManager(
                this.onVideoChange.bind(this), // Called when video changes
                null // No special onVideoLoad callback needed for tutorial
            );
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update participant name display
            this.updateParticipantDisplay();
            
            // Initialize tutorial
            this.initializeTutorial();
            
            // Show welcome modal instead of starting tutorial immediately
            this.showWelcomeModal();

        } catch (error) {
            console.error('Failed to initialize tutorial app:', error);
            this.showError('Failed to initialize tutorial');
        }
    }

    getParticipantDisplayKey() {
        return 'tutorial.participant_name';
    }

    // Callback for when video changes (called by VideoManager)
    onVideoChange(videoName, videoSrc) {
        // Reset display when video changes
        this.resetDisplay();
    }

    onLanguageChange() {
        super.onLanguageChange(); // Call base class method
        this.updateCurrentStepContent();
    }

    setupEventListeners() {
        // Set up common event listeners from base class
        this.setupCommonEventListeners();

        // Video interactions for tracking
        if (this.elements.videoPlayer) {
            this.elements.videoPlayer.addEventListener('play', () => {
                this.lastVideoPlayTime = Date.now();
                this.checkStepValidation('video_played');
            });
        }

        // Button interactions
        if (this.elements.hasOnomatopoeiaButtonYes) {
            this.elements.hasOnomatopoeiaButtonYes.addEventListener('click', () => {
                this.checkStepValidation('clicked_yes');
                this.showOnomatopoeiaInput();
            });
        }

        if (this.elements.hasOnomatopoeiaButtonNo) {
            this.elements.hasOnomatopoeiaButtonNo.addEventListener('click', () => {
                this.handleNoOnomatopoeia();
            });
        }

        // Input changes
        if (this.elements.onomatopoeiaInput) {
            this.elements.onomatopoeiaInput.addEventListener('input', (e) => {
                if (e.target.value.trim().length > 0) {
                    this.checkStepValidation('entered_text');
                }
            });
        }

        // Time capture buttons
        if (this.elements.getStart) {
            this.elements.getStart.addEventListener('click', () => {
                this.checkStepValidation('clicked_start_time');
                this.captureStartTime();
            });
        }

        if (this.elements.getEnd) {
            this.elements.getEnd.addEventListener('click', () => {
                this.checkStepValidation('clicked_end_time');
                this.captureEndTime();
            });
        }

        // Save button
        if (this.elements.saveOnomatopoeiaButton) {
            this.elements.saveOnomatopoeiaButton.addEventListener('click', () => {
                this.checkStepValidation('clicked_save');
                this.handleSaveOnomatopoeia();
            });
        }

        // Tutorial navigation
        if (this.elements.bubbleNext) {
            this.elements.bubbleNext.addEventListener('click', () => {
                this.nextStep();
            });
        }

        if (this.elements.bubblePrevious) {
            this.elements.bubblePrevious.addEventListener('click', () => {
                this.previousStep();
            });
        }

        // Tutorial welcome
        if (this.elements.startTutorialButton) {
            this.elements.startTutorialButton.addEventListener('click', () => {
                this.startTutorialFromWelcome();
            });
        }

        // Tutorial completion
        if (this.elements.startSurveyButton) {
            this.elements.startSurveyButton.addEventListener('click', () => {
                this.completeTutorialAndStartSurvey();
            });
        }

        // Audio recording integration
        this.setupAudioRecording();

        // Window resize handler to reposition bubbles
        window.addEventListener('resize', () => {
            const currentStep = this.stepManager.getCurrentStep();
            const totalSteps = this.stepManager.getTotalSteps();
            
            if (currentStep >= 1 && currentStep <= totalSteps) {
                // Delay to allow layout to settle
                setTimeout(() => {
                    BubblePositioner.positionForStep(this.elements.tutorialBubble, currentStep, this.elements);
                }, 100);
            }
        });

        // Scroll handler to reposition bubbles when user scrolls  
        window.addEventListener('scroll', () => {
            const currentStep = this.stepManager.getCurrentStep();
            const totalSteps = this.stepManager.getTotalSteps();
            
            if (currentStep >= 1 && currentStep <= totalSteps) {
                // Use BubblePositioner for element mapping and positioning
                const elementMap = BubblePositioner.getStepElementMapping(this.elements);
                const targetElement = elementMap[currentStep];
                
                if (targetElement && this.elements.tutorialBubble) {
                    // Debounce the repositioning to avoid too many calls
                    clearTimeout(this.scrollTimeout);
                    this.scrollTimeout = setTimeout(() => {
                        BubblePositioner.positionNear(
                            this.elements.tutorialBubble, 
                            targetElement, 
                            BubblePositioner.getStepPositioningPreferences(currentStep),
                            { scrollIntoView: false } // Don't auto-scroll on user scroll
                        );
                    }, 50);
                }
            }
        });
    }

    initializeTutorial() {
        // Set total steps using step manager
        if (this.elements.totalSteps) {
            this.elements.totalSteps.textContent = this.stepManager.getTotalSteps();
        }
        
        // Reset step manager (it initializes its own validation tracking)
        this.stepManager.resetValidation();
        
        // Reset display
        this.resetDisplay();
    }

    showWelcomeModal() {
        // Hide tutorial overlay initially
        if (this.elements.tutorialOverlay) {
            this.elements.tutorialOverlay.classList.add('hidden');
        }
        
        // Use the new modal manager for consistent behavior and animations
        modalManager.showModal('tutorialWelcome', {
            onOpen: () => {
                // Set up the begin tutorial button when modal opens
                const beginButton = document.getElementById('beginTutorialButton');
                if (beginButton && !beginButton.dataset.listenerAttached) {
                    beginButton.addEventListener('click', () => {
                        this.startTutorialFromWelcome();
                    });
                    beginButton.dataset.listenerAttached = 'true';
                }
            }
        });
    }

    startTutorialFromWelcome() {
        // Hide welcome modal using modal manager
        modalManager.hideModal('tutorialWelcome').then(() => {
            // Start the actual tutorial after modal is hidden
            this.startTutorial();
        });
    }

    startTutorial() {
        this.stepManager.goToStep(1);
        this.updateProgress();
        this.showTutorialStep();
    }

    nextStep() {
        // Use step manager to advance with callbacks
        const advanced = this.stepManager.advance(
            (newStep) => {
                // Called when step advances successfully
                this.updateProgress();
                this.showTutorialStep();
            },
            (message) => {
                // Called when required action message should be shown
                if (this.elements.messageDisplay) {
                    uiManager.showError(this.elements.messageDisplay, message);
                }
            }
        );
        
        // If we reached the end, complete tutorial
        if (!advanced && this.stepManager.isComplete()) {
            this.completeTutorial();
        }
    }

    previousStep() {
        this.stepManager.goBack((newStep) => {
            this.updateProgress();
            this.showTutorialStep();            
        });
    }

    canProceedToNextStep() {
        const step = this.currentStep;
        
        // Define required actions for each step
        const requirements = {
            2: () => this.stepValidation.video_played, // Video must be played (no time requirement)
            4: () => this.stepValidation.clicked_yes, // Must click Yes
            5: () => this.stepValidation.entered_text, // Must enter text
            6: () => this.stepValidation.clicked_start_time, // Must click start time
            7: () => this.stepValidation.clicked_end_time, // Must click end time
            9: () => this.stepValidation.clicked_save, // Must click save
            // Steps 1, 3, 8, 10 have no requirements
        };
        
        if (requirements[step]) {
            const canProceed = requirements[step]();
            if (!canProceed) {
                // Show message about required action
                this.showRequiredActionMessage(step);
                return false;
            }
        }
        
        return true;
    }

    showRequiredActionMessage(step) {
        const messages = {
            2: "Please play the video to continue.",
            4: "Please click the 'Yes' button to continue.",
            5: "Please enter some text in the onomatopoeia field to continue.",
            6: "Please click the 'Get Start Time' button to continue.",
            7: "Please click the 'Get End Time' button to continue.",
            9: "Please click the 'Save Onomatopoeia' button to continue.",
            10: "Please click the 'No' button to continue."
        };
        
        if (this.elements.messageDisplay && messages[step]) {
            uiManager.showError(this.elements.messageDisplay, messages[step]);
            setTimeout(() => {
                uiManager.clearMessage(this.elements.messageDisplay);
            }, 3000);
        }
    }

    checkStepValidation(action) {
        // Use step manager to mark action as completed
        this.stepManager.markActionCompleted(
            action,
            (actionName, completed) => {
                // Called when validation changes
                this.updateNextButtonState();
            },
            (stepNumber, actionName) => {
                // Called for auto-advance steps
                this.nextStep();
            }
        );
    }

    updateNextButtonState() {
        if (this.elements.bubbleNext) {
            const canProceed = this.stepManager.canAdvance();
            uiManager.updateButtonState(this.elements.bubbleNext, canProceed);
        }
    }

    updateProgress() {
        const currentStep = this.stepManager.getCurrentStep();
        const totalSteps = this.stepManager.getTotalSteps();
        
        // Update progress bar using UI manager
        if (this.elements.progressFill) {
            uiManager.updateProgress(this.elements.progressFill, currentStep, totalSteps);
        }
        
        if (this.elements.currentStep) {
            this.elements.currentStep.textContent = currentStep;
        }
    }

    showTutorialStep() {
        const currentStep = this.stepManager.getCurrentStep();
        const totalSteps = this.stepManager.getTotalSteps();
        const stepData = this.getTutorialStepData(currentStep);
        
        // Update bubble content
        if (this.elements.bubbleTitle) {
            this.elements.bubbleTitle.textContent = stepData.title;
        }
        
        if (this.elements.bubbleText) {
            this.elements.bubbleText.textContent = stepData.text;
        }
        
        // Update bubble instruction
        if (this.elements.bubbleInstruction) {
            if (stepData.instruction && stepData.instruction.trim()) {
                this.elements.bubbleInstruction.textContent = stepData.instruction;
                this.elements.bubbleInstruction.style.display = 'block';
            } else {
                this.elements.bubbleInstruction.style.display = 'none';
            }
        }
        
        // Show/hide previous button
        if (this.elements.bubblePrevious) {
            this.elements.bubblePrevious.style.display = currentStep > 1 ? 'inline-block' : 'none';
        }
        
        // Update next button text
        if (this.elements.bubbleNext) {
            this.elements.bubbleNext.textContent = currentStep === totalSteps ? 
                langManager.getText('tutorial.complete') : 
                langManager.getText('tutorial.next');
        }
        
        // Mark step as required if needed
        const stepConfig = this.stepManager.getStepConfig();
        if (stepConfig.required) {
            this.elements.tutorialBubble.classList.add('tutorial-required-action');
        } else {
            this.elements.tutorialBubble.classList.remove('tutorial-required-action');
        }
        
        // Position bubble using BubblePositioner
        BubblePositioner.positionForStep(this.elements.tutorialBubble, currentStep, this.elements)
            .then(() => {
                // Highlight element after positioning is complete
                this.highlightElementForStep(currentStep);
            })
            .catch(error => {
                console.warn('Failed to position tutorial bubble:', error);
                // Still try to highlight the element
                this.highlightElementForStep(currentStep);
            });
        
        // Update next button state
        this.updateNextButtonState();
        
        // Show tutorial overlay
        if (this.elements.tutorialOverlay) {
            this.elements.tutorialOverlay.classList.remove('hidden');
        }
    }

    getTutorialStepData(step) {
        const stepKeys = {
            1: { title: 'tutorial.step1_title', text: 'tutorial.step1_text', instruction: 'tutorial.step1_instruction', required: false },
            2: { title: 'tutorial.step2_title', text: 'tutorial.step2_text', instruction: 'tutorial.step2_instruction', required: true },
            3: { title: 'tutorial.step3_title', text: 'tutorial.step3_text', instruction: 'tutorial.step3_instruction', required: false },
            4: { title: 'tutorial.step4_title', text: 'tutorial.step4_text', instruction: 'tutorial.step4_instruction', required: true },
            5: { title: 'tutorial.step5_title', text: 'tutorial.step5_text', instruction: 'tutorial.step5_instruction', required: true },
            6: { title: 'tutorial.step6_title', text: 'tutorial.step6_text', instruction: 'tutorial.step6_instruction', required: true },
            7: { title: 'tutorial.step7_title', text: 'tutorial.step7_text', instruction: 'tutorial.step7_instruction', required: true },
            8: { title: 'tutorial.step8_title', text: 'tutorial.step8_text', instruction: 'tutorial.step8_instruction', required: false },
            9: { title: 'tutorial.step9_title', text: 'tutorial.step9_text', instruction: 'tutorial.step9_instruction', required: true },
            10: { title: 'tutorial.step10_title', text: 'tutorial.step10_text', instruction: 'tutorial.step10_instruction', required: false }
        };
        
        const stepData = stepKeys[step];
        return {
            title: langManager.getText(stepData.title),
            text: langManager.getText(stepData.text),
            instruction: langManager.getText(stepData.instruction),
            required: stepData.required
        };
    }

    highlightElementForStep(step) {
        // Remove previous highlights
        this.clearTutorialHighlights();
        
        // Use BubblePositioner's element mapping for consistency
        const elementMap = BubblePositioner.getStepElementMapping(this.elements);
        const targetElement = elementMap[step];
        
        if (targetElement) {
            targetElement.classList.add('tutorial-highlight');
        }
    }

    updateCurrentStepContent() {
        // Update current step content when language changes
        const currentStep = this.stepManager.getCurrentStep();
        if (currentStep >= 1 && currentStep <= this.stepManager.getTotalSteps()) {
            this.showTutorialStep();
        }
    }

    // Survey functionality (tutorial versions - save locally only)
    showOnomatopoeiaInput() {
        if (this.elements.buttonVisibility) {
            this.elements.buttonVisibility.style.display = "none";
        }
        if (this.elements.inputVisibility) {
            this.elements.inputVisibility.style.display = "block";
        }
    }

    handleNoOnomatopoeia() {
        // In tutorial, just simulate the action locally
        const tutorialData = {
            video: "videos/1.mp4",
            onomatopoeia: "null",
            startTime: "null",
            endTime: "null",
            timestamp: new Date().toISOString(),
            hasAudio: 0
        };
        
        this.tutorialData.push(tutorialData);
        
        // Update video button color to yellow (completed without onomatopoeia)
        // if not already completed
        const activeButton = this.videoManager?.getCurrentActiveButton();
        if (activeButton && !activeButton.classList.contains('completed')) {
            this.updateActiveVideoButtonState('no-onomatopoeia');
        }
        
        // Load the next video automatically
        this.goToNextVideo();
                
        if (this.elements.messageDisplay) {
            uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('tutorial.saved_locally'));
        }
        
        this.resetDisplay();
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

    handleSaveOnomatopoeia() {
        // In tutorial, save locally only
        const tutorialData = {
            video: this.elements.videoPlayer?.src || "videos/1.mp4",
            onomatopoeia: this.elements.onomatopoeiaInput?.value?.trim() || "",
            startTime: this.elements.startDisplay?.textContent || "-.--",
            endTime: this.elements.endDisplay?.textContent || "-.--",
            timestamp: new Date().toISOString(),
            hasAudio: 0
        };
        
        this.tutorialData.push(tutorialData);
        
        // Update video button color to green (completed with onomatopoeia)
        this.updateActiveVideoButtonState('completed');
        
        if (this.elements.messageDisplay) {
            uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('tutorial.saved_locally'));
        }
        
        this.resetDisplay();
    }

    // This method only handles tutorial-specific logic
    handleVideoButtonClick(event) {
        // The VideoManager handles the basic video switching
        // We just need to reset the display for tutorial state
        this.resetDisplay();
    }

    updateActiveVideoButtonState(state) {
        if (!this.videoManager) return;
        
        // Get current video name and set its state
        const currentVideo = this.videoManager.getCurrentVideo();
        if (currentVideo && currentVideo.name) {
            this.videoManager.setButtonState(currentVideo.name, state);
        }
    }

    goToNextVideo() {
        if (!this.elements.videoButtons) return;
        
        const currentButton = this.videoManager?.getCurrentActiveButton();
        if (!currentButton) return;
        
        const allButtons = Array.from(this.elements.videoButtons.querySelectorAll('.video-button'));
        const currentIndex = allButtons.indexOf(currentButton);
        
        if (currentIndex < allButtons.length - 1) {
            const nextButton = allButtons[currentIndex + 1];
            DOMUtils.safeClick(nextButton);
        } else {
            // Reached the end - just show message but don't auto-advance
            if (this.elements.messageDisplay) {
                uiManager.showSuccess(this.elements.messageDisplay, langManager.getText('tutorial.all_videos_complete'));
            }
        }
    }

    resetDisplay() {
        // Reset form inputs using uiManager
        uiManager.resetForm(this.elements, ['onomatopoeiaInput', 'startDisplay', 'endDisplay']);

        // Reset visibility using uiManager
        uiManager.updateVisibility(this.elements, {
            buttonVisibility: true,
            inputVisibility: false
        });

        // Show tutorial data
        if (this.elements.recordOnomatopoeia) {
            const currentVideo = this.elements.videoPlayer?.src?.split('/').pop() || '1.mp4';
            const videoData = this.tutorialData.filter(item => 
                item.video.includes(currentVideo) && item.onomatopoeia !== "null"
            );
            
            if (videoData.length === 0) {
                this.elements.recordOnomatopoeia.innerHTML = langManager.getText('survey.no_saved_onomatopoeia');
            } else {
                let message = "";
                videoData.forEach(item => {
                    message += `- "${item.onomatopoeia}" from ${item.startTime} to ${item.endTime}<br>`;
                });
                this.elements.recordOnomatopoeia.innerHTML = message;
            }
        }

        // Clear messages
        if (this.elements.messageDisplay) {
            uiManager.clearMessage(this.elements.messageDisplay);
        }
    }

    completeTutorial() {
        // Hide tutorial overlay
        if (this.elements.tutorialOverlay) {
            this.elements.tutorialOverlay.classList.add('hidden');
        }
        
        // Remove highlighting
        this.clearTutorialHighlights();
        // Note: Removed tutorial-active class removal as it's no longer added
        
        // Use the new modal manager for consistent behavior and animations
        modalManager.showModal('tutorialCompletion', {
            onOpen: () => {
                // Set up the start survey button when modal opens
                const startSurveyButton = document.getElementById('startSurveyButton');
                if (startSurveyButton && !startSurveyButton.dataset.listenerAttached) {
                    startSurveyButton.addEventListener('click', () => {
                        this.completeTutorialAndStartSurvey();
                    });
                    startSurveyButton.dataset.listenerAttached = 'true';
                }
            }
        });
    }

    completeTutorialAndStartSurvey() {
        // Hide completion modal first
        modalManager.hideModal('tutorialCompletion').then(() => {
            // Clear tutorial data
            this.tutorialData = [];
            
            // Redirect to survey
            window.location.href = "survey.html";
        });
    }
    
    // Cleanup method for tutorial app
    performAdditionalLogoutCleanup() {
        // Clean up UI manager resources
        uiManager.cleanup();
        
        // Clear any scroll timeouts
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = null;
        }
        
        // Remove tutorial highlights
        this.clearTutorialHighlights();
    }

    setupAudioRecording() {
        // Set up audio recording service callbacks
        audioRecordingService.onStateChange = (state, audioState) => {
            this.handleAudioStateChange(state, audioState);
        };

        audioRecordingService.onError = (type, message) => {
            this.handleAudioError(type, message);
        };

        // Set up audio control event listeners with proper error handling
        if (this.elements.audioRecord) {
            this.elements.audioRecord.addEventListener('click', async () => {
                try {
                    this.startButtonLoading(this.elements.audioRecord);
                    await audioRecordingService.startRecording();
                } catch (_error) {
                    this.stopButtonLoading(this.elements.audioRecord);
                    this.showError('Failed to start recording. Please try again.');
                }
            });
        }

        if (this.elements.audioStop) {
            this.elements.audioStop.addEventListener('click', async () => {
                try {
                    this.startButtonLoading(this.elements.audioStop);
                    await audioRecordingService.stopRecording();
                    this.stopButtonLoading(this.elements.audioStop);
                } catch (_error) {
                    this.stopButtonLoading(this.elements.audioStop);
                    this.showError('Failed to stop recording. Please try again.');
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

    // Handle audio service state changes (similar to survey app)
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

    // Handle audio service errors (similar to survey app)
    handleAudioError(type, message) {
        if (!this.elements.audioStatus) return;
        
        switch (type) {
            case 'NOT_SUPPORTED':
                this.elements.audioStatus.textContent = 'Audio recording is not supported in this browser.';
                break;
            case 'PERMISSION_DENIED':
                this.elements.audioStatus.textContent = 'Microphone permission denied. Audio recording is optional.';
                break;
            case 'FILE_TOO_LARGE':
                this.showError('Audio recording exceeds maximum size (10MB). Please record a shorter sample.');
                break;
            case 'GENERIC_ERROR':
            case 'PLAYBACK_ERROR':
            default:
                this.elements.audioStatus.textContent = 'Error during audio recording. Please try again.';
                break;
        }
    }

    // Audio UI update methods (updated to match survey app pattern)
    updateAudioUIInitial() {
        // Clear any loading states on all audio buttons first
        if (this.elements.audioRecord) {
            this.stopButtonLoading(this.elements.audioRecord);
        }
        if (this.elements.audioStop) {
            this.stopButtonLoading(this.elements.audioStop);
        }
        if (this.elements.audioPlay) {
            this.stopButtonLoading(this.elements.audioPlay);
        }
        if (this.elements.audioDelete) {
            this.stopButtonLoading(this.elements.audioDelete);
        }

        uiManager.updateVisibility(this.elements, {
            audioRecord: true,
            audioStop: false,
            audioPlay: false,
            audioDelete: false
        });
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = 'Ready to record';
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'none';
            this.elements.audioWaveform.classList.remove('audio-recording', 'audio-playing');
        }
    }

    updateAudioUIDuringRecording() {
        uiManager.updateVisibility(this.elements, {
            audioRecord: false,
            audioStop: true,
            audioPlay: false,
            audioDelete: false
        });
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = 'Recording...';
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
        
        if (this.elements.audioStatus) this.elements.audioStatus.textContent = 'Audio recorded successfully';
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'none';
            this.elements.audioWaveform.classList.remove('audio-recording');
        }
    }

    updateAudioUIWhilePlaying() {
        if (this.elements.audioStatus) {
            this.elements.audioStatus.textContent = 'Playing...';
        }
        if (this.elements.audioWaveform) {
            this.elements.audioWaveform.style.display = 'flex';
            this.elements.audioWaveform.classList.add('audio-playing');
        }
    }

    clearTutorialHighlights() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }
}

const initTutorialApp = () => new TutorialApp();

export { TutorialApp, initTutorialApp };

// Initialize the tutorial app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initTutorialApp();
});
