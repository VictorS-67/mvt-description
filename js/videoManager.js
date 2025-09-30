import { DOMUtils } from './utils.js';
import { googleSheetsService } from './googleSheetsService.js';
import { uiManager } from './uiManager.js';

// Video Management Service
// Consolidates video loading, switching, and state management across apps

class VideoManager {
    constructor(videoPlayer, videoButtons, videoTitle = null) {
        this.videoPlayer = videoPlayer;
        this.videoButtons = videoButtons;
        this.videoTitle = videoTitle;
        this.currentVideo = null;
        this.currentVideoName = null;
        
        // Callbacks that apps can set for custom behavior
        this.onVideoChange = null; // Called when video changes
        this.onVideoLoad = null;   // Called when videos are loaded
        
        this.setupEventListeners();
    }

    // Unified video loading logic
    async loadVideos(config) {
        try {
            // Load selected videos from Google Sheets
            await this.loadSelectedVideos(config.spreadsheetId, config.videoSheet, this.videoButtons);
            
            // Set up initial video
            this.setupInitialVideo();
            
            // Notify app that videos are loaded
            if (this.onVideoLoad) {
                this.onVideoLoad();
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            throw error;
        }
    }

    // Load selected videos from the Google Sheet
    async loadSelectedVideos(spreadsheetId, sheetName, videoButtonsContainer) {
        try {
            // Use GoogleSheetsService to get video data
            const selectedVideosData = await googleSheetsService.getSheetData(spreadsheetId, sheetName);
            
            if (!selectedVideosData || selectedVideosData.length === 0) {
                throw new Error(`No data found in ${sheetName} sheet`);
            }
            
            // Extract video names (skip header row if present)
            const videoNames = selectedVideosData.slice(1).map(row => row[0]).filter(name => name);
            
            // Sort videos alphabetically and add .mp4 extension
            const videoNamesWithExtension = videoNames
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                .map(name => `${name}.mp4`);

            this.createVideoButtons(videoNamesWithExtension, videoButtonsContainer);
        } catch (error) {
            console.error("Error loading selected videos:", error);
            // Fallback to default videos if sheet reading fails
            console.log("Falling back to default videos");
            this.createVideoButtons(['1.mp4', '2.mp4', '3.mp4'], videoButtonsContainer);
        }
    }

    // Reusable function to create video buttons
    createVideoButtons(videoNames, container) {
        if (!container) {
            console.error('Video button container not found');
            return;
        }
        
        // Clear existing buttons
        container.innerHTML = '';
        
        videoNames.forEach((videoName, index) => {
            const button = document.createElement('button');
            button.className = 'video-button';
            button.dataset.video = `videos/${videoName}`;
            
            // Extract just the video number/name for display
            const displayName = videoName.replace('.mp4', '');
            button.textContent = displayName;
            
            // Mark first button as active by default
            if (index === 0) {
                button.classList.add('active');
            }
            
            container.appendChild(button);
        });
    }

    // Unified initial video setup
    setupInitialVideo() {
        const firstButton = this.videoButtons?.querySelector('button');
        if (firstButton && this.videoPlayer) {
            const initialVideo = DOMUtils.safeGetDataset(firstButton, 'video') || "videos/1.mp4";
            this.setActiveVideo(initialVideo, firstButton);
        }
    }

    // Unified video switching logic
    setActiveVideo(videoSrc, buttonElement = null) {
        if (!videoSrc || !this.videoPlayer) return;

        // Update video player
        this.videoPlayer.src = videoSrc;
        this.videoPlayer.load();
        
        // Update current video tracking
        this.currentVideo = videoSrc;
        this.currentVideoName = videoSrc.split("/").pop();
        
        // Update video title if element exists
        if (this.videoTitle) {
            this.videoTitle.textContent = `Video: ${videoSrc}`;
        }
        
        // Update button states if button element provided
        if (buttonElement) {
            this.updateActiveButtonState(buttonElement);
        }
        
        // Notify app of video change
        if (this.onVideoChange) {
            this.onVideoChange(this.currentVideoName, videoSrc);
        }
    }

    // Unified button state management
    updateActiveButtonState(clickedButton) {
        if (!this.videoButtons) return;
        
        // Remove active class from all buttons
        const allButtons = this.videoButtons.querySelectorAll('.video-button');
        allButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        clickedButton.classList.add('active');
    }

    // Standardized button completion state updates
    updateButtonCompletionStates(completionData, stateMapping = {}) {
        if (!this.videoButtons) return;

        const videoButtons = this.videoButtons.querySelectorAll('.video-button');
        videoButtons.forEach(button => {
            const buttonVideo = DOMUtils.safeGetDataset(button, 'video')?.split("/").pop();
            if (buttonVideo && completionData) {
                // Remove existing completion classes
                button.classList.remove('completed', 'no-onomatopoeia');
                
                // Apply state based on completion data and mapping
                const state = this.determineButtonState(buttonVideo, completionData, stateMapping);
                if (state) {
                    button.classList.add(state);
                }
            }
        });
    }

    // Helper method to determine button state based on data
    determineButtonState(videoName, completionData, stateMapping) {
        // Default implementation - can be overridden by providing stateMapping
        if (stateMapping.determineState) {
            return stateMapping.determineState(videoName, completionData);
        }
        
        // Fallback logic for simple completion tracking
        const hasData = completionData.some && completionData.some(item => 
            item.video === videoName || item["video"] === videoName
        );
        
        return hasData ? 'completed' : null;
    }

    // Get current video information
    getCurrentVideo() {
        return {
            src: this.currentVideo,
            name: this.currentVideoName
        };
    }

    getCurrentActiveButton() {
        return this.videoButtons?.querySelector('.video-button.active');
    }

    // Set up event listeners for video buttons
    setupEventListeners() {
        if (this.videoButtons) {
            this.videoButtons.addEventListener('click', this.handleVideoButtonClick.bind(this));
        }
    }

    // Unified video button click handler
    handleVideoButtonClick(event) {
        if (!event.target.classList.contains('video-button')) return;
        
        const videoSrc = DOMUtils.safeGetDataset(event.target, 'video');
        if (videoSrc) {
            this.setActiveVideo(videoSrc, event.target);
        }
    }

    // Utility method to clear messages (commonly done on video change)
    clearMessages(messageElement) {
        if (messageElement) {
            uiManager.clearMessage(messageElement);
        }
    }

    // Method to update video button with specific state
    setButtonState(videoName, state) {
        if (!this.videoButtons) return;
        
        const videoButtons = this.videoButtons.querySelectorAll('.video-button');
        videoButtons.forEach(button => {
            const buttonVideo = DOMUtils.safeGetDataset(button, 'video')?.split("/").pop();
            if (buttonVideo === videoName) {
                // Remove existing completion classes
                button.classList.remove('completed', 'no-onomatopoeia');
                
                // Add new state
                if (state) {
                    button.classList.add(state);
                }
            }
        });
    }
}

export { VideoManager };
