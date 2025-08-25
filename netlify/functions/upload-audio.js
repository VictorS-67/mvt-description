exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { audioData, filename, participantId, participantName, participantFolderName, videoName, accessToken, parentFolderId} = JSON.parse(event.body);

        if (!audioData || !filename || !participantId || !participantName || !participantFolderName || !videoName || !accessToken || !parentFolderId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Missing required parameters (including accessToken)' })
            };
        }

        // Convert base64 audio data to buffer
        const audioBuffer = Buffer.from(audioData, 'base64');

        // Create folder structure: Audio/{participantId}/
        const folderName = 'Audio';
        const participantFolder = participantFolderName || `${participantId}_${participantName ? participantName.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown'}`;

        // Check if Audio folder exists, create if not
        let audioFolderId;
        const audioFolderSearchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='Audio' and mimeType='application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed=false&fields=files(id,name)`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!audioFolderSearchResponse.ok) {
            throw new Error(`Failed to search for Audio folder: ${audioFolderSearchResponse.status}`);
        }

        const audioFolderData = await audioFolderSearchResponse.json();
        
        if (audioFolderData.files && audioFolderData.files.length > 0) {
            audioFolderId = audioFolderData.files[0].id;
        } else {
            // Create Audio folder
            const createFolderResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: folderName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentFolderId]  // Specify where to create it
                    })
                }
            );

            if (!createFolderResponse.ok) {
                throw new Error(`Failed to create Audio folder: ${createFolderResponse.status}`);
            }

            const newFolder = await createFolderResponse.json();
            audioFolderId = newFolder.id;
        }

        // Check if participant folder exists under Audio folder, create if not
        let participantFolderId;
        const participantFolderSearchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${participantFolder}' and mimeType='application/vnd.google-apps.folder' and '${audioFolderId}' in parents and trashed=false&fields=files(id,name)`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!participantFolderSearchResponse.ok) {
            throw new Error(`Failed to search for participant folder: ${participantFolderSearchResponse.status}`);
        }

        const participantFolderData = await participantFolderSearchResponse.json();

        if (participantFolderData.files && participantFolderData.files.length > 0) {
            participantFolderId = participantFolderData.files[0].id;
        } else {
            // Create participant folder
            const createParticipantFolderResponse = await fetch(
                'https://www.googleapis.com/drive/v3/files',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: participantFolder,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [audioFolderId]
                    })
                }
            );

            if (!createParticipantFolderResponse.ok) {
                throw new Error(`Failed to create participant folder: ${createParticipantFolderResponse.status}`);
            }

            const newParticipantFolder = await createParticipantFolderResponse.json();
            participantFolderId = newParticipantFolder.id;
        }

        // Upload the audio file using multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const metadata = {
            name: filename,
            parents: [participantFolderId]
        };

        // Create multipart body as Buffer to preserve binary data
        const metadataPart = Buffer.from(
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata)
        );

        const dataPart = Buffer.from(
            delimiter +
            'Content-Type: audio/webm\r\n\r\n'
        );

        const closePart = Buffer.from(closeDelimiter);

        // Combine all parts as binary data
        const multipartRequestBody = Buffer.concat([
            metadataPart,
            dataPart,
            audioBuffer,
            closePart
        ]);

        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`Upload failed with status ${uploadResponse.status}:`, errorText);
            throw new Error(`Failed to upload audio file: ${uploadResponse.status} - ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();

        console.log('Audio file uploaded successfully:', {
            fileId: uploadResult.id,
            fileName: uploadResult.name,
            size: audioBuffer.length
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                fileId: uploadResult.id,
                fileName: uploadResult.name,
                webViewLink: uploadResult.webViewLink
            })
        };

    } catch (error) {
        console.error('Error uploading audio to Google Drive:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Failed to upload audio file',
                details: error.message
            })
        };
    }
};
