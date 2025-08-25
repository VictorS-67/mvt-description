// Google API authentication and operations

// Token cache with expiration
let tokenCache = {
    token: null,
    expiry: null
};

// Generic function to get access token (works for both Sheets and Drive)
async function getAccessToken() {
    try {
        // Check if we have a valid cached token
        if (tokenCache.token && tokenCache.expiry && new Date() < tokenCache.expiry) {
            return tokenCache.token;
        }

        const response = await fetch('/.netlify/functions/get-access-token', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}) // Empty body since we just need a token
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.access_token) {
            throw new Error('Invalid response format: missing access_token');
        }
        
        // Cache the token for 50 minutes
        tokenCache.token = data.access_token;
        tokenCache.expiry = new Date(Date.now() + 50 * 60 * 1000);
        
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}


// Function to upload audio file to Google Drive
async function uploadAudioFile(audioBlob, participantId, participantName, videoName, onomatopoeia, timestamp) {
    try {
        // First get an access token (reuse the existing token caching system)
        const accessToken = await getAccessToken();
        const config = await ConfigManager.getSheetConfig();
        
        // Convert blob to base64 more efficiently using FileReader
        const base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1]; // Remove data:audio/webm;base64, prefix
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });

        // Create safe folder name: remove special characters and limit length
        const safeName = participantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
        const participantFolderName = `${participantId}_${safeName}`;
        
        // Generate filename: participant_video_onomatopoeia_timestamp.webm
        const sanitizedOnomatopoeia = onomatopoeia.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${participantId}_${videoName.replace('.mp4', '')}_${sanitizedOnomatopoeia}_${timestamp}.webm`;
        
        const response = await fetch('/.netlify/functions/upload-audio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audioData: base64Audio,
                filename: filename,
                participantId: participantId,
                participantName: participantName,
                participantFolderName: participantFolderName,
                videoName: videoName,
                accessToken: accessToken,
                parentFolderId: config.audioDriveFolderId
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            return result.fileName;
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Error uploading audio:', error);
        throw error;
    }
}
